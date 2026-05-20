Team Task Manager
=================

Description
-----------
A full-stack team task management app with JWT authentication, role-based access control, and SQLite storage.

Features
--------
- Signup / Login
- Admin / Member roles
- Project creation and team assignment
- Task creation, assignment, status updates, and overdue tracking
- Dashboard summary of tasks and overdue items

Quick Start
-----------
1. Install dependencies:
   npm install

2. Copy `.env.example` to `.env` and set a secret:
   JWT_SECRET=your_secure_secret_here

3. Start the app locally:
   npm start

4. Open in browser:
   http://localhost:3000

Deployment
----------
- Railway-friendly SQLite app with `PORT` and `JWT_SECRET` support.
- Use `railway.toml` to deploy with Node.js detection.
- For persistence, configure a Railway volume mount for the `data/` folder.

Default seeded admin account
----------------------------
Email: admin@taskmanager.local
Password: Admin123!

Notes
-----
- The first seeded admin account is available immediately after startup.
- Any new registered user can log in as a member and be added to projects by an admin.
- The `data` directory is ignored by git so local state is not committed.

Notes
-----
- Use Railway to deploy by connecting the repo and setting environment variables.
- For production, set a strong `JWT_SECRET` and replace the default admin password.
