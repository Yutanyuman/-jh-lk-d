import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = new URL(".", import.meta.url);
const distRoot = new URL("./dist/", projectRoot);
const clientRoot = new URL("./dist/client/", projectRoot);
const serverRoot = new URL("./dist/server/", projectRoot);
const distOpenAiRoot = new URL("./dist/.openai/", projectRoot);

await rm(distRoot, { recursive: true, force: true });
await Promise.all([
  mkdir(clientRoot, { recursive: true }),
  mkdir(serverRoot, { recursive: true }),
  mkdir(distOpenAiRoot, { recursive: true }),
]);

await Promise.all([
  cp(new URL("./index.html", projectRoot), new URL("./index.html", clientRoot)),
  cp(new URL("./styles.css", projectRoot), new URL("./styles.css", clientRoot)),
  cp(new URL("./script.js", projectRoot), new URL("./script.js", clientRoot)),
  cp(new URL("./assets/", projectRoot), new URL("./assets/", clientRoot), {
    recursive: true,
  }),
  cp(
    new URL("./.openai/hosting.json", projectRoot),
    new URL("./hosting.json", distOpenAiRoot),
  ),
]);

await writeFile(
  new URL("./index.js", serverRoot),
  `export default {
  async fetch(request, env) {
    if (env.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Static asset binding is unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
`,
);

await writeFile(
  new URL("./vinext-server.json", serverRoot),
  JSON.stringify({ prerenderSecret: "setagaya-can-static-site" }),
);

await writeFile(
  new URL("./wrangler.json", serverRoot),
  JSON.stringify({
    name: "setagaya-can-studio",
    compatibility_date: "2026-05-15",
    compatibility_flags: ["nodejs_compat"],
    main: "index.js",
    no_bundle: true,
    assets: { directory: "../client" },
    observability: { enabled: true },
    rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
  }),
);

await writeFile(
  new URL("./_headers", clientRoot),
  `/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
);

const hosting = JSON.parse(
  await readFile(new URL("./hosting.json", distOpenAiRoot), "utf8"),
);
const files = ["index.html", "styles.css", "script.js", "assets"];

console.log(
  `Built ${files.length} static surfaces for ${hosting.project_id} in ${join("dist", "client")}.`,
);
