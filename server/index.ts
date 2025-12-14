import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "2mb" }));

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

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
