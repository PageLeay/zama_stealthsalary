#!/usr/bin/env node
import http from "http";

function check() {
  return new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port: 8545, method: "POST" }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

const ok = await check();
if (!ok) {
  console.error("Hardhat node not running at http://127.0.0.1:8545 (dev:mock 需运行生成)");
  process.exit(1);
}




