// SCS pilot — network isolation verification (the governed test for items 1
// and 4 of the access isolation proof).
//
// Probes the running stack, from inside every container and from the host,
// and compares each result with the isolation model in docker-compose.yml:
//   - postgres, seaweedfs and api are on the internal network only: no public
//     address, no public DNS, no service on the host (host.docker.internal);
//     they reach each other;
//   - edge is the one container with a route outside: it reaches the internet
//     and the host. It holds no data and no credentials;
//   - the host reaches the API through the edge, and — only with
//     docker-compose.dev.yml — PostgreSQL and the object store.
// Every probe is a TCP connect or a DNS lookup made with the busybox tools in
// each image (nc, nslookup), or a read of the container's routing table; no
// data is sent anywhere.
//
// The structural check holds on every platform: a container on the internal
// network only has no default route, so nothing outside its subnet — the
// host, another environment, the internet — is reachable from it. Whether the
// edge can reach services on the host depends on the platform (Docker Desktop
// forwards host.docker.internal to the host's loopback; native Linux defines
// no such name and does not expose loopback-bound ports to containers), so
// that result is reported, not required.
//
// Usage (from scs-pilot/, with the stack running):
//   node isolation/verify-network-isolation.mjs base   # docker-compose.yml alone
//   node isolation/verify-network-isolation.mjs dev    # with docker-compose.dev.yml
// Exits 1 if any result differs from what the model requires.

import { execFileSync } from "node:child_process";
import net from "node:net";

const mode = process.argv[2];
if (mode !== "base" && mode !== "dev") {
  console.error("usage: node isolation/verify-network-isolation.mjs base|dev");
  process.exit(2);
}
const API_PORT = Number(process.env.API_PORT ?? 3000);
const POSTGRES_PORT = Number(process.env.POSTGRES_PORT ?? 5432);
const S3_PORT = Number(process.env.S3_PORT ?? 9000);

const PUBLIC_ADDRESS = ["1.1.1.1", 443];
const PUBLIC_NAME = "registry.npmjs.org";
// a port the host listens on: the edge's own published API port
const HOST_SERVICE = ["host.docker.internal", API_PORT];

/** Run a shell command in a container; true if it exited 0. */
function inContainer(container, command) {
  try {
    execFileSync("docker", ["exec", container, "sh", "-c", command], { stdio: "ignore", timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}
const tcp = (container, [host, port]) => inContainer(container, `nc -z -w 4 ${host} ${port}`);
// a default route is a line with destination 00000000 in /proc/net/route
const defaultRoute = (container) => inContainer(container, `awk 'NR > 1 && $2 == "00000000" { found = 1 } END { exit !found }' /proc/net/route`);
const dns = (container, name) => inContainer(container, `nslookup ${name} >/dev/null 2>&1`);

/** A TCP connect from the host. */
function hostTcp(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: "127.0.0.1", port, timeout: 4000 });
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("timeout", () => { s.destroy(); resolve(false); });
    s.on("error", () => resolve(false));
  });
}

const checks = [];
const expect = (subject, probe, required, actual) => checks.push({ subject, probe, required, actual, ok: required === actual });
const report = (subject, probe, actual) => checks.push({ subject, probe, required: "(reported)", actual, ok: true, info: true });
const reach = (b) => (b ? "reachable" : "unreachable");
const route = (b) => (b ? "present" : "none");

for (const c of ["scs-pilot-api-1", "scs-pilot-postgres-1", "scs-pilot-seaweedfs-1"]) {
  expect(c, "default route", "none", route(defaultRoute(c)));
  expect(c, `public address ${PUBLIC_ADDRESS.join(":")}`, "unreachable", reach(tcp(c, PUBLIC_ADDRESS)));
  expect(c, `public DNS (${PUBLIC_NAME})`, "unreachable", reach(dns(c, PUBLIC_NAME)));
  expect(c, `host service ${HOST_SERVICE.join(":")}`, "unreachable", reach(tcp(c, HOST_SERVICE)));
}
expect("scs-pilot-api-1", "postgres:5432 (internal)", "reachable", reach(tcp("scs-pilot-api-1", ["postgres", 5432])));
expect("scs-pilot-api-1", "seaweedfs:8333 (internal)", "reachable", reach(tcp("scs-pilot-api-1", ["seaweedfs", 8333])));
expect("scs-pilot-edge-1", "api:3000 (internal)", "reachable", reach(tcp("scs-pilot-edge-1", ["api", 3000])));
// the edge's outbound path is part of the model, and stated, not hidden
expect("scs-pilot-edge-1", "default route", "present", route(defaultRoute("scs-pilot-edge-1")));
expect("scs-pilot-edge-1", `public address ${PUBLIC_ADDRESS.join(":")}`, "reachable", reach(tcp("scs-pilot-edge-1", PUBLIC_ADDRESS)));
report("scs-pilot-edge-1", `host service ${HOST_SERVICE.join(":")}`, reach(tcp("scs-pilot-edge-1", HOST_SERVICE)));

expect("host", `127.0.0.1:${API_PORT} (API via edge)`, "reachable", reach(await hostTcp(API_PORT)));
const dev = mode === "dev" ? "reachable" : "unreachable";
expect("host", `127.0.0.1:${POSTGRES_PORT} (PostgreSQL via edge)`, dev, reach(await hostTcp(POSTGRES_PORT)));
expect("host", `127.0.0.1:${S3_PORT} (object store via edge)`, dev, reach(await hostTcp(S3_PORT)));

const w = Math.max(...checks.map((c) => c.subject.length));
const p = Math.max(...checks.map((c) => c.probe.length));
console.log(`network isolation verification — mode: ${mode}, ${new Date().toISOString()}`);
console.log(`platform: docker ${execFileSync("docker", ["version", "--format", "{{.Server.Version}} {{.Server.Os}} {{.Server.KernelVersion}}"]).toString().trim()}`);
for (const c of checks) console.log(`${c.info ? "INFO" : c.ok ? "PASS" : "FAIL"}  ${c.subject.padEnd(w)}  ${c.probe.padEnd(p)}  required ${c.required.padEnd(11)}  actual ${c.actual}`);
const required = checks.filter((c) => !c.info);
const failed = required.filter((c) => !c.ok).length;
console.log(failed === 0 ? `all ${required.length} required checks match the isolation model` : `${failed} of ${required.length} required checks do NOT match the isolation model`);
process.exit(failed === 0 ? 0 : 1);
