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
  sessionId: string | null;
  score: number;
  comments: string;
  createdAt: string;
  userAgent: string | null;
}

export async function appendFeedback(record: FeedbackRecord) {
  await fs.promises.mkdir(dataDirectory, { recursive: true });
  const line = JSON.stringify(record) + "\n";
  await fs.promises.appendFile(feedbackFile, line, { encoding: "utf8" });
}

export function createFeedbackRecord({
  sessionId,
  score,
  comments,
  userAgent
}: {
  sessionId: string | null;
  score: number;
  comments: string;
  userAgent: string | null;
}): FeedbackRecord {
  return {
    id: randomUUID(),
    sessionId,
    score,
    comments,
    createdAt: new Date().toISOString(),
    userAgent
  };
}
