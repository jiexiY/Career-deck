import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runGameMonitor } from "../src/lib/career-deck/game-monitor-engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const monitorPath = path.join(root, "src", "lib", "career-deck", "game-monitor.json");
const liveDataPath = path.join(root, "src", "lib", "career-deck", "live-data.json");
const shouldCommit = process.argv.includes("--commit");
const checkedAt = new Date().toISOString();

function commitIfRequested() {
  if (!shouldCommit) return;

  const status = execFileSync("git", ["status", "--short", monitorPath, liveDataPath], {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (!status) {
    console.log("No game monitor changes to commit.");
    return;
  }

  execFileSync("git", ["add", monitorPath, liveDataPath], { cwd: root, stdio: "inherit" });
  execFileSync("git", ["commit", "-m", "Update game opportunities monitor"], {
    cwd: root,
    stdio: "inherit",
  });
}

const monitor = JSON.parse(await fs.readFile(monitorPath, "utf8"));
const liveData = JSON.parse(await fs.readFile(liveDataPath, "utf8"));
const result = await runGameMonitor({ monitor, liveData, checkedAt });

await fs.writeFile(monitorPath, `${JSON.stringify(result.monitor, null, 2)}\n`);
await fs.writeFile(liveDataPath, `${JSON.stringify(result.liveData, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      checkedAt,
      monitorOpportunities: result.monitor.opportunities.length,
      publicOpportunities: result.liveData.opportunities.length,
      adapterResults: result.adapterResults,
      newRolesFound: result.monitor.dailyBrief.newRolesFound,
      committed: shouldCommit,
    },
    null,
    2,
  ),
);

commitIfRequested();
