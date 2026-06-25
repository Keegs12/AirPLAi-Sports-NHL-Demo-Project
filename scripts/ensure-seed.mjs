// Regenerates the seed only if data files are missing, so `npm run dev` always
// has data on a clean checkout without overwriting an existing live ingest.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const shots = join(root, "data", "shots.json");
const enrichedGame = join(root, "data", "games", "scf-2026-game3.enriched.json");
if (!existsSync(shots)) {
  console.log("[ensure-seed] no season data found, generating seed...");
  execSync("node scripts/generate-seed.mjs", { stdio: "inherit", cwd: root });
}
if (!existsSync(enrichedGame)) {
  console.log("[ensure-seed] no enriched game found, building it...");
  execSync("node scripts/build-game.mjs", { stdio: "inherit", cwd: root });
}
