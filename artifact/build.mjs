// node artifact/build.mjs → artifact/dist/index.html + app.js
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "artifact/dist");
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(root, "artifact/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  charset: "ascii",
  jsx: "automatic",
  outfile: path.join(out, "app.js"),
  alias: { "@": path.join(root, "src") },
  external: ["@imgly/background-removal"],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_PRESETKA_TARGET": '"artifact"',
  },
  logLevel: "warning",
});

execSync(`npx tailwindcss -c tailwind.config.ts -i app/globals.css -o artifact/dist/app.css --minify`, { cwd: root, stdio: "inherit" });
const css = readFileSync(path.join(out, "app.css"), "utf8");
// odkaz na Google Fonts (stejný seznam jako v aplikaci)
const tmp = path.join(out, "_fonts.mjs");
await build({ entryPoints: [path.join(root, "src/lib/fonts.ts")], bundle: true, format: "esm", outfile: tmp, logLevel: "warning" });
const { googleFontsHref } = await import(tmp + "?t=" + Date.now());
execSync(`rm -f "${tmp}" "${path.join(out, "app.css")}"`);

const html = `<title>Presetka</title>
<meta name="theme-color" content="#0E1218">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${googleFontsHref()}" data-presetka-fonts="1">
<style>${css}</style>
<div id="root"></div>
<script src="app.js" charset="utf-8"></script>
`;
writeFileSync(path.join(out, "index.html"), html);
console.log("artifact/dist hotovo:", Math.round(html.length / 1024), "kB HTML +", Math.round(readFileSync(path.join(out, "app.js")).length / 1024), "kB JS");
