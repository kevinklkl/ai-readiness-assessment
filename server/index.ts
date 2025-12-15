import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
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

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "2mb" }));

  const neonApiUrl = process.env.NEON_DATA_API_URL;
  const neonApiKey = process.env.NEON_DATA_API_KEY;
  const neonSchema = process.env.NEON_DATA_API_SCHEMA || "app";

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.post("/api/feedback", async (req, res) => {
    const { score, comments, sessionId, userId, pageUrl } = req.body || {};
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10) {
      return res.status(400).json({ error: "Score must be a number between 0 and 10" });
    }

    const safeComments = typeof comments === "string" ? comments.trim() : "";
    const normalizedSessionId = typeof sessionId === "string" && sessionId.trim().length > 0
      ? sessionId.trim()
      : null;
    const normalizedUserId = typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : null;
    const normalizedPageUrl = typeof pageUrl === "string" && pageUrl.trim().length > 0
      ? pageUrl.trim()
      : req.get("referer") || "unknown";

    if (!normalizedSessionId && !normalizedUserId) {
      return res.status(400).json({ error: "sessionId or userId is required" });
    }

    try {
      if (neonApiUrl && neonApiKey) {
        await saveFeedbackToNeon({
          neonApiUrl,
          neonApiKey,
          neonSchema,
          score: numericScore,
          comments: safeComments,
          sessionId: normalizedSessionId,
          userId: normalizedUserId,
          pageUrl: normalizedPageUrl
        });
      } else {
        const record = createFeedbackRecord({
          sessionId: normalizedSessionId,
          score: numericScore,
          comments: safeComments,
          userAgent: req.get("user-agent") ?? null
        });
        await appendFeedback(record);
      }

      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Failed to store feedback", error);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  });

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
