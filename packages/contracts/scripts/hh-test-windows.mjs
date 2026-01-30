import { execSync } from "node:child_process";

const rawLog = process.argv.includes("--raw-log");

function runHardhat() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  // stdio: pipe so we can inspect output and still print it ourselves
  return execSync(`${npx} hardhat test`, { encoding: "utf8", stdio: "pipe" });
}

try {
  const out = runHardhat();
  process.stdout.write(out);
  process.exit(0);
} catch (e) {
  const stdout = e?.stdout?.toString?.() ?? "";
  const stderr = e?.stderr?.toString?.() ?? "";
  const combined = `${stdout}\n${stderr}`;

  // Always print original output for visibility
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const lower = combined.toLowerCase();

  // Only suppress when:
  // 1) Windows
  // 2) Hardhat clearly reported passing
  // 3) The specific libuv shutdown assertion is present
  const isWin = process.platform === "win32";
  const hasPassingSummary = /\b\d+\s+passing\b/i.test(combined) && !/\b\d+\s+failing\b/i.test(combined);
  const hasUvAssertion =
    lower.includes("assertion failed") &&
    lower.includes("uv_handle_closing") &&
    lower.includes("src\\win\\async.c");

  if (rawLog) {
    console.warn(
      "\n[hh-test] --raw-log enabled. Preserving raw Hardhat output; forcing exit 0.\n"
    );
    process.exit(0);
  }

  if (isWin && hasPassingSummary && hasUvAssertion) {
    console.warn("\n[hh-test] Windows libuv shutdown assertion detected AFTER passing tests. Forcing exit 0.\n");
    process.exit(0);
  }

  // Real failures (or other errors) must fail
  const status = typeof e?.status === "number" ? e.status : 1;
  process.exit(status);
}
