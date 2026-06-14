const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 25000;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const clone = (value) => JSON.parse(JSON.stringify(value));
const text = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : fallback;
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : fallback;
};
const list = (value, fallback = []) =>
  Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean).slice(0, 12) : fallback;
const enumValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

const FALLBACKS = {
  foodAnalysis: {
    food_name: 'Food item (estimate unavailable)', calories: 0, protein: 0, carbs: 0,
    fiber: 0, fat: 0,
    portion_note: 'AI analysis is temporarily unavailable. Enter nutrition values manually.',
    confidence: 'low', alternative_foods: [], food_tags: [],
  },
  foodInteractions: {
    food_medicine_warnings: [],
    calorie_advice: {
      status: 'on_track',
      next_meal_suggestion: 'Choose a balanced meal and verify medicine interactions with a pharmacist.',
      avoid: 'No personalized interaction check is available right now.',
    },
  },
  medicineInfo: {
    generic_name: 'Information unavailable',
    composition: 'Check the medicine label or ask a pharmacist.',
    drug_class: 'Unknown', uses: [], side_effects: [], food_interactions: [],
    recent_food_warnings: [], alternatives: [],
    warning: 'Do not change or stop prescribed medicine without professional advice.',
    how_to_take: 'Follow the prescription label and your clinician instructions.',
  },
  emergency: {
    emergency_type: 'Emergency assessment unavailable',
    severity: 'severe',
    urgency_score: 10,
    severity_reason: 'The AI service could not assess this situation safely.',
    summary: 'A reliable assessment could not be generated. Use professional emergency support if there is any concern.',
    condition_alerts: [],
    possible_complications: [
      'Symptoms may worsen without timely assessment.',
    ],
    monitor_for: [
      'Breathing difficulty',
      'Loss of consciousness',
      'Severe or uncontrolled bleeding',
      'Rapidly worsening pain or swelling',
    ],
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
    recovery_estimate: 'Cannot be estimated safely without an in-person assessment.',
  },
  dailySummary: {
    overall_score: 0,
    nutrition_comment: 'Daily analysis is temporarily unavailable.',
    hydration_comment: 'Continue tracking water intake.',
    medicine_comment: 'Follow your prescribed medication schedule.',
    top_tip: 'Use your tracked values and follow your clinician guidance.',
    evening_suggestion: 'Choose a balanced meal appropriate for your health needs.',
  },
};

function fallbackFor(task, payload = {}) {
  if (task === 'correctFood') {
    return {
      ...clone(FALLBACKS.foodAnalysis),
      food_name: text(payload.correctName, 'Food item'),
      portion_note: 'Nutrition estimate unavailable. Enter values manually.',
    };
  }
  return clone(FALLBACKS[task] || {});
}

function parseJSON(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return clone(fallback);
  const cleaned = value
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  const fragments = [cleaned];
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) fragments.push(cleaned.slice(start, end + 1));
  for (const fragment of fragments) {
    try {
      return JSON.parse(fragment);
    } catch {
      try {
        return JSON.parse(fragment
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/,\s*([}\]])/g, '$1'));
      } catch {
        // Continue to the next fragment.
      }
    }
  }
  return clone(fallback);
}

function normalizeFood(value, fallback) {
  return {
    food_name: text(value.food_name, fallback.food_name),
    calories: number(value.calories),
    protein: number(value.protein),
    carbs: number(value.carbs),
    fiber: number(value.fiber),
    fat: number(value.fat),
    portion_note: text(value.portion_note, fallback.portion_note),
    confidence: enumValue(value.confidence, ['high', 'medium', 'low'], 'low'),
    alternative_foods: list(value.alternative_foods),
    food_tags: list(value.food_tags),
  };
}

