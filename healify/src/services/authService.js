const SESSION_KEY = 'healify_auth_session';
const USERS_KEY = 'healify_mock_users';
const MIGRATION_KEY = 'healify_migration_done';
const AUTH_MODE = process.env.REACT_APP_AUTH_MODE || 'hybrid';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

const migrateLocalUsers = async () => {
  if (AUTH_MODE === 'mock' || localStorage.getItem(MIGRATION_KEY) === 'true') return;

  for (const user of readUsers()) {
    try {
      await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
        }),
      });
    } catch (error) {
      console.log(`Backend migration skipped for ${user.email}: ${error.message}`);
    }
  }

  localStorage.setItem(MIGRATION_KEY, 'true');
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
    if (AUTH_MODE !== 'mock') {
      try {
        return saveSession(await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(values),
        }));
      } catch (error) {
        console.log('Backend login failed, falling back to local login');
      }
    }
    return mockLogin(values);
  },
  async signup(values) {
    const localSession = await mockSignup(values);

    if (AUTH_MODE !== 'mock') {
      try {
        await request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(values),
        });
      } catch (error) {
        console.log('Backend signup failed, local signup preserved');
      }
    }

    return localSession;
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};

void migrateLocalUsers();
