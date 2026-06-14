import { useState } from 'react';
import { useApp } from '../context/AppContext';

const CONDITIONS = [
  'Diabetes (Type 1)', 'Diabetes (Type 2)', 'Hypertension', 'High Cholesterol',
  'Thyroid (Hypothyroid)', 'Thyroid (Hyperthyroid)', 'Kidney Disease', 'Liver Disease',
  'Heart Disease', 'Asthma', 'Lactose Intolerance', 'Gluten Intolerance / Celiac',
  'PCOS', 'Anemia', 'Arthritis', 'Obesity'
];

const ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Dairy / Lactose', 'Eggs', 'Shellfish',
  'Fish', 'Wheat / Gluten', 'Soy', 'Sesame'
];

export default function ProfileModal({ onClose }) {
  const { profile, setProfile } = useApp();

  const [form, setForm] = useState({
    name:        profile?.name        || '',
    age:         profile?.age         || '',
    gender:      profile?.gender      || 'male',
    weight:      profile?.weight      || '',
    goalWeight:  profile?.goalWeight  || '',
    height:      profile?.height      || '',
    activity:    profile?.activity    || 'moderate',
    goal:        profile?.goal        || 'maintain',
    waterGoal:   profile?.waterGoal   || 8,
    conditions:  profile?.conditions  || [],
    allergies:   profile?.allergies   || [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCondition = (c) => {
    setForm(f => ({
      ...f,
      conditions: f.conditions.includes(c) ? f.conditions.filter(x => x !== c) : [...f.conditions, c]
    }));
  };

  const toggleAllergy = (a) => {
    setForm(f => ({
      ...f,
      allergies: f.allergies.includes(a) ? f.allergies.filter(x => x !== a) : [...f.allergies, a]
    }));
  };

  const calculateCalories = () => {
    const { weight, height, age, gender, activity, goal } = form;
    if (!weight || !height || !age) return 2000;
    let bmr = gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
    const mult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, veryActive:1.9 }[activity];
    let tdee = bmr * mult;
    if (goal === 'lose') tdee -= 500;
    if (goal === 'gain') tdee += 400;
    return Math.round(tdee);
  };

  const handleSave = () => {
    if (!form.name || !form.age || !form.weight || !form.height) {
      alert('Please fill in all required fields (Name, Age, Weight, Height).');
      return;
    }
    const calories = calculateCalories();
    setProfile({
      ...form,
      age:        parseInt(form.age),
      weight:     parseFloat(form.weight),
      goalWeight: parseFloat(form.goalWeight) || parseFloat(form.weight),
      height:     parseFloat(form.height),
      waterGoal:  parseInt(form.waterGoal) || 8,
      calories,
      proteinTarget: Math.round(parseFloat(form.weight) * 1.6),
    });
    if (onClose) onClose();
  };

  const inputStyle = {
    width:'100%', padding:'9px 13px',
    border:'1.5px solid #e2e8f0', borderRadius:8,
    fontFamily:'inherit', fontSize:14, color:'#0f172a',
    background:'#fff', outline:'none', marginBottom:10,
  };
  const labelStyle = { display:'block', fontSize:13, fontWeight:500, color:'#475569', marginBottom:5 };
  const sectionStyle = { marginBottom:16 };
  const rowStyle = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 };

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(15,23,42,0.5)',
      backdropFilter:'blur(8px)',
      zIndex:1000, display:'flex',
      alignItems:'center', justifyContent:'center',
      padding:16, animation:'fadeIn 0.2s ease'
    }}>
      <div style={{
        background:'#fff', borderRadius:20,
        padding:28, width:'100%', maxWidth:500,
        boxShadow:'0 20px 60px rgba(15,23,42,0.15)',
        maxHeight:'90vh', overflowY:'auto',
        animation:'fadeUp 0.3s ease'
      }}>
        <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:26, color:'#0f172a', marginBottom:4 }}>
          {profile ? 'Edit your profile' : 'Welcome to Healify'}
        </div>
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>
          Set up your health profile for personalized AI intelligence across all modules
        </div>

        {/* Basic info */}
        <div style={rowStyle}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} placeholder="Your name" value={form.name} onChange={e=>set('name',e.target.value)} />
          </div>
          <div style={sectionStyle}>
            <label style={labelStyle}>Age *</label>
            <input style={inputStyle} type="number" placeholder="21" value={form.age} onChange={e=>set('age',e.target.value)} />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Gender</label>
            <select style={inputStyle} value={form.gender} onChange={e=>set('gender',e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={sectionStyle}>
            <label style={labelStyle}>Activity Level</label>
            <select style={inputStyle} value={form.activity} onChange={e=>set('activity',e.target.value)}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Lightly active</option>
              <option value="moderate">Moderately active</option>
              <option value="active">Very active</option>
              <option value="veryActive">Athletic</option>
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Current Weight (kg) *</label>
            <input style={inputStyle} type="number" placeholder="65" value={form.weight} onChange={e=>set('weight',e.target.value)} />
          </div>
          <div style={sectionStyle}>
            <label style={labelStyle}>Goal Weight (kg)</label>
            <input style={inputStyle} type="number" placeholder="62" value={form.goalWeight} onChange={e=>set('goalWeight',e.target.value)} />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Height (cm) *</label>
            <input style={inputStyle} type="number" placeholder="170" value={form.height} onChange={e=>set('height',e.target.value)} />
          </div>
          <div style={sectionStyle}>
            <label style={labelStyle}>Goal</label>
            <select style={inputStyle} value={form.goal} onChange={e=>set('goal',e.target.value)}>
              <option value="maintain">Maintain weight</option>
              <option value="lose">Lose weight</option>
              <option value="gain">Gain weight / muscle</option>
            </select>
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Daily Water Goal (glasses)</label>
          <input style={inputStyle} type="number" min="4" max="16" placeholder="8" value={form.waterGoal} onChange={e=>set('waterGoal',e.target.value)} />
        </div>

        {/* Medical Conditions — KEY for cross-module */}
        <div style={{ marginBottom:16 }}>
          <label style={{ ...labelStyle, marginBottom:8 }}>
            Medical Conditions
            <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6 }}>
              — used by AI to check food & medicine safety
            </span>
          </label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {CONDITIONS.map(c => (
              <button
                key={c}
                onClick={() => toggleCondition(c)}
                style={{
                  padding:'5px 11px', borderRadius:99, fontSize:12, fontWeight:500,
                  cursor:'pointer', transition:'all 0.15s',
                  background: form.conditions.includes(c) ? '#ecfdf5' : '#f8fafc',
                  border: form.conditions.includes(c) ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                  color: form.conditions.includes(c) ? '#059669' : '#64748b',
                }}
              >
                {form.conditions.includes(c) ? '✓ ' : ''}{c}
              </button>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div style={{ marginBottom:20 }}>
          <label style={{ ...labelStyle, marginBottom:8 }}>
            Food Allergies / Intolerances
            <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6 }}>
              — AI will warn you when food contains these
            </span>
          </label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {ALLERGIES.map(a => (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                style={{
                  padding:'5px 11px', borderRadius:99, fontSize:12, fontWeight:500,
                  cursor:'pointer', transition:'all 0.15s',
                  background: form.allergies.includes(a) ? '#fef2f2' : '#f8fafc',
                  border: form.allergies.includes(a) ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                  color: form.allergies.includes(a) ? '#dc2626' : '#64748b',
                }}
              >
                {form.allergies.includes(a) ? '✕ ' : ''}{a}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-calculated calorie note */}
        {form.weight && form.height && form.age && (
          <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#065f46' }}>
            ✓ Your daily calorie target will be auto-calculated: ~{calculateCalories()} kcal/day
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={handleSave}
            style={{
              flex:1, padding:'12px', background:'#10b981', color:'white',
              border:'none', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer'
            }}
          >
            {profile ? 'Save Changes' : 'Get Started →'}
          </button>
          {profile && onClose && (
            <button
              onClick={onClose}
              style={{
                padding:'12px 20px', background:'#f8fafc', color:'#475569',
                border:'1px solid #e2e8f0', borderRadius:10, fontSize:15, cursor:'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