function normalize(task, value, fallback) {
  if (!value || typeof value !== 'object') return fallback;
  if (task === 'foodAnalysis' || task === 'correctFood') return normalizeFood(value, fallback);
  if (task === 'emergency') {
    return {
      emergency_type: text(value.emergency_type, fallback.emergency_type),
      severity: enumValue(value.severity, ['mild', 'moderate', 'severe'], 'severe'),
      urgency_score: Math.min(10, Math.max(1, Math.round(number(value.urgency_score, fallback.urgency_score)))),
      severity_reason: text(value.severity_reason, fallback.severity_reason),
      summary: text(value.summary, fallback.summary),
      condition_alerts: list(value.condition_alerts),
      possible_complications: list(value.possible_complications, fallback.possible_complications),
      monitor_for: list(value.monitor_for, fallback.monitor_for),
      steps: list(value.steps, fallback.steps),
      do_not: list(value.do_not, fallback.do_not),
      prevention: list(value.prevention),
      see_doctor: text(value.see_doctor, fallback.see_doctor),
      recovery_estimate: text(value.recovery_estimate, fallback.recovery_estimate),
    };
  }
  if (task === 'foodInteractions') {
    const warnings = Array.isArray(value.food_medicine_warnings)
      ? value.food_medicine_warnings.slice(0, 8).map((item) => ({
        medicine: text(item?.medicine, 'Medication or condition'),
        warning: text(item?.warning, 'Confirm this interaction with a pharmacist.'),
        severity: enumValue(item?.severity, ['high', 'medium', 'low'], 'medium'),
      }))
      : [];
    const advice = value.calorie_advice || {};
    return {
      food_medicine_warnings: warnings,
      calorie_advice: {
        status: enumValue(advice.status, ['on_track', 'nearly_full', 'exceeded', 'plenty_left'], 'on_track'),
        next_meal_suggestion: text(advice.next_meal_suggestion, fallback.calorie_advice.next_meal_suggestion),
        avoid: text(advice.avoid, fallback.calorie_advice.avoid),
      },
    };
  }
  if (task === 'medicineInfo') {
    const objectList = (items, mapper) => Array.isArray(items) ? items.slice(0, 8).map(mapper) : [];
    return {
      generic_name: text(value.generic_name, fallback.generic_name),
      composition: text(value.composition, fallback.composition),
      drug_class: text(value.drug_class, fallback.drug_class),
      uses: list(value.uses),
      side_effects: objectList(value.side_effects, (item) => ({
        name: text(item?.name, 'Unknown'),
        severity: enumValue(item?.severity, ['high', 'medium', 'low'], 'low'),
      })),
      food_interactions: objectList(value.food_interactions, (item) => ({
        food: text(item?.food, 'Unknown'),
        reason: text(item?.reason, 'Ask a pharmacist.'),
        severity: enumValue(item?.severity, ['high', 'medium', 'low'], 'medium'),
      })),
      recent_food_warnings: objectList(value.recent_food_warnings, (item) => ({
        food: text(item?.food, 'Recent food'),
        warning: text(item?.warning, 'Ask a pharmacist.'),
      })),
      alternatives: objectList(value.alternatives, (item) => ({
        brand: text(item?.brand, 'Ask a pharmacist'),
        company: text(item?.company, ''),
        price: text(item?.price, 'Price varies'),
      })),
      warning: text(value.warning, fallback.warning),
      how_to_take: text(value.how_to_take, fallback.how_to_take),
    };
  }
  if (task === 'dailySummary') {
    return {
      overall_score: Math.min(100, number(value.overall_score)),
      nutrition_comment: text(value.nutrition_comment, fallback.nutrition_comment),
      hydration_comment: text(value.hydration_comment, fallback.hydration_comment),
      medicine_comment: text(value.medicine_comment, fallback.medicine_comment),
      top_tip: text(value.top_tip, fallback.top_tip),
      evening_suggestion: text(value.evening_suggestion, fallback.evening_suggestion),
    };
  }
  return fallback;
}

