import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const preferredApiPort = Number(process.env.PORT || process.env.API_PORT || 3000);

function canUsePort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      });

    tester.listen(port, "::");
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await canUsePort(port)) return port;
  }
  throw new Error(`No available API port found from ${startPort} to ${startPort + 49}`);
}

const apiPort = await findAvailablePort(preferredApiPort);

if (apiPort !== preferredApiPort) {
  console.log(`[dev] API port ${preferredApiPort} is busy, using ${apiPort} instead.`);
}

const devEnv = {
  ...process.env,
  PORT: String(apiPort),
  API_PORT: String(apiPort),
};

const children = [
  spawn(process.execPath, ["server/index.mjs"], {
    stdio: "inherit",
    env: devEnv,
  }),
  spawn(npmCommand, ["run", "dev:client"], {
    stdio: "inherit",
    env: devEnv,
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
