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

2. Start the app locally:
   npm start

3. Open in browser:
   http://localhost:3000

Deployment
----------
- Railway-friendly SQLite app with `PORT` and `JWT_SECRET` support.
- Ensure `data` folder is writable in the deployment environment.

Default seeded admin account
----------------------------
Email: admin@taskmanager.local
Password: Admin123!

Notes
-----
- Use Railway to deploy by connecting the repo and setting environment variables.
- For production, set a strong `JWT_SECRET` and replace the default admin password.
