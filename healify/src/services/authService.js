const SESSION_KEY = 'healify_auth_session';
const USERS_KEY = 'healify_mock_users';
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const wait = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

const request = async (path, options) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to complete this request.');
  return data;
};

const mockSignup = async ({ name, email, password }) => {
  await wait();
  const users = readUsers();
  if (users.some((user) => user.email === email)) {
    throw new Error('An account with this email already exists.');
  }
  const user = { id: `mock-${Date.now()}`, name, email };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, { ...user, password }]));
  return saveSession({ token: `mock-token-${Date.now()}`, user });
};

const mockLogin = async ({ email, password }) => {
  await wait();
  const account = readUsers().find(
    (user) => user.email === email && user.password === password,
  );
  if (!account) throw new Error('Invalid email or password.');
  const user = { id: account.id, name: account.name, email: account.email };
  return saveSession({ token: `mock-token-${Date.now()}`, user });
};

export const authService = {
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },
  async login(values) {
    if (AUTH_MODE === 'api') {
      return saveSession(await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      }));
    }
    return mockLogin(values);
  },
  async signup(values) {
    if (AUTH_MODE === 'api') {
      return saveSession(await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(values),
      }));
    }
    return mockSignup(values);
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};
