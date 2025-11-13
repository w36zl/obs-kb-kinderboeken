import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  outDir: ".",
  platform: "browser",
  format: ["cjs"],
  target: "es2020",
  sourcemap: true,
  dts: true,
  external: ["obsidian"],
  noExternal: ["fast-xml-parser", "yaml"],
  clean: false,
  minify: false,
  outExtension: () => ({ js: ".js" }),
});
