const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'taskmanager_secret';
const TOKEN_EXPIRY = '12h';
const VALID_STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  const token = auth.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function getProjectById(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function userCanAccessProject(userId, projectId, role) {
  if (role === 'Admin') return true;
  const member = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  const owner = db.prepare('SELECT 1 FROM projects WHERE id = ? AND owner_id = ?').get(projectId, userId);
  return Boolean(member || owner);
}

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered.' });
  const hash = await bcrypt.hash(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email.toLowerCase(), hash);
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  return res.json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = signToken(payload);
  return res.json({ user: payload, token });
});

app.get('/api/users/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/projects', authenticate, (req, res) => {
  const user = req.user;
  if (user.role === 'Admin') {
    const projects = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON u.id = p.owner_id ORDER BY p.created_at DESC').all();
    return res.json({ projects });
  }
  const query = db.prepare(`
    SELECT p.*, u.name as owner_name
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    WHERE p.owner_id = ?
    UNION
    SELECT p.*, u.name as owner_name
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = ?
    ORDER BY created_at DESC
  `);
  const projects = query.all(user.id, user.id);
  return res.json({ projects });
});

app.post('/api/projects', authenticate, requireRole('Admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required.' });
  const info = db.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)').run(name, description || '', req.user.id);
  const project = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ?').get(info.lastInsertRowid);
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(project.id, req.user.id);
  return res.json({ project });
});

app.get('/api/projects/:id', authenticate, (req, res) => {
  const projectId = Number(req.params.id);
  if (!userCanAccessProject(req.user.id, projectId, req.user.role)) return res.status(403).json({ error: 'Access denied' });
  const project = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return res.json({ project });
});

app.put('/api/projects/:id', authenticate, requireRole('Admin'), (req, res) => {
  const projectId = Number(req.params.id);
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required.' });
  const project = getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(name, description || '', projectId);
  const updated = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ?').get(projectId);
  return res.json({ project: updated });
});

app.get('/api/projects/:id/members', authenticate, (req, res) => {
  const projectId = Number(req.params.id);
  if (!userCanAccessProject(req.user.id, projectId, req.user.role)) return res.status(403).json({ error: 'Access denied' });
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role
    FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY u.name
  `).all(projectId);
  return res.json({ members });
});

app.post('/api/projects/:id/members', authenticate, requireRole('Admin'), (req, res) => {
  const projectId = Number(req.params.id);
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Member email is required.' });
  const project = getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found. Have them sign up first.' });
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(projectId, user.id);
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role
    FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY u.name
  `).all(projectId);
  return res.json({ members });
});

app.get('/api/projects/:id/tasks', authenticate, (req, res) => {
  const projectId = Number(req.params.id);
  if (!userCanAccessProject(req.user.id, projectId, req.user.role)) return res.status(403).json({ error: 'Access denied' });
  const tasks = db.prepare(`
    SELECT t.*, u.name as assigned_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.project_id = ?
    ORDER BY t.due_date IS NULL, t.due_date, t.created_at DESC
  `).all(projectId);
  return res.json({ tasks });
});

app.post('/api/projects/:id/tasks', authenticate, (req, res) => {
  const projectId = Number(req.params.id);
  const { title, description, assigned_to, due_date, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required.' });
  if (!userCanAccessProject(req.user.id, projectId, req.user.role)) return res.status(403).json({ error: 'Access denied' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const assigneeId = assigned_to ? Number(assigned_to) : null;
  const taskInfo = db.prepare(`
    INSERT INTO tasks (project_id, title, description, assigned_to, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projectId, title, description || '', assigneeId, status || 'To Do', due_date || null);
  const task = db.prepare(`
    SELECT t.*, u.name as assigned_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.id = ?
  `).get(taskInfo.lastInsertRowid);
  return res.json({ task });
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const taskId = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!userCanAccessProject(req.user.id, task.project_id, req.user.role)) return res.status(403).json({ error: 'Access denied' });
  const { title, description, assigned_to, due_date, status } = req.body;
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const assigneeId = assigned_to ? Number(assigned_to) : null;
  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, assigned_to = ?, due_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title || task.title, description ?? task.description, assigneeId, due_date || task.due_date, status || task.status, taskId);
  const updated = db.prepare(`
    SELECT t.*, u.name as assigned_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.id = ?
  `).get(taskId);
  return res.json({ task: updated });
});

app.get('/api/dashboard', authenticate, (req, res) => {
  const user = req.user;
  const projectIds = user.role === 'Admin'
    ? db.prepare('SELECT id FROM projects').all().map(r => r.id)
    : db.prepare(`
        SELECT p.id
        FROM projects p
        LEFT JOIN project_members pm ON pm.project_id = p.id
        WHERE p.owner_id = ? OR pm.user_id = ?
      `).all(user.id, user.id).map(r => r.id);
  const placeholders = projectIds.length ? projectIds.map(() => '?').join(',') : 'NULL';
  const counts = db.prepare(`
    SELECT status, COUNT(*) as total
    FROM tasks
    WHERE project_id IN (${placeholders})
    GROUP BY status
  `).all(...projectIds);
  const overdue = db.prepare(`
    SELECT COUNT(*) AS total
    FROM tasks
    WHERE project_id IN (${placeholders}) AND due_date IS NOT NULL AND date(due_date) < date('now') AND status <> 'Done'
  `).get(...projectIds);
  const assigned = db.prepare(`
    SELECT t.id, t.title, t.status, t.due_date, p.name as project_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.assigned_to = ?
    ORDER BY t.due_date IS NULL, t.due_date
    LIMIT 10
  `).all(user.id);
  return res.json({ counts, overdue: overdue.total, assigned });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
