# Privacy Notes (EU/GDPR)

This repository contains a self-assessment web application. This file documents the **actual data flows implemented in code** and what to disclose/maintain when operating the service in the EU.

This document is not legal advice.

## What Data Is Processed

### Assessment answers (questionnaire)
- Stored in the user’s browser (local storage) to power the dashboard and export features.
- Not sent to the server by default.
- Users can delete this data by using the in-app reset flow or clearing site data in their browser.

Browser storage used by the app may include:
- Assessment progress/results
- UI preferences (e.g., sidebar state)

Network requests from the client:
- The application only sends data to the server when users submit feedback.

### Feedback (optional)
When a user submits feedback from the dashboard, the service processes:
- `score` (0–10)
- `comments` (optional free text)
- `pageUrl` (stored as a minimized path where possible)
- Technical data needed to serve requests (e.g., IP address in transit; used for rate limiting and security, not intended for long-term storage).

Storage:
- If `NEON_DATA_API_URL`/`NEON_DATA_API_KEY` are configured, feedback is stored via Neon Data API.
- Otherwise, feedback is stored locally as `server/data/feedback.jsonl` (not committed to git).

Retention:
- Local feedback storage is pruned to `FEEDBACK_RETENTION_DAYS` (default 180).
- Neon pruning is best-effort and only enabled when `NEON_FEEDBACK_ENABLE_RETENTION=1` and the table has a timestamp column (defaults to `created_at`).

User rights:
- If you want us to erase submitted feedback, contact us and include the approximate time and the text you submitted so we can locate it.

### Analytics / tracking
- The application does not include third-party analytics or advertising tracking by default.

## Operational Checklist (EU)
- Publish a privacy notice that reflects:
  - What data is processed (feedback)
  - Purposes and lawful bases (commonly: **legitimate interests** for feedback)
  - Retention period(s)
  - Processors/sub-processors (hosting, database)
  - International transfer position (EEA hosting or SCCs, as applicable)
  - How users can exercise rights (e.g., contacting you to request deletion)
- Put Data Processing Agreements (DPAs) in place with processors and validate where data is hosted.
- Keep a Record of Processing Activities (RoPA) if required for your org.
