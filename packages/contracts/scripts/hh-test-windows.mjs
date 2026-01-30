import { execSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8" });
}

try {
  // npx resolves correctly in workspaces; cmd name differs on Windows
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const output = run(`${npx} hardhat test`);

  // Print normal output
  process.stdout.write(output);

  // If we got here, exit code was 0
  process.exit(0);
} catch (e) {
  const stdout = e?.stdout?.toString?.() ?? "";
  const stderr = e?.stderr?.toString?.() ?? "";
  const combined = (stdout + "\n" + stderr).toLowerCase();

  // Always print what Hardhat printed
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const passed = /\bpassing\b/.test(combined) && !/\bfailing\b/.test(combined);
  const windowsShutdownGlitch =
    combined.includes("assertion failed") ||
    combined.includes("async handle") ||
    combined.includes("uv_loop") ||
    combined.includes("terminate process");

  if (process.platform === "win32" && passed && windowsShutdownGlitch) {
    console.warn("\n[hh-test] Windows shutdown glitch detected. Tests passed; forcing exit 0.\n");
    process.exit(0);
  }

  // Preserve real failures
  process.exit(typeof e?.status === "number" ? e.status : 1);
}
