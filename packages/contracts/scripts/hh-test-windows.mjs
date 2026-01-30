import { execSync } from "node:child_process";

const isWin = process.platform === "win32";

let exitCode = 0;
let output = "";

try {
  output = execSync("npx hardhat test", {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  });
  console.log(output);
} catch (error) {
  exitCode = error.status ?? 1;
  output = (error.stdout ?? "") + "\n" + (error.stderr ?? "");
  console.log(error.stdout ?? "");
  console.error(error.stderr ?? "");
}

const combined = output.toLowerCase();

// Hardhat prints a summary like "19 passing"
const passed = /\bpassing\b/.test(combined) && !/\bfailing\b/.test(combined);

// This is the noisy Windows shutdown symptom
const windowsShutdownGlitch =
  combined.includes("assertion failed") ||
  combined.includes("async handle") ||
  combined.includes("uv_loop") ||
  combined.includes("terminate process");

if (isWin && exitCode !== 0 && passed && windowsShutdownGlitch) {
  console.warn("\n[hh-test] Windows Hardhat shutdown glitch detected. Tests passed; forcing exit 0.\n");
  process.exit(0);
}

process.exit(exitCode);
