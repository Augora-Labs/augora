// Deliberate build-time sync; deploy-output.json remains gitignored.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const input = process.argv[2] || resolve(root, "deploy-output.json");
const output = resolve(root, "frontend/contract-config.js");
let deployment;
try {
  deployment = JSON.parse(readFileSync(input, "utf8"));
} catch (error) {
  console.error("Cannot read a valid Testnet deploy-output.json:", error.message);
  process.exit(1);
}
const id = deployment?.contracts?.market;
if (deployment?.network !== "testnet" || typeof id !== "string" || !/^C[A-Z2-7]{55}$/.test(id)) {
  console.error("Expected Testnet deployment with a valid contracts.market Stellar ID.");
  process.exit(1);
}
writeFileSync(output,
  "// Committed Testnet browser contract address; other frontend files import this.\n" +
  'export const MARKET_CONTRACT_ID = "' + id + '";\n');
console.log("Updated frontend/contract-config.js for Testnet deployment", id);
console.log("Update README.md Prediction market row before committing; frontend CI rejects mismatches.");
