import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hosts = ["127.0.0.1", "::1"];
const port = Number.parseInt(process.env.PORT || "4173", 10);
const root = path.dirname(fileURLToPath(import.meta.url));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, { ...noCacheHeaders, ...headers });
  response.end(body);
}

async function handleRequest(request, response) {
  try {
    const requestUrl = new URL(request.url || "/", `http://localhost:${port}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      send(response, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const body = request.method === "HEAD" ? undefined : await readFile(filePath);
    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";

    send(response, 200, body, {
      "Content-Length": String(fileStat.size),
      "Content-Type": contentType,
    });
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    send(response, status, status === 404 ? "Not Found" : "Internal Server Error", {
      "Content-Type": "text/plain; charset=utf-8",
    });
  }
}

for (const host of hosts) {
  createServer(handleRequest).listen(port, host, () => {
    const displayHost = host.includes(":") ? `[${host}]` : host;
    console.log(`No-cache preview: http://${displayHost}:${port}/`);
  });
}
