const state = {
  token: localStorage.getItem('tm_token') || null,
  user: null,
  selectedProject: null,
  projects: [],
};

const elements = {
  authSection: document.getElementById('authSection'),
  dashboardSection: document.getElementById('dashboardSection'),
  projectsSection: document.getElementById('projectsSection'),
  accountSection: document.getElementById('accountSection'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  switchToSignup: document.getElementById('switchToSignup'),
  switchToLogin: document.getElementById('switchToLogin'),
  authError: document.getElementById('authError'),
  logoutBtn: document.getElementById('logoutBtn'),
  navDashboard: document.getElementById('nav-dashboard'),
  navProjects: document.getElementById('nav-projects'),
  navAccount: document.getElementById('nav-account'),
  statusSummary: document.getElementById('statusSummary'),
  overdueCount: document.getElementById('overdueCount'),
  assignedTasks: document.getElementById('assignedTasks'),
  projectList: document.getElementById('projectList'),
  projectDetailCard: document.getElementById('projectDetailCard'),
  projectTitle: document.getElementById('projectTitle'),
  projectDescription: document.getElementById('projectDescription'),
  projectOwner: document.getElementById('projectOwner'),
  projectMeta: document.getElementById('projectMeta'),
  tasksContainer: document.getElementById('tasksContainer'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  newTaskBtn: document.getElementById('newTaskBtn'),
  manageMembersBtn: document.getElementById('manageMembersBtn'),
  accountName: document.getElementById('accountName'),
  accountEmail: document.getElementById('accountEmail'),
  accountRole: document.getElementById('accountRole'),
  modal: document.getElementById('modal'),
  modalBody: document.getElementById('modalBody'),
  closeModal: document.getElementById('closeModal'),
};

function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  return fetch(path, { ...options, headers }).then(async (res) => {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  });
}

function showSection(section) {
  [elements.authSection, elements.dashboardSection, elements.projectsSection, elements.accountSection].forEach(el => el.classList.add('hidden'));
  section.classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
}

function showAuthError(message) {
  elements.authError.textContent = message;
  elements.authError.classList.remove('hidden');
}

function hideAuthError() {
  elements.authError.classList.add('hidden');
}

function setToken(token) {
  state.token = token;
  if (token) localStorage.setItem('tm_token', token);
  else localStorage.removeItem('tm_token');
}

function openModal(html) {
  elements.modalBody.innerHTML = html;
  elements.modal.classList.remove('hidden');
}

function closeModal() {
  elements.modal.classList.add('hidden');
  elements.modalBody.innerHTML = '';
}

function renderNav() {
  if (!state.user) {
    elements.logoutBtn.classList.add('hidden');
    elements.navDashboard.classList.add('hidden');
    elements.navProjects.classList.add('hidden');
    elements.navAccount.classList.add('hidden');
  } else {
    elements.logoutBtn.classList.remove('hidden');
    elements.navDashboard.classList.remove('hidden');
    elements.navProjects.classList.remove('hidden');
    elements.navAccount.classList.remove('hidden');
  }
}

function renderAccount() {
  if (!state.user) return;
  elements.accountName.textContent = state.user.name;
  elements.accountEmail.textContent = state.user.email;
  elements.accountRole.textContent = state.user.role;
}

function renderDashboard(data) {
  elements.statusSummary.innerHTML = '';
  data.counts.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.status}</strong>: ${item.total}`;
    elements.statusSummary.appendChild(li);
  });
  elements.overdueCount.textContent = data.overdue;
  elements.assignedTasks.innerHTML = '';
  if (!data.assigned.length) {
    elements.assignedTasks.innerHTML = '<li>No tasks assigned.</li>';
    return;
  }
  data.assigned.forEach(task => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${task.title}</strong> <span class="badge">${task.status}</span><br><small>${task.project_name}${task.due_date ? ' • due ' + task.due_date : ''}</small>`;
    elements.assignedTasks.appendChild(li);
  });
}

