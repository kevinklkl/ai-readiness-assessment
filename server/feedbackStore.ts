import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.resolve(__dirname, "data");
const feedbackFile = path.join(dataDirectory, "feedback.jsonl");

export interface FeedbackRecord {
  id: string;
  score: number;
  comments: string;
  pageUrl: string | null;
  createdAt: string;
}

function isRecord(value: unknown): value is FeedbackRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.score === "number" &&
    typeof record.comments === "string" &&
    typeof record.createdAt === "string" &&
    (record.pageUrl === null || typeof record.pageUrl === "string")
  );
}

async function readAllFeedback(): Promise<FeedbackRecord[]> {
  try {
    const content = await fs.promises.readFile(feedbackFile, { encoding: "utf8" });
    const lines = content.split("\n").filter(Boolean);
    const records: FeedbackRecord[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (isRecord(parsed)) records.push(parsed);
      } catch {
        // ignore malformed line
      }
    }
    return records;
  } catch (error: any) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeAllFeedback(records: FeedbackRecord[]) {
  await fs.promises.mkdir(dataDirectory, { recursive: true });
  const tmpFile = `${feedbackFile}.${randomUUID()}.tmp`;
  const content = records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
  await fs.promises.writeFile(tmpFile, content, { encoding: "utf8" });
  await fs.promises.rename(tmpFile, feedbackFile);
}

function applyRetention(records: FeedbackRecord[], retentionDays: number | null): FeedbackRecord[] {
  if (!retentionDays || !Number.isFinite(retentionDays) || retentionDays <= 0) return records;
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return records.filter((record) => {
    const ts = Date.parse(record.createdAt);
    return Number.isFinite(ts) ? ts >= cutoffMs : true;
  });
}

export async function appendFeedback(record: FeedbackRecord, retentionDays: number | null = null) {
  await fs.promises.mkdir(dataDirectory, { recursive: true });
  const existing = await readAllFeedback();
  const retained = applyRetention(existing, retentionDays);
  retained.push(record);
  await writeAllFeedback(retained);
}

export function createFeedbackRecord({
  id,
  score,
  comments,
  pageUrl
}: {
  id?: string;
  score: number;
  comments: string;
  pageUrl: string | null;
}): FeedbackRecord {
  return {
    id: id ?? randomUUID(),
    score,
    comments,
    pageUrl,
    createdAt: new Date().toISOString(),
  };
}
