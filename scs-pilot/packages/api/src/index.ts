// SCS pilot API — scaffold.
//
// Exposes GET /health only. No capability is implemented and no request is
// routed to any capability. The database and object storage are not
// contacted: /health reports that the process is up, nothing more.

import { createServer } from "node:http";

const port = Number(process.env.API_PORT ?? 3000);

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "scs-pilot-api",
        capabilitiesImplemented: [],
      }),
    );
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "NOT_FOUND" }));
});

server.listen(port, () => {
  console.log(`scs-pilot-api listening on :${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