function renderProjects() {
  elements.projectList.innerHTML = '';
  if (!state.projects.length) {
    elements.projectList.innerHTML = '<p>No projects yet. Create one to get started.</p>';
    return;
  }
  state.projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h4>${project.name}</h4>
      <p>${project.description || 'No description yet.'}</p>
      <p class="meta">Owner: ${project.owner_name}</p>
    `;
    card.addEventListener('click', () => selectProject(project));
    elements.projectList.appendChild(card);
  });
}

function renderProjectDetail() {
  if (!state.selectedProject) {
    elements.projectDetailCard.classList.add('hidden');
    return;
  }
  elements.projectDetailCard.classList.remove('hidden');
  const { name, description, owner_name } = state.selectedProject;
  elements.projectTitle.textContent = name;
  elements.projectDescription.textContent = description || 'No description available.';
  elements.projectOwner.textContent = owner_name;
  elements.projectMeta.innerHTML = `<p class="meta">Project ID: ${state.selectedProject.id}</p>`;
  loadTasks(state.selectedProject.id);
}

function selectProject(project) {
  state.selectedProject = project;
  renderProjectDetail();
}

function showCreateProject() {
  openModal(`
    <h2>Create Project</h2>
    <form id="createProjectForm" class="auth-form">
      <label>Name<input type="text" id="projectName" required /></label>
      <label>Description<textarea id="projectDescriptionField" rows="4"></textarea></label>
      <button type="submit" class="btn btn-primary">Create</button>
    </form>
  `);
  document.getElementById('createProjectForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescriptionField').value.trim();
    try {
      await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify({ name, description }) });
      await loadProjects();
      closeModal();
    } catch (err) {
      alert(err.message);
    }
  });
}

function showCreateTask() {
  if (!state.selectedProject) return;
  const taskHtml = `
    <h2>Add Task</h2>
    <form id="createTaskForm" class="auth-form">
      <label>Title<input type="text" id="taskTitle" required /></label>
      <label>Description<textarea id="taskDescription" rows="4"></textarea></label>
      <label>Assign to (email)<input type="email" id="taskAssignee" /></label>
      <label>Due date<input type="date" id="taskDueDate" /></label>
      <label>Status<select id="taskStatus">
          <option>To Do</option>
          <option>In Progress</option>
          <option>Review</option>
          <option>Done</option>
      </select></label>
      <button type="submit" class="btn btn-primary">Save Task</button>
    </form>
  `;
  openModal(taskHtml);
  document.getElementById('createTaskForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const assigned_to = document.getElementById('taskAssignee').value.trim();
    const due_date = document.getElementById('taskDueDate').value || null;
    const status = document.getElementById('taskStatus').value;
    try {
      await apiFetch(`/api/projects/${state.selectedProject.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title, description, assigned_to: assigned_to || null, due_date, status }),
      });
      await loadTasks(state.selectedProject.id);
      closeModal();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function showMembers() {
  if (!state.selectedProject) return;
  try {
    const { members } = await apiFetch(`/api/projects/${state.selectedProject.id}/members`);
    const rows = members.map(m => `<li>${m.name} (${m.email}) • ${m.role}</li>`).join('') || '<li>No members added yet.</li>';
    openModal(`
      <h2>Project Members</h2>
      <ul>${rows}</ul>
      <form id="assignMemberForm" class="auth-form">
        <label>Member email<input type="email" id="memberEmail" required /></label>
        <button type="submit" class="btn btn-primary">Add Member</button>
      </form>
    `);
    document.getElementById('assignMemberForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('memberEmail').value.trim();
      try {
        await apiFetch(`/api/projects/${state.selectedProject.id}/members`, { method: 'POST', body: JSON.stringify({ email }) });
        await showMembers();
      } catch (err) {
        alert(err.message);
      }
    });
  } catch (err) {
    alert(err.message);
  }
}

function renderTasks(tasks) {
  if (!tasks.length) {
    elements.tasksContainer.innerHTML = '<p>No tasks in this project yet.</p>';
    return;
  }
  const list = tasks.map(task => {
    const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';
    return `
      <div class="task-card">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div>
            <h4>${task.title}</h4>
            <p>${task.description || 'No description provided.'}</p>
          </div>
          <span class="badge">${task.status}${overdue ? ' • overdue' : ''}</span>
        </div>
        <p class="meta">Assigned to: ${task.assigned_name || 'Unassigned'} • Due: ${task.due_date || 'None'}</p>
        <button class="btn" data-task-id="${task.id}">Update</button>
      </div>
    `;
  }).join('');
  elements.tasksContainer.innerHTML = list;
  elements.tasksContainer.querySelectorAll('button[data-task-id]').forEach(button => {
    button.addEventListener('click', () => showEditTask(button.dataset.taskId));
  });
}

