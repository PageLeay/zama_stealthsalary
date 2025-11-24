#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "..", "fhevm-hardhat-template");
const deploymentsDir = path.join(root, "deployments");
const outDir = path.resolve(process.cwd(), "abi");

fs.mkdirSync(outDir, { recursive: true });

const networks = fs.existsSync(deploymentsDir) ? fs.readdirSync(deploymentsDir) : [];
let addressesMap = {};
let abi = undefined;

// Network name to chainId mapping
const networkChainIds = {
  localhost: "31337",
  hardhat: "31337",
  sepolia: "11155111",
  mainnet: "1",
};

for (const net of networks) {
  const p = path.join(deploymentsDir, net, "StealthSalary.json");
  if (!fs.existsSync(p)) continue;
  const json = JSON.parse(fs.readFileSync(p, "utf-8"));
  const address = json.address || json.addresses?.[0] || json.addresses;
  if (address) {
    // Use chainId from json, or map from network name, or use network name as fallback
    const chainId = json.chainId || networkChainIds[net] || net;
    addressesMap[chainId] = address;
    // Also keep network name as key for backward compatibility
    if (net !== chainId) {
      addressesMap[net] = address;
    }
  }
  abi = json.abi || abi;
}

if (!abi) {
  // Try reading from artifacts if not deployed yet
  const artifacts = path.join(root, "artifacts", "contracts", "StealthSalary.sol", "StealthSalary.json");
  if (fs.existsSync(artifacts)) {
    const json = JSON.parse(fs.readFileSync(artifacts, "utf-8"));
    abi = json.abi;
  }
}

if (!abi) {
  console.warn("ABI not found. Run hardhat compile/deploy first (需运行生成)");
}

const abiTs = `export const ABI = ${JSON.stringify(abi || [])} as const;\nexport const ADDRESSES = ${JSON.stringify(addressesMap)} as const;\n`;
fs.writeFileSync(path.join(outDir, "StealthSalaryABI.ts"), abiTs);
console.log(`ABI generated at ${path.join(outDir, "StealthSalaryABI.ts")}`);




