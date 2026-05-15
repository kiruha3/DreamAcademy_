import { execSync } from "child_process";

const banner = 'import{createRequire}from"module";const require=createRequire(import.meta.url);';

const cmd = [
  "npx esbuild api/boot.ts",
  "--bundle",
  "--platform=node",
  "--target=node20",
  "--format=esm",
  "--outfile=dist/boot.js",
  "--external:mysql2",
  "--external:playwright-core",
  "--external:playwright",
  `--banner:js=${JSON.stringify(banner)}`,
].join(" ");

execSync(cmd, { stdio: "inherit" });
