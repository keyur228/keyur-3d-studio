// Renders a contact sheet of key frames with a single bundle: node scripts/preview-stills.mjs [frame ...]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";

const frames = process.argv.slice(2).map(Number);
const targets = frames.length ? frames : [60, 141, 200, 290, 315, 360, 400, 450, 495, 560, 620];
const root = path.resolve(import.meta.dirname, "..");

const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  webpackOverride: (config) => enableTailwind(config),
});
const composition = await selectComposition({ serveUrl, id: "MysticalVillage", chromiumOptions: { gl: "angle" } });
for (const frame of targets) {
  const output = path.join(root, "out", "stills", `frame-${String(frame).padStart(3, "0")}.jpg`);
  const started = Date.now();
  await renderStill({
    serveUrl,
    composition,
    frame,
    output,
    imageFormat: "jpeg",
    jpegQuality: 85,
    scale: 0.5,
    chromiumOptions: { gl: "angle" },
    timeoutInMilliseconds: 120000,
    onBrowserLog: (log) => {
      if (log.type === "error" || log.type === "warning") console.log(`[browser:${log.type}] ${log.text}`);
    },
  });
  console.log(`frame ${frame} -> ${path.relative(root, output)} (${Date.now() - started} ms)`);
}
