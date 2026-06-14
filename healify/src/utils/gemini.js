const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 30000;

const clone = (value) => JSON.parse(JSON.stringify(value));

const FALLBACKS = {
  foodAnalysis: {
    food_name: 'Food item (estimate unavailable)',
    calories: 0,
    protein: 0,
    carbs: 0,
    fiber: 0,
    fat: 0,
    portion_note: 'AI analysis is temporarily unavailable. Enter nutrition values manually.',
    confidence: 'low',
    alternative_foods: [],
    food_tags: [],
    _fallback: true,
  },
  foodInteractions: {
    food_medicine_warnings: [],
    calorie_advice: {
      status: 'on_track',
      next_meal_suggestion: 'Choose a balanced meal and verify medicine interactions with a pharmacist.',
      avoid: 'No personalized interaction check is available right now.',
    },
    _fallback: true,
  },
  medicineInfo: {
    generic_name: 'Information unavailable',
    composition: 'Check the medicine label or ask a pharmacist.',
    drug_class: 'Unknown',
    uses: [],
    side_effects: [],
    food_interactions: [],
    recent_food_warnings: [],
    alternatives: [],
    warning: 'Do not change or stop prescribed medicine without professional advice.',
    how_to_take: 'Follow the prescription label and your clinician instructions.',
    _fallback: true,
  },
  emergency: {
    emergency_type: 'Emergency assessment unavailable',
    severity: 'severe',
    severity_reason: 'The AI service could not assess this situation safely.',
    condition_alerts: [],
    steps: [
      'Call local emergency services now if there is severe bleeding, breathing trouble, chest pain, seizure, poisoning, or unconsciousness.',
      'Move away from immediate danger only when it is safe to do so.',
      'Keep the person still and monitor breathing and responsiveness.',
      'Follow instructions from the emergency dispatcher.',
    ],
    do_not: [
      'Do not delay emergency care while waiting for an AI response.',
      'Do not give food, drink, or medicine to an unconscious person.',
      'Do not perform an unfamiliar procedure.',
    ],
    prevention: [],
    see_doctor: 'Call 112 or 108 in India now if symptoms are severe, worsening, or uncertain.',
    _fallback: true,
  },
  dailySummary: {
    overall_score: 0,
    nutrition_comment: 'Daily analysis is temporarily unavailable.',
    hydration_comment: 'Continue tracking water intake.',
    medicine_comment: 'Follow your prescribed medication schedule.',
    top_tip: 'Use your tracked values and follow your clinician guidance.',
    evening_suggestion: 'Choose a balanced meal appropriate for your health needs.',
    _fallback: true,
  },
};

function fallbackFor(task, payload = {}) {
  if (task === 'correctFood') {
    return {
      ...clone(FALLBACKS.foodAnalysis),
      food_name: payload.correctName || 'Food item',
      portion_note: 'Nutrition estimate unavailable. Enter values manually.',
      alternative_foods: undefined,
    };
  }
  return clone(FALLBACKS[task] || {});
}

// Tolerates markdown fences, surrounding prose, control characters, and trailing commas.
// It returns the supplied fallback instead of allowing malformed AI output to break the UI.
export function parseJSON(value, fallback = {}) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return clone(fallback);

  const cleaned = value
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  const attempts = [cleaned];
  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    attempts.push(cleaned.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    attempts.push(cleaned.slice(arrayStart, arrayEnd + 1));
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      try {
        return JSON.parse(
          attempt
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/,\s*([}\]])/g, '$1'),
        );
      } catch {
        // Try the next recoverable JSON fragment.
      }
    }
  }

  return clone(fallback);
}

async function requestAI(task, payload) {
  const fallback = fallbackFor(task, payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/ai/${task}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.result) return fallback;
    return { ...fallback, ...body.result, _fallback: Boolean(body.fallback || body.result._fallback) };
  } catch (error) {
    console.warn(`Healify AI ${task} request failed:`, error.message);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

// Kept for backwards compatibility. New code should call a task-specific function.
export async function callGemini(task, payload = {}) {
  return requestAI(task, payload);
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please select a valid image.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Image must be smaller than 8 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string' || !result.includes(',')) {
        reject(new Error('Unable to read image.'));
        return;
      }
      resolve({
        base64: result.split(',')[1],
        mimeType: file.type,
        dataUrl: result,
      });
    };
    reader.onerror = () => reject(new Error('Unable to read image.'));
    reader.readAsDataURL(file);
  });
}

export const analyzeFood = (payload) => requestAI('foodAnalysis', payload);
export const checkFoodInteractions = (payload) => requestAI('foodInteractions', payload);
export const correctFood = (payload) => requestAI('correctFood', payload);
export const getEmergencyHelp = (payload) => requestAI('emergency', payload);
export const getDailySummary = (payload) => requestAI('dailySummary', payload);
export const getMedicineInfo = (medicineName, recentFoods) =>
  requestAI('medicineInfo', { medicineName, recentFoods });