function buildPrompt(task, payload) {
  const jsonInstruction = 'Return one JSON object only. Use the requested keys. Use numbers for nutrition values and arrays when requested. Do not use markdown.';
  if (task === 'foodAnalysis' || task === 'correctFood') {
    const name = task === 'correctFood' ? payload.correctName : payload.description;
    return `Estimate the nutrition for an Indian meal from the supplied description and optional image.
Description: ${text(name, 'Use the image')}
Quantity: ${text(payload.quantity || payload.originalQuantity, 'typical serving')}
Be conservative when uncertain. Do not claim to use a specific database.
${jsonInstruction}
Keys: food_name, calories, protein, carbs, fiber, fat, portion_note, confidence, alternative_foods, food_tags.
confidence is high, medium, or low.`;
  }
  if (task === 'foodInteractions') {
    return `Provide cautious, general food and medication interaction guidance. Do not diagnose or tell the user to stop medication. Recommend pharmacist confirmation for meaningful interactions.
Food: ${text(payload.foodName)}
Food tags: ${list(payload.foodTags).join(', ') || 'none'}
Medicines: ${(payload.medicines || []).map((item) => text(item?.name)).filter(Boolean).join(', ') || 'none'}
Conditions: ${list(payload.conditions).join(', ') || 'none'}
Calories eaten: ${number(payload.calories)}; remaining: ${number(payload.remainingCalories)}; daily goal: ${number(payload.calorieGoal, 2000)}.
${jsonInstruction}
Keys: food_medicine_warnings (array of medicine, warning, severity) and calorie_advice (status, next_meal_suggestion, avoid).
severity is high, medium, or low. status is on_track, nearly_full, exceeded, or plenty_left.`;
  }
  if (task === 'medicineInfo') {
    return `Give concise patient education about this medicine. Avoid diagnosis, prescribing, dose changes, or certainty about brands and prices. State uncertainty where needed.
Medicine: ${text(payload.medicineName)}
Recent foods: ${(payload.recentFoods || []).slice(0, 5).map((item) => text(item?.food_name)).filter(Boolean).join(', ') || 'none'}
${jsonInstruction}
Keys: generic_name, composition, drug_class, uses, side_effects (name, severity), food_interactions (food, reason, severity), recent_food_warnings (food, warning), alternatives (brand, company, price), warning, how_to_take.`;
  }
  if (task === 'emergency') {
    return `Act as a cautious first-aid information assistant. Review the supplied image, text, or both and provide a structured safety assessment for a bystander.

Identify the situation as specifically as the available evidence supports, such as "superficial partial-thickness burn on hand" or "deep-appearing forearm cut with active bleeding", rather than using a generic label. Clearly use uncertainty language when image or text evidence is incomplete. This is not a medical diagnosis.

Give practical, ordered first-aid steps with enough detail to follow safely. Include scene safety, immediate priorities, positioning, simple wound or injury care, monitoring, and escalation. Do not recommend invasive procedures, prescription drugs, changing medication doses, or delaying professional care.

Use the provided conditions and medicines only for relevant safety cautions. If diabetes is present, consider delayed healing and infection risk. If allergies are present, flag possible exposure concerns without recommending prescription treatment. If medicines may affect bleeding, alertness, or healing, explain the relevant caution without telling the user to stop them.

Situation: ${text(payload.description, 'Use visible, non-sensitive details from the supplied image and state uncertainty')}
Relevant conditions: ${list(payload.conditions).join(', ') || 'none provided'}
Current medicines: ${(payload.medicines || []).map((item) => text(item?.name)).filter(Boolean).join(', ') || 'none provided'}

${jsonInstruction}
Return these keys:
- emergency_type: specific visible or described injury/event label
- severity: mild, moderate, or severe
- urgency_score: integer from 1 to 10
- severity_reason: concise evidence supporting the rating
- summary: professional two-sentence overview with uncertainty noted
- condition_alerts: profile-specific cautions for conditions, allergies, or medicines; empty array if none
- possible_complications: plausible complications to be aware of, not definitive predictions
- monitor_for: specific warning signs that require escalation
- steps: 5 to 8 detailed, practical, ordered first-aid actions
- do_not: unsafe actions to avoid, each with a brief reason
- prevention: relevant prevention suggestions
- see_doctor: clear threshold and timeframe for professional care
- recovery_estimate: cautious general range, or state that it cannot be estimated from the available information

For severe, rapidly worsening, uncertain, or potentially life-threatening situations, clearly advise contacting local emergency services. Do not overstate certainty or imply that the response replaces an in-person assessment.`;
  }
  if (task === 'dailySummary') {
    return `Summarize these self-tracked wellness values without diagnosis or treatment advice:
${JSON.stringify(payload)}
${jsonInstruction}
Keys: overall_score (0-100), nutrition_comment, hydration_comment, medicine_comment, top_tip, evening_suggestion.`;
  }
  return '';
}

async function callGemini(task, payload) {
  const fallback = fallbackFor(task, payload);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || typeof fetch !== 'function') {
    return { result: fallback, fallback: true, reason: apiKey ? 'fetch_unavailable' : 'missing_api_key' };
  }

  const parts = [];
  if (
    payload.imageBase64 &&
    /^image\/(jpeg|png|webp|heic|heif)$/i.test(payload.imageMime || '')
  ) {
    parts.push({ inlineData: { mimeType: payload.imageMime, data: payload.imageBase64 } });
  }
  parts.push({ text: buildPrompt(task, payload) });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'text/plain',
        },
      }),
    });

    const raw = await response.text();
    console.log("RAW GEMINI RESPONSE:", raw);
    const data = parseJSON(raw, {});
    if (!response.ok) {
      console.error('Gemini API error', { status: response.status, message: data.error?.message });
      return { result: fallback, fallback: true, reason: `http_${response.status}` };
    }

    const candidate = data.candidates?.[0];
    const output = candidate?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n');
    if (!output) {
      console.warn('Gemini produced no usable output', {
        blockReason: data.promptFeedback?.blockReason,
        blockReasonMessage: data.promptFeedback?.blockReasonMessage,
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings || data.promptFeedback?.safetyRatings,
      });
      return {
        result: fallback,
        fallback: true,
        reason: data.promptFeedback?.blockReason || candidate?.finishReason || 'empty_candidates',
      };
    }

    const parsed = parseJSON(output, fallback);
    const normalized = normalize(task, parsed, fallback);
    return { result: normalized, fallback: parsed === fallback };
  } catch (error) {
    console.error('Gemini request failed', { name: error.name, message: error.message });
    return { result: fallback, fallback: true, reason: error.name === 'AbortError' ? 'timeout' : 'request_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callGemini, fallbackFor, parseJSON };
