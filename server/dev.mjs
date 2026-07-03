import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

const children = [
  spawn(process.execPath, ["server/index.mjs"], {
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.PORT || "3000" },
  }),
  spawn(npmCommand, ["run", "dev:client"], {
    stdio: "inherit",
    env: { ...process.env },
    shell: isWindows,
  }),
];

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  process.exit(signal === "SIGINT" ? 0 : 1);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) shutdown("SIGTERM");
  });
}
