// Shared helpers for the backup, restore and proof scripts. They drive one
// compose environment — a checkout of scs-pilot (its directory, .env and
// static actors file) under a compose project name — through the docker CLI.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/** Parse --name value arguments; repeated names collect into arrays when `multi` lists them. */
export function parseArgs(argv, multi = []) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`unexpected argument ${a}`);
    const name = a.slice(2);
    const next = argv[i + 1];
    const value = next === undefined || next.startsWith("--") ? true : (i++, next);
    if (multi.includes(name)) (out[name] ??= []).push(value);
    else out[name] = value;
  }
  return out;
}

/** KEY=VALUE lines of an env file (comments and blank lines ignored). */
export function readEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

export const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** Every file under dir, as paths relative to it, sorted. */
export function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(dir, p).split("\\").join("/"));
    }
  };
  walk(dir);
  return out.sort();
}

export function git(dir, args) {
  const r = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed in ${dir}: ${r.stderr.trim()}`);
  return r.stdout.trim();
}

export function log(message) {
  console.error(`[${new Date().toISOString()}] ${message}`);
}

/** One compose environment. */
export class Stack {
  /**
   * @param {{ dir: string, project: string, overrides?: Record<string, string> }} o
   *   dir: the scs-pilot directory of a checkout (holds docker-compose.yml and .env);
   *   overrides: environment variables that take precedence over .env (e.g. API_PORT)
   */
  constructor({ dir, project, overrides = {} }) {
    this.dir = resolve(dir);
    this.project = project;
    this.overrides = overrides;
  }

  get envFile() {
    return join(this.dir, ".env");
  }

  get env() {
    return readEnvFile(this.envFile);
  }

  /**
   * Run `docker compose` for this environment.
   * @param {string[]} args
   * @param {{ stdinFile?: string, stdoutFile?: string, input?: string, extraEnv?: Record<string, string>, quiet?: boolean, check?: boolean }} [o]
   * @returns {string} stdout (unless stdoutFile); with check: false, { status, stdout, stderr } instead of throwing
   */
  compose(args, o = {}) {
    const full = ["compose", "-p", this.project, "--project-directory", this.dir, "-f", join(this.dir, "docker-compose.yml"), "--env-file", this.envFile, ...args];
    const env = { ...process.env, ...this.overrides, ...(o.extraEnv ?? {}) };
    let inFd;
    let outFd;
    try {
      if (o.stdinFile !== undefined) inFd = openSync(o.stdinFile, "r");
      if (o.stdoutFile !== undefined) outFd = openSync(o.stdoutFile, "w");
      const r = spawnSync("docker", full, {
        env,
        input: o.input,
        stdio: [inFd ?? (o.input !== undefined ? "pipe" : "ignore"), outFd ?? "pipe", "pipe"],
        maxBuffer: 256 * 1024 * 1024,
      });
      const stderr = r.stderr?.toString() ?? "";
      if (o.check === false) return { status: r.status, stdout: r.stdout?.toString() ?? "", stderr };
      if (r.status !== 0) throw new Error(`docker compose ${args.join(" ")} failed (exit ${r.status}): ${stderr.trim().split("\n").slice(-12).join("\n")}`);
      if (!o.quiet && stderr.trim() !== "" && process.env["SCS_BACKUP_VERBOSE"] === "1") console.error(stderr.trim());
      return outFd === undefined ? r.stdout.toString() : "";
    } finally {
      if (inFd !== undefined) closeSync(inFd);
      if (outFd !== undefined) closeSync(outFd);
    }
  }

  /** Run a command in a one-off container of the api image, on the internal network, without starting dependencies. */
  runApiTool(command, { mounts = [], passEnv = {}, writable = false, check = true } = {}) {
    const args = ["run", "--rm", "--no-deps", "-T"];
    // on Linux, write to a bind-mounted directory as the invoking user
    if (writable && typeof process.getuid === "function") args.push("--user", `${process.getuid()}:${process.getgid()}`);
    for (const m of mounts) args.push("-v", m);
    for (const k of Object.keys(passEnv)) args.push("-e", k);
    args.push("api", ...command);
    return this.compose(args, { extraEnv: passEnv, check });
  }

  /** The owner's database settings, for the integrity check. */
  verifyEnv() {
    const e = this.env;
    return {
      SCS_VERIFY_DB_HOST: "postgres",
      SCS_VERIFY_DB_PORT: "5432",
      SCS_VERIFY_DB_NAME: e.POSTGRES_DB,
      SCS_VERIFY_DB_USER: e.POSTGRES_USER,
      SCS_VERIFY_DB_PASSWORD: e.POSTGRES_PASSWORD,
    };
  }

  /** The compose project's containers and volumes, whatever their state. */
  resources() {
    const label = `label=com.docker.compose.project=${this.project}`;
    const q = (args) => spawnSync("docker", args, { encoding: "utf8" }).stdout.split("\n").filter((l) => l.trim() !== "");
    return { containers: q(["ps", "-a", "-q", "--filter", label]), volumes: q(["volume", "ls", "-q", "--filter", label]) };
  }
}

export function ensureEmptyDir(dir) {
  if (existsSync(dir)) {
    if (!statSync(dir).isDirectory() || readdirSync(dir).length > 0) throw new Error(`${dir} exists and is not an empty directory`);
  } else {
    mkdirSync(dir, { recursive: true });
  }
}
