/* eslint-disable no-loop-func */
import { createContext, useContext, useState, useEffect } from 'react';
import { authorizedRequest } from '../services/authService';
import { useAuth } from './AuthContext';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const STORAGE_KEY = 'healify_v2';

// NOTE: medicines starts EMPTY — no dummy/sample data.
const defaultState = {
  profile: null,
  foodLog: [],
  totals: { calories: 0, protein: 0, carbs: 0, fiber: 0 },
  water: 0,
  medicines: [],
  foodMedWarnings: [],
  mealSuggestion: null,
};

// ── Date helpers ─────────────────────────────────────
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const dateKeyOffset = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
/// Has the clock passed this HH:mm today?
const isTimePassedToday = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(h, m, 0, 0);
  return now >= scheduled;
};

export function AppProvider({ children }) {
  const { token } = useAuth();
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out any old-format medicines (pre-redesign) that lack a `times` array
        const cleanMedicines = (parsed.medicines || []).filter(m => Array.isArray(m.times));
        return { ...defaultState, ...parsed, medicines: cleanMedicines };
      }
    } catch (e) {}
    return defaultState;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) return;

      try {
        const [profile, medicines, food, waterToday] = await Promise.all([
          authorizedRequest('/profile'),
          authorizedRequest('/medicines'),
          authorizedRequest('/food'),
          authorizedRequest('/water/today'),
        ]);

        const cleanMedicines = (medicines || []).map(m => ({
          ...m,
          id: m._id || m.id,
          times: Array.isArray(m.times) ? m.times : [],
          doseHistory: Array.isArray(m.doseHistory) ? m.doseHistory : [],
        }));

        const cleanFoodLog = (food || []).map(f => ({
          ...f,
          id: f._id || f.id,
        }));

        const targetToday = todayKey();
        const todayEntries = cleanFoodLog.filter(entry => {
          try {
            const entryDate = new Date(entry.time);
            const entryKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
            return entryKey === targetToday;
          } catch (e) {
            return false;
          }
        });

        const recalculatedTotals = todayEntries.reduce((acc, entry) => ({
          calories: acc.calories + (entry.calories || 0),
          protein:  acc.protein  + (entry.protein  || 0),
          carbs:    acc.carbs    + (entry.carbs    || 0),
          fiber:    acc.fiber    + (entry.fiber    || 0),
        }), { calories: 0, protein: 0, carbs: 0, fiber: 0 });

        const waterGlasses = waterToday?.glasses || 0;

        setState(s => ({
          ...s,
          profile: profile || null,
          medicines: cleanMedicines,
          foodLog: cleanFoodLog,
          totals: recalculatedTotals,
          water: waterGlasses,
        }));
      } catch (err) {
        console.error('Failed to sync backend data to context:', err);
      }
    };

    fetchUserData();
  }, [token]);

  // ── Profile ──────────────────────────────────────────
  const setProfile = async (profile) => {
    try {
      const updated = await authorizedRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      setState(s => ({ ...s, profile: updated }));
    } catch (err) {
      console.error('Failed to save profile to backend:', err);
      setState(s => ({ ...s, profile }));
    }
  };

  // ── Food ─────────────────────────────────────────────
  const addFoodEntry = async (entry) => {
    const tempId = Date.now();
    const time = new Date().toISOString();
    try {
      const saved = await authorizedRequest('/food', {
        method: 'POST',
        body: JSON.stringify({ ...entry, time }),
      });
      const cleanEntry = { ...saved, id: saved._id || saved.id };
      setState(s => ({
        ...s,
        foodLog: [cleanEntry, ...s.foodLog],
        totals: {
          calories: s.totals.calories + (cleanEntry.calories || 0),
          protein:  s.totals.protein  + (cleanEntry.protein  || 0),
          carbs:    s.totals.carbs    + (cleanEntry.carbs    || 0),
          fiber:    s.totals.fiber    + (cleanEntry.fiber    || 0),
        }
      }));
    } catch (err) {
      console.error('Failed to add food entry to backend:', err);
      setState(s => ({
        ...s,
        foodLog: [{ ...entry, id: tempId, time }, ...s.foodLog],
        totals: {
          calories: s.totals.calories + (entry.calories || 0),
          protein:  s.totals.protein  + (entry.protein  || 0),
          carbs:    s.totals.carbs    + (entry.carbs    || 0),
          fiber:    s.totals.fiber    + (entry.fiber    || 0),
        }
      }));
    }
  };

  const removeFoodEntry = async (id) => {
    const isValidObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    if (isValidObjectId(id)) {
      try {
        await authorizedRequest(`/food/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete food entry from backend:', err);
      }
    }
    setState(s => {
      const entry = s.foodLog.find(e => e.id === id);
      if (!entry) return s;
      return {
        ...s,
        foodLog: s.foodLog.filter(e => e.id !== id),
        totals: {
          calories: Math.max(0, s.totals.calories - (entry.calories || 0)),
          protein:  Math.max(0, s.totals.protein  - (entry.protein  || 0)),
          carbs:    Math.max(0, s.totals.carbs    - (entry.carbs    || 0)),
          fiber:    Math.max(0, s.totals.fiber    - (entry.fiber    || 0)),
        }
      };
    });
  };

  const correctFoodEntry = (id, newData) =>
    setState(s => {
      const old = s.foodLog.find(e => e.id === id);
      if (!old) return s;
      return {
        ...s,
        foodLog: s.foodLog.map(e => e.id === id ? { ...e, ...newData } : e),
        totals: {
          calories: Math.max(0, s.totals.calories - (old.calories||0) + (newData.calories||0)),
          protein:  Math.max(0, s.totals.protein  - (old.protein ||0) + (newData.protein ||0)),
          carbs:    Math.max(0, s.totals.carbs    - (old.carbs   ||0) + (newData.carbs   ||0)),
          fiber:    Math.max(0, s.totals.fiber    - (old.fiber   ||0) + (newData.fiber   ||0)),
        }
      };
    });

  // ── Water ─────────────────────────────────────────────
  const setWater = async (n) => {
    try {
      await authorizedRequest('/water/today', {
        method: 'PUT',
        body: JSON.stringify({ glasses: n }),
      });
    } catch (err) {
      console.error('Failed to sync water to backend:', err);
    }
    setState(s => ({ ...s, water: n }));
  };

  // ── Cross-module warnings ──────────────────────────────
  const setFoodMedWarnings = (warnings) => setState(s => ({ ...s, foodMedWarnings: warnings }));
  const setMealSuggestion  = (suggestion) => setState(s => ({ ...s, mealSuggestion: suggestion }));

  // ═══════════════════════════════════════════════
  // MEDICINES — redesigned per-dose model
  // ═══════════════════════════════════════════════

  /// med = { name, strength, frequency, times: ['08:00', '14:00', ...] }
  const addMedicine = async (med) => {
    const tempId = Date.now();
    const startDate = todayKey();
    try {
      const saved = await authorizedRequest('/medicines', {
        method: 'POST',
        body: JSON.stringify({
          name: med.name,
          strength: med.strength || '',
          frequency: med.frequency,
          times: [...med.times].sort(),
        }),
      });
      const cleanMed = { ...saved, id: saved._id || saved.id };
      setState(s => ({
        ...s,
        medicines: [...s.medicines, cleanMed],
      }));
    } catch (err) {
      console.error('Failed to add medicine to backend:', err);
      setState(s => ({
        ...s,
        medicines: [...s.medicines, {
          id: tempId,
          name: med.name,
          strength: med.strength || '',
          frequency: med.frequency,
          times: [...med.times].sort(),
          startDate,
          doseHistory: [],
        }],
      }));
    }
  };

  const removeMedicine = async (id) => {
    const isValidObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    if (isValidObjectId(id)) {
      try {
        await authorizedRequest(`/medicines/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to remove medicine from backend:', err);
      }
    }
    setState(s => ({ ...s, medicines: s.medicines.filter(m => m.id !== id) }));
  };

  /// Mark ONE dose slot (date + time) as 'taken' | 'skipped'
  const markDose = async (medId, date, time, status) => {
    const isValidObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    if (isValidObjectId(medId)) {
      try {
        await authorizedRequest(`/medicines/${medId}/dose`, {
          method: 'POST',
          body: JSON.stringify({ date, time, status }),
        });
      } catch (err) {
        console.error('Failed to sync dose history to backend:', err);
      }
    }
    setState(s => ({
      ...s,
      medicines: s.medicines.map(m => {
        if (m.id !== medId) return m;
        const history = m.doseHistory || [];
        const idx = history.findIndex(h => h.date === date && h.time === time);
        const entry = { date, time, status, actionTime: new Date().toISOString() };
        let newHistory;
        if (idx >= 0) {
          newHistory = [...history];
          newHistory[idx] = entry;
        } else {
          newHistory = [...history, entry];
        }
        return { ...m, doseHistory: newHistory };
      })
    }));
  };

  /// Get today's doses for a medicine: [{ time, status }]
  /// status: 'taken' | 'skipped' | 'pending' (due, no action yet) | 'upcoming' (time hasn't arrived yet)
  const getTodayDoses = (medicine) => {
    const today = todayKey();
    return (medicine.times || []).map(time => {
      const entry = (medicine.doseHistory || []).find(h => h.date === today && h.time === time);
      if (entry) return { time, status: entry.status };
      return { time, status: isTimePassedToday(time) ? 'pending' : 'upcoming' };
    });
  };

  // ═══════════════════════════════════════════════
  // ADHERENCE — calculated per dose slot, not per medicine
  // ═══════════════════════════════════════════════

  /// % of expected dose-slots (in last `days` days, including today up to now)
  /// that were marked 'taken'. Slots not yet due (future today), and any day
  /// BEFORE medicine.startDate, are excluded entirely.
  const getAdherence = (medicine, days = 7) => {
    let expected = 0, taken = 0;
    for (let i = 0; i < days; i++) {
      const dateStr = dateKeyOffset(i);
      if (dateStr < medicine.startDate) continue; // medicine didn't exist yet
      (medicine.times || []).forEach(time => {
        // Only count "today" slots whose time has already passed
        if (i === 0 && !isTimePassedToday(time)) return;
        expected++;
        const entry = (medicine.doseHistory || []).find(h => h.date === dateStr && h.time === time);
        if (entry && entry.status === 'taken') taken++;
      });
    }
    if (expected === 0) return 100;
    return Math.round((taken / expected) * 100);
  };

  /// Count of dose-slots in last `days` days that were due but NOT taken
  /// (either explicitly skipped, or never logged). Days before
  /// medicine.startDate are excluded.
  const getMissedCount = (medicine, days = 7) => {
    let missed = 0;
    for (let i = 0; i < days; i++) {
      const dateStr = dateKeyOffset(i);
      if (dateStr < medicine.startDate) continue; // medicine didn't exist yet
      (medicine.times || []).forEach(time => {
        if (i === 0 && !isTimePassedToday(time)) return;
        const entry = (medicine.doseHistory || []).find(h => h.date === dateStr && h.time === time);
        if (!entry || entry.status !== 'taken') missed++;
      });
    }
    return missed;
  };

  /// 7-day dot row: for each of the last 7 days, returns
  /// { date, status } where status is 'taken' (all due doses taken),
  /// 'partial' (some taken), 'missed' (none taken), or null
  /// (no doses due yet, OR day is before medicine.startDate)
  const getWeeklyHistory = (medicine) => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = dateKeyOffset(i);
      const d = new Date();
      d.setDate(d.getDate() - i);

      // Before medicine existed -> blank, not counted
      if (dateStr < medicine.startDate) {
        days.push({ date: d, status: null });
        continue;
      }

      let expected = 0, taken = 0;
      (medicine.times || []).forEach(time => {
        if (i === 0 && !isTimePassedToday(time)) return;
        expected++;
        const entry = (medicine.doseHistory || []).find(h => h.date === dateStr && h.time === time);
        if (entry && entry.status === 'taken') taken++;
      });

      let status = null;
      if (expected > 0) {
        status = taken === expected ? 'taken' : taken === 0 ? 'missed' : 'partial';
      }
      days.push({ date: d, status });
    }
    return days;
  };

  /// Overall adherence across ALL medicines (average of per-medicine %), plus total missed dose-slots
  const getOverallAdherence = (days = 7) => {
    if (state.medicines.length === 0) return { percent: 100, missed: 0 };
    const percents = state.medicines.map(m => getAdherence(m, days));
    const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
    const missed = state.medicines.reduce((sum, m) => sum + getMissedCount(m, days), 0);
    return { percent: avg, missed };
  };

  // ═══════════════════════════════════════════════
  // MONTHLY ANALYTICS
  // ═══════════════════════════════════════════════

  /// Returns full monthly stats + calendar data for a medicine.
  /// year: e.g. 2026, month: 0-indexed (0 = January)
  const getMonthlyAnalytics = (medicine, year, month) => {
    const startDate = medicine.startDate; // 'YYYY-MM-DD'
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    let totalExpected = 0, totalTaken = 0, totalMissed = 0;
    const calendar = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

      // Before medicine started -> inactive, don't count
      if (dateStr < startDate) {
        calendar.push({ day, dateStr, status: 'inactive', expected: 0, taken: 0, missed: 0, doses: [] });
        continue;
      }
      // Future date -> inactive (not yet happened)
      if (dateStr > todayStr) {
        calendar.push({ day, dateStr, status: 'inactive', expected: 0, taken: 0, missed: 0, doses: [] });
        continue;
      }

      let dayExpected = 0, dayTaken = 0;
      const doses = [];
      (medicine.times || []).forEach(time => {
        // For today, only count doses whose time has already passed
        if (dateStr === todayStr) {
          const [h, m] = time.split(':').map(Number);
          const scheduled = new Date();
          scheduled.setHours(h, m, 0, 0);
          if (new Date() < scheduled) {
            doses.push({ time, status: 'upcoming' });
            return; // not yet due, don't count in expected
          }
        }
        dayExpected++;
        const entry = (medicine.doseHistory || []).find(h => h.date === dateStr && h.time === time);
        const status = entry ? entry.status : 'missed';
        if (status === 'taken') dayTaken++;
        doses.push({ time, status });
      });

      const dayMissed = dayExpected - dayTaken;
      totalExpected += dayExpected;
      totalTaken += dayTaken;
      totalMissed += dayMissed;

      let dayStatus;
      if (dayExpected === 0) dayStatus = 'inactive'; // started today but no dose due yet
      else if (dayTaken === dayExpected) dayStatus = 'taken';
      else if (dayTaken === 0) dayStatus = 'missed';
      else dayStatus = 'partial';

      calendar.push({ day, dateStr, status: dayStatus, expected: dayExpected, taken: dayTaken, missed: dayMissed, doses });
    }

    const adherence = totalExpected === 0 ? 100 : Math.round((totalTaken / totalExpected) * 100);

    return { totalExpected, totalTaken, totalMissed, adherence, calendar };
  };

  return (
    <AppContext.Provider value={{
      ...state,
      setProfile,
      addFoodEntry, removeFoodEntry, correctFoodEntry,
      setWater,
      addMedicine, removeMedicine, markDose, getTodayDoses,
      setFoodMedWarnings, setMealSuggestion,
      getAdherence, getMissedCount, getWeeklyHistory, getOverallAdherence, getMonthlyAnalytics,
    }}>
      {children}
    </AppContext.Provider>
  );
}
