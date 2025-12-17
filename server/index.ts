import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { randomUUID } from "crypto";
import { appendFeedback, createFeedbackRecord } from "./feedbackStore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function saveFeedbackToNeon({
  neonApiUrl,
  neonApiKey,
  neonSchema,
  score,
  comments,
  sessionId,
  userId,
  pageUrl
}: {
  neonApiUrl: string;
  neonApiKey: string;
  neonSchema: string;
  score: number;
  comments: string;
  sessionId: string | null;
  userId?: string | null;
  pageUrl: string;
}) {
  const endpoint = `${neonApiUrl.replace(/\/$/, "")}/nps_feedback`;
  const payload = {
    session_id: sessionId,
    user_id: userId ?? null,
    nps_score: score,
    feedback_text: comments || null,
    page_url: pageUrl
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": neonApiKey,
      "Authorization": `Bearer ${neonApiKey}`,
      "Prefer": "return=minimal",
      "Accept-Profile": neonSchema,
      "Content-Profile": neonSchema
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Neon Data API responded with ${response.status}: ${errorText}`);
  }
}

let hasLoggedNeonRetentionWarning = false;
async function pruneOldFeedbackFromNeon({
  neonApiUrl,
  neonApiKey,
  neonSchema,
  retentionDays
}: {
  neonApiUrl: string;
  neonApiKey: string;
  neonSchema: string;
  retentionDays: number;
}) {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const retentionColumn = (process.env.NEON_FEEDBACK_CREATED_AT_COLUMN || "created_at").trim();
  if (!retentionColumn) return;
  const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const endpoint = `${neonApiUrl.replace(/\/$/, "")}/nps_feedback?${encodeURIComponent(retentionColumn)}=lt.${encodeURIComponent(cutoffIso)}`;
  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "apikey": neonApiKey,
        "Authorization": `Bearer ${neonApiKey}`,
        "Accept-Profile": neonSchema,
        "Content-Profile": neonSchema
      }
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      if (!hasLoggedNeonRetentionWarning) {
        hasLoggedNeonRetentionWarning = true;
        console.warn("Neon feedback retention pruning failed; disable NEON_FEEDBACK_ENABLE_RETENTION or fix schema.", {
          status: response.status,
          errorText: errorText || null
        });
      }
    }
  } catch (error) {
    if (!hasLoggedNeonRetentionWarning) {
      hasLoggedNeonRetentionWarning = true;
      console.warn("Neon feedback retention pruning failed; disable NEON_FEEDBACK_ENABLE_RETENTION or fix schema.", error);
    }
  }
}

function normalizePageUrl(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  const trimmed = raw.trim();
  if (!trimmed) return "unknown";
  try {
    const url = new URL(trimmed);
    return url.pathname || "/";
  } catch {
    try {
      const url = new URL(trimmed, "https://example.invalid");
      return url.pathname || "/";
    } catch {
      const withoutHash = trimmed.split("#")[0] ?? trimmed;
      const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
      const safe = withoutQuery.trim();
      return safe && safe.length <= 512 ? safe : "unknown";
    }
  }
}

function createIpRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
    const now = Date.now();
    const ip = req.ip || "unknown";
    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    return next();
  };
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  if (process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  app.use(express.json({ limit: "2mb" }));

  const neonApiUrl = process.env.NEON_DATA_API_URL;
  const neonApiKey = process.env.NEON_DATA_API_KEY;
  const neonSchema = process.env.NEON_DATA_API_SCHEMA || "app";
  const enableNeonFeedbackRetention = process.env.NEON_FEEDBACK_ENABLE_RETENTION === "1";
  const feedbackRetentionDaysRaw = Number.parseInt(process.env.FEEDBACK_RETENTION_DAYS || "180", 10);
  const feedbackRetentionDays = Number.isFinite(feedbackRetentionDaysRaw) ? feedbackRetentionDaysRaw : 180;

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  const feedbackLimiter = createIpRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });

  async function handleFeedbackSubmit(req: express.Request, res: express.Response) {
    const body = (req.body || {}) as Record<string, unknown>;
    const scoreInput = body.score ?? body.npsScore;
    const commentsInput = body.comments ?? body.feedbackText;
    const userIdInput = body.userId;
    const pageUrlInput = body.pageUrl ?? req.get("referer");

    const numericScore = Number(scoreInput);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10) {
      return res.status(400).json({ error: "Score must be a number between 0 and 10" });
    }

    const safeComments = typeof commentsInput === "string" ? commentsInput.trim() : "";
    if (safeComments.length > 2000) {
      return res.status(400).json({ error: "Comments must be 2000 characters or less" });
    }

    const normalizedUserId =
      typeof userIdInput === "string" && userIdInput.trim().length > 0 ? userIdInput.trim() : null;
    const normalizedPageUrl = normalizePageUrl(pageUrlInput);
    const recordId = randomUUID();

    try {
      if (neonApiUrl && neonApiKey) {
        await saveFeedbackToNeon({
          neonApiUrl,
          neonApiKey,
          neonSchema,
          score: numericScore,
          comments: safeComments,
          sessionId: recordId,
          userId: normalizedUserId,
          pageUrl: normalizedPageUrl
        });
        if (enableNeonFeedbackRetention) {
          await pruneOldFeedbackFromNeon({
            neonApiUrl,
            neonApiKey,
            neonSchema,
            retentionDays: feedbackRetentionDays
          });
        }
      } else {
        const record = createFeedbackRecord({
          id: recordId,
          score: numericScore,
          comments: safeComments,
          pageUrl: normalizedPageUrl === "unknown" ? null : normalizedPageUrl
        });
        await appendFeedback(record, feedbackRetentionDays);
      }

      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Failed to store feedback", error);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  }

  app.post(["/api/feedback", "/api/nps-feedback", "/nps-feedback"], feedbackLimiter, handleFeedbackSubmit);

  app.post("/api/export/pdf", async (req, res) => {
    const { responses, completedAt } = req.body || {};
    if (!Array.isArray(responses)) {
      return res.status(400).json({ error: "responses array is required" });
    }

    const port = process.env.PORT || 3000;
    const dashboardUrl =
      process.env.DASHBOARD_PDF_URL || `http://localhost:${port}/dashboard?renderMode=pdf`;

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({
        viewport: { width: 1280, height: 1800 }
      });

      await page.addInitScript((data) => {
        try {
          localStorage.setItem(
            "assessment_results",
            JSON.stringify({
              responses: data.responses,
              completedAt: data.completedAt || new Date().toISOString()
            })
          );
        } catch (err) {
          console.error("Failed to seed localStorage for PDF export", err);
        }
      }, { responses, completedAt });

      await page.goto(dashboardUrl, { waitUntil: "networkidle" });
      await page.waitForFunction(() => (window as any).__pdf_ready__ === true, { timeout: 20000 });
      await page.emulateMedia({ media: "screen" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=\"ai-readiness-dashboard.pdf\"");
      res.send(pdfBuffer);
    } catch (err) {
      console.error("Server PDF export failed:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
