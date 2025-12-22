import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "runs.jsonl");

export function logRun(record: unknown) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(record) + "\n", "utf8");
}