async function showEditTask(taskId) {
  try {
    const tasks = await apiFetch(`/api/projects/${state.selectedProject.id}/tasks`);
    const task = tasks.tasks.find(item => String(item.id) === String(taskId));
    if (!task) throw new Error('Task not found');
    openModal(`
      <h2>Edit Task</h2>
      <form id="editTaskForm" class="auth-form">
        <label>Title<input type="text" id="editTaskTitle" value="${task.title}" required /></label>
        <label>Description<textarea id="editTaskDescription" rows="4">${task.description || ''}</textarea></label>
        <label>Assign to (user id)<input type="number" id="editTaskAssignee" value="${task.assigned_to || ''}" /></label>
        <label>Due date<input type="date" id="editTaskDueDate" value="${task.due_date || ''}" /></label>
        <label>Status<select id="editTaskStatus">
          <option${task.status === 'To Do' ? ' selected' : ''}>To Do</option>
          <option${task.status === 'In Progress' ? ' selected' : ''}>In Progress</option>
          <option${task.status === 'Review' ? ' selected' : ''}>Review</option>
          <option${task.status === 'Done' ? ' selected' : ''}>Done</option>
        </select></label>
        <button type="submit" class="btn btn-primary">Save</button>
      </form>
    `);
    document.getElementById('editTaskForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const title = document.getElementById('editTaskTitle').value.trim();
      const description = document.getElementById('editTaskDescription').value.trim();
      const assigned_to = document.getElementById('editTaskAssignee').value.trim() || null;
      const due_date = document.getElementById('editTaskDueDate').value || null;
      const status = document.getElementById('editTaskStatus').value;
      await apiFetch(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ title, description, assigned_to, due_date, status }) });
      await loadTasks(state.selectedProject.id);
      closeModal();
    });
  } catch (err) {
    alert(err.message);
  }
}

async function loadDashboard() {
  try {
    const data = await apiFetch('/api/dashboard');
    renderDashboard(data);
  } catch (err) {
    logout();
  }
}

async function loadProjects() {
  const data = await apiFetch('/api/projects');
  state.projects = data.projects;
  renderProjects();
  if (state.selectedProject) {
    const selected = state.projects.find(p => p.id === state.selectedProject.id);
    if (!selected) {
      state.selectedProject = null;
      renderProjectDetail();
    } else {
      state.selectedProject = selected;
      renderProjectDetail();
    }
  }
}

async function loadTasks(projectId) {
  try {
    const { tasks } = await apiFetch(`/api/projects/${projectId}/tasks`);
    renderTasks(tasks);
  } catch (err) {
    alert(err.message);
  }
}

async function loadCurrentUser() {
  try {
    const data = await apiFetch('/api/users/me');
    state.user = data.user;
    renderNav();
    renderAccount();
    loadDashboard();
    loadProjects();
    showSection(elements.dashboardSection);
  } catch (err) {
    logout();
  }
}

function logout() {
  setToken(null);
  state.user = null;
  state.selectedProject = null;
  state.projects = [];
  renderNav();
  showSection(elements.authSection);
}

function initEvents() {
  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAuthError();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      const { user, token } = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(token);
      state.user = user;
      renderNav();
      renderAccount();
      loadDashboard();
      loadProjects();
      showSection(elements.dashboardSection);
    } catch (err) {
      showAuthError(err.message);
    }
  });

  elements.signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAuthError();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    try {
      const { user, token } = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      setToken(token);
      state.user = user;
      renderNav();
      renderAccount();
      loadDashboard();
      loadProjects();
      showSection(elements.dashboardSection);
    } catch (err) {
      showAuthError(err.message);
    }
  });

  elements.switchToSignup.addEventListener('click', () => {
    elements.loginForm.classList.add('hidden');
    elements.signupForm.classList.remove('hidden');
    elements.switchToSignup.classList.add('hidden');
    elements.switchToLogin.classList.remove('hidden');
  });

  elements.switchToLogin.addEventListener('click', () => {
    elements.signupForm.classList.add('hidden');
    elements.loginForm.classList.remove('hidden');
    elements.switchToLogin.classList.add('hidden');
    elements.switchToSignup.classList.remove('hidden');
  });

  elements.logoutBtn.addEventListener('click', logout);
  elements.navDashboard.addEventListener('click', () => { showSection(elements.dashboardSection); loadDashboard(); });
  elements.navProjects.addEventListener('click', () => { showSection(elements.projectsSection); loadProjects(); });
  elements.navAccount.addEventListener('click', () => { showSection(elements.accountSection); });
  elements.newProjectBtn.addEventListener('click', showCreateProject);
  elements.newTaskBtn.addEventListener('click', showCreateTask);
  elements.manageMembersBtn.addEventListener('click', showMembers);
  elements.closeModal.addEventListener('click', closeModal);
  document.addEventListener('click', (event) => {
    if (event.target === elements.modal) closeModal();
  });
}

function init() {
  renderNav();
  initEvents();
  if (state.token) {
    loadCurrentUser();
  } else {
    showSection(elements.authSection);
  }
}

init();
