
team-task-manager — README (submission)
=====================================

Live Application URL:
---------------------
Paste your Railway URL here after deploy: https://

GitHub Repository:
------------------
https://github.com/RizulSharma001/team-task-manager

What this repo contains
------------------------
- Express + SQLite backend (server.js, db.js)
- Vanilla SPA frontend (public/index.html, public/app.js, public/styles.css)
- Deployment helpers: .env.example, railway.toml

Quick Local Run (for demo recording)
----------------------------------
1. Install dependencies (only if not already installed):
   npm install
2. Start the app:
   npm start
3. Open in browser:
   http://localhost:3000

Seeded admin (local)
--------------------
Email: admin@taskmanager.local
Password: Admin123!

Railway deployment notes
------------------------
- Set environment variable `JWT_SECRET` in Railway variables before deploy.
- (Optional) Set `PORT=3000`.
- Add a persistent disk and mount to `/app/data` for SQLite persistence.
- If Railway build fails with native sqlite errors, contact me and I will replace driver with a pure-JS alternative.

2-minute Demo Script (follow when recording)
------------------------------------------
0:00–0:10 — Show project home (`http://localhost:3000`) signed out.
0:10–0:30 — Login as seeded admin (admin@taskmanager.local / Admin123!).
0:30–0:55 — Create a new Project (Projects → New Project → Save).
0:55–1:15 — Create a Task inside the project (title, optional assignee, due date) and save.
1:15–1:35 — Open Dashboard, show task counts and overdue summary.
1:35–2:00 — Mention GitHub repo URL and that the live URL will be provided once Railway finishes deploying.

Files to submit
---------------
- README.txt (this file)
- Link to live app (Railway)
- Link to GitHub repo
- Demo video (2–5 minutes)

Contact / Notes
---------------
If Railway build fails or you need the live URL sooner, run locally and record the demo; I can help debug deployment logs and push a hotfix if necessary.

Good luck — paste the Railway URL when available and I'll run smoke tests.

Notes
-----
- The first seeded admin account is available immediately after startup.
- Any new registered user can log in as a member and be added to projects by an admin.
- The `data` directory is ignored by git so local state is not committed.

Notes
-----
- Use Railway to deploy by connecting the repo and setting environment variables.
- For production, set a strong `JWT_SECRET` and replace the default admin password.
