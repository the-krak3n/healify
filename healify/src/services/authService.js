const SESSION_KEY = 'healify_auth_session';
const USERS_KEY = 'healify_mock_users';
const MIGRATION_KEY = 'healify_migration_done';
const APP_DATA_KEY = 'healify_v2';
const APP_DATA_MIGRATION_KEY = 'healify_data_migrated';
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

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Unable to complete this request.');
    error.status = response.status;
    throw error;
  }
  return data;
};

export const authorizedRequest = (path, options = {}, session) => {
  const token = session?.token || readSession()?.token;
  if (!token) throw new Error('Missing authentication session.');
  return request(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
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

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toStringArray = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

const mapProfileForBackend = (profile) => ({
  name: typeof profile.name === 'string' ? profile.name : '',
  age: profile.age === undefined ? undefined : toNumber(profile.age),
  gender: ['male', 'female', 'other'].includes(profile.gender) ? profile.gender : 'other',
  weight: profile.weight === undefined ? undefined : toNumber(profile.weight),
  goalWeight: profile.goalWeight === undefined ? undefined : toNumber(profile.goalWeight),
  height: profile.height === undefined ? undefined : toNumber(profile.height),
  activity: typeof profile.activity === 'string' ? profile.activity : 'moderate',
  goal: typeof profile.goal === 'string' ? profile.goal : 'maintain',
  waterGoal: profile.waterGoal === undefined ? undefined : toNumber(profile.waterGoal),
  conditions: toStringArray(profile.conditions),
  allergies: toStringArray(profile.allergies),
  calories: profile.calories === undefined ? undefined : toNumber(profile.calories),
  proteinTarget: profile.proteinTarget === undefined ? undefined : toNumber(profile.proteinTarget),
});

const mapMedicineForBackend = (med) => {
  const today = new Date().toISOString().split("T")[0];

  return {
    name: typeof med.name === 'string' ? med.name : '',
    strength: typeof med.strength === 'string' ? med.strength : '',
    frequency: typeof med.frequency === 'string' ? med.frequency : 'once',
    times: Array.isArray(med.times)
      ? med.times.filter((time) => typeof time === 'string')
      : [],
    startDate:
      typeof med.startDate === 'string'
        ? med.startDate
        : today,
  };
};

const mapFoodForBackend = (food) => ({
  food_name: typeof food.food_name === 'string' ? food.food_name : '',
  calories: toNumber(food.calories),
  protein: toNumber(food.protein),
  carbs: toNumber(food.carbs),
  fiber: toNumber(food.fiber),
  fat: toNumber(food.fat),
  portion_note: typeof food.portion_note === 'string' ? food.portion_note : '',
  confidence: typeof food.confidence === 'string' ? food.confidence : '',
  alternative_foods: toStringArray(food.alternative_foods),
  food_tags: toStringArray(food.food_tags),
  thumb: typeof food.thumb === 'string' ? food.thumb : null,
  time: food.time,
});

const isDuplicateError = (error) =>
  error?.status === 409 || /duplicate|already exists/i.test(error?.message || '');

export const migrateLegacyAppData = async (session) => {
  if (localStorage.getItem(APP_DATA_MIGRATION_KEY) === 'true') return;

  const raw = localStorage.getItem(APP_DATA_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    if (data.profile) {
      await authorizedRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(mapProfileForBackend(data.profile)),
      }, session);
    }

    if (Array.isArray(data.medicines)) {
      for (const med of data.medicines) {
        try {
          await authorizedRequest('/medicines', {
            method: 'POST',
            body: JSON.stringify(mapMedicineForBackend(med)),
          }, session);
        } catch (error) {
          if (!isDuplicateError(error)) throw error;
        }
      }
    }

    if (Array.isArray(data.foodLog)) {
      for (const food of data.foodLog) {
        try {
          await authorizedRequest('/food', {
            method: 'POST',
            body: JSON.stringify(mapFoodForBackend(food)),
          }, session);
        } catch (error) {
          if (!isDuplicateError(error)) throw error;
        }
      }
    }

    if (typeof data.water === 'number') {
      await authorizedRequest('/water/today', {
        method: 'PUT',
        body: JSON.stringify({ glasses: data.water }),
      }, session);
    }

    localStorage.setItem(APP_DATA_MIGRATION_KEY, 'true');
  } catch (error) {
    console.log('Migration failed, local data preserved');
  }
};

const scheduleLegacyDataMigration = (session) => {
  setTimeout(() => {
    void migrateLegacyAppData(session);
  }, 500);
};

export const authService = {
  getSession() {
    return readSession();
  },
  async login(values) {
    if (AUTH_MODE !== 'mock') {
      try {
        const session = saveSession(await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(values),
        }));
        scheduleLegacyDataMigration(session);
        return session;
      } catch (error) {
        console.log('Backend login failed, falling back to local login');
      }
    }
    const session = await mockLogin(values);
    return session;
  },
  async signup(values) {
    let session = await mockSignup(values);

    if (AUTH_MODE !== 'mock') {
      try {
        session = saveSession(await request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(values),
        }));
      } catch (error) {
        console.log('Backend signup failed, local signup preserved');
      }
    }

    if (AUTH_MODE !== 'mock') {
      scheduleLegacyDataMigration(session);
    }

    return session;
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};

void migrateLocalUsers();
