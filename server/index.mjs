import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { apiHandler } from "./agent.mjs";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer((req, res) => {
  apiHandler(req, res, async () => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const path = resolve(
        root,
        `.${pathname === "/" ? "/index.html" : pathname}`,
      );
      if (!path.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const content = await readFile(path);
      res.writeHead(200, {
        "Content-Type": types[extname(path)] || "application/octet-stream",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
});
server.listen(Number(process.env.PORT) || 4173, "127.0.0.1", () =>
  console.log(`Muse is running at http://localhost:${server.address().port}`),
);
