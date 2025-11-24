#!/usr/bin/env node
import fs from "fs";
import path from "path";

// Simple static checks: ensure next.config has export + no pages/api directory
const cfgPath = path.resolve(process.cwd(), "next.config.ts");
const cfg = fs.readFileSync(cfgPath, "utf-8");
if (!cfg.includes("output: \"export\"")) {
  console.error("next.config.ts missing output:'export'");
  process.exit(1);
}

const apiDir = path.resolve(process.cwd(), "pages", "api");
if (fs.existsSync(apiDir)) {
  console.error("API routes detected (not allowed for static export)");
  process.exit(1);
}

console.log("Static export checks passed");




