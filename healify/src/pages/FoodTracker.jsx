import { useState } from 'react';
import { Camera, Sparkles, Edit3, Trash2, Check, X as XIcon, Droplet, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analyzeFood, correctFood, checkFoodInteractions, fileToBase64 } from '../utils/gemini';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FoodTracker() {
  const {
    profile, foodLog, totals, water, setWater,
    addFoodEntry, removeFoodEntry, correctFoodEntry,
    medicines, setFoodMedWarnings, setMealSuggestion
  } = useApp();

  const [imgData, setImgData]         = useState(null);
  const [desc, setDesc]               = useState('');
  const [qty, setQty]                 = useState('');
  const [loading, setLoading]         = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [analysis, setAnalysis]       = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [correctingId, setCorrectingId] = useState(null);
  const [correctName, setCorrectName] = useState('');
  const [correctLoading, setCorrectLoading] = useState(false);
  const [aiNotice, setAiNotice]           = useState('');

  const calorieGoal   = profile?.calories || 2000;
  const waterGoal     = profile?.waterGoal || 8;
  const conditions    = profile?.conditions || [];
  const allergies     = profile?.allergies || [];
  const remaining     = Math.max(0, calorieGoal - Math.round(totals.calories));
  const pct           = Math.min(100, Math.round((totals.calories / calorieGoal) * 100));

  // ── Image handler ──────────────────────────────────
  const handleImg = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { setImgData(await fileToBase64(f)); } catch { alert('Failed to read image'); }
  };

  // ── Step 1: Analyze food ───────────────────────────
  const handleAnalyze = async () => {
    if (!imgData && !desc.trim()) { alert('Upload a photo or describe your food first.'); return; }
    setLoading(true); setAnalysis(null); setInteractions(null); setAiNotice('');
    try {
      const result = await analyzeFood({
        imageBase64: imgData?.base64, imageMime: imgData?.mimeType, description: desc, quantity: qty
      });
      setAnalysis(result);
      if (result._fallback) setAiNotice('Live AI analysis is unavailable. Review or enter nutrition values before logging.');
    } catch {
      setAiNotice('Food analysis is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Cross-module check ─────────────────────
  const runInteractionCheck = async (foodData) => {
    setCheckLoading(true);
    try {
      const activeMeds = medicines.filter(m => m.status !== 'missed');
      const result = await checkFoodInteractions({
        foodName:        foodData.food_name,
        foodTags:        [...(foodData.food_tags || []), ...(allergies.map(a => a.toLowerCase()))],
        medicines:       activeMeds,
        conditions:      [...conditions, ...(allergies.map(a => `${a} allergy`))],
        calories:        foodData.calories,
        remainingCalories: remaining - foodData.calories,
        calorieGoal,
      });
      setInteractions(result);
      if (result.food_medicine_warnings?.length > 0) setFoodMedWarnings(result.food_medicine_warnings);
      if (result.calorie_advice)                      setMealSuggestion(result.calorie_advice);
    } catch (err) {
      console.warn('Interaction check failed:', err.message);
    }
    setCheckLoading(false);
  };

  // ── Accept food (add to log) ───────────────────────
  const handleAccept = async () => {
    if (!analysis) return;
    addFoodEntry({ ...analysis, thumb: imgData?.dataUrl || null });
    await runInteractionCheck(analysis);
    setAnalysis(null); setImgData(null); setDesc(''); setQty('');
  };

  // ── Correct AI error ──────────────────────────────
  const handleCorrect = async (id) => {
    if (!correctName.trim()) return;
    setCorrectLoading(true);
    try {
      const result = await correctFood({ correctName, originalQuantity: qty });
      correctFoodEntry(id, result);
      setCorrectingId(null); setCorrectName('');
    } catch (err) { alert('Correction failed: ' + err.message); }
    setCorrectLoading(false);
  };

  // ── Helpers ───────────────────────────────────────
  const getSeverityColor = (sev) => ({ high:'#ef4444', medium:'#f59e0b', low:'#10b981' }[sev] || '#94a3b8');
  const getStatusColor   = (status) => ({
    on_track:    '#10b981',
    plenty_left: '#3b82f6',
    nearly_full: '#f59e0b',
    exceeded:    '#ef4444',
  }[status] || '#94a3b8');

  if (!profile) return (
    <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>👤</div>
      <div style={{ fontSize:15, fontWeight:600, color:'#0f172a', marginBottom:6 }}>Set up your profile first</div>
      <div style={{ fontSize:13 }}>Click your name in the sidebar to get started.</div>
    </div>
  );

  return (
    <div style={{ animation:'fadeUp 0.35s ease' }}>
      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:36, color:'#0f172a', marginBottom:4 }}>Food Tracker</div>
        <div style={{ fontSize:14, color:'#475569' }}>
          AI nutrition intelligence — cross-checked with your medicines{conditions.length > 0 ? ` and ${conditions.length} condition${conditions.length>1?'s':''}` : ''}
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:18 }}>
        {/* Calories */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 20px' }}>
          <div style={{ fontSize:12, color:'#94a3b8', fontWeight:500, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
            <span>Calories Today</span>
            <span style={{ color: pct > 95 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981', fontWeight:700 }}>{pct}%</span>
          </div>
          <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:30, color:'#10b981', lineHeight:1 }}>
            {Math.round(totals.calories)}<span style={{ fontSize:14, color:'#94a3b8', fontStyle:'normal', fontFamily:'inherit', marginLeft:4 }}>/ {calorieGoal} kcal</span>
          </div>
          <div style={{ marginTop:10 }}>
            <div style={{ height:6, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:99, transition:'width 0.8s ease',
                width:`${pct}%`,
                background: pct > 95 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'
              }}/>
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>
              {remaining} kcal remaining today
            </div>
          </div>
        </div>

        {/* Macros */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 20px' }}>
          <div style={{ fontSize:12, color:'#94a3b8', fontWeight:500, marginBottom:8 }}>Macros Today</div>
          <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:30, color:'#3b82f6', lineHeight:1, marginBottom:10 }}>
            {Math.round(totals.protein)}g<span style={{ fontSize:13, color:'#94a3b8', fontStyle:'normal', fontFamily:'inherit', marginLeft:4 }}>protein</span>
          </div>
          <div style={{ display:'flex', gap:14, fontSize:12 }}>
            <span><strong style={{ color:'#f59e0b' }}>{Math.round(totals.carbs)}g</strong> carbs</span>
            <span><strong style={{ color:'#10b981' }}>{Math.round(totals.fiber)}g</strong> fiber</span>
            <span><strong style={{ color:'#ef4444' }}>{Math.round(totals.fat||0)}g</strong> fat</span>
          </div>
        </div>

        {/* Water */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 20px' }}>
          <div style={{ fontSize:12, color:'#94a3b8', fontWeight:500, marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>Hydration</span><Droplet size={13} style={{ color:'#3b82f6' }}/>
          </div>
          <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:26, color:'#3b82f6', lineHeight:1, marginBottom:10 }}>
            {water}<span style={{ fontSize:14, color:'#94a3b8', fontStyle:'normal', fontFamily:'inherit' }}>/{waterGoal}</span>
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {Array.from({ length: waterGoal }).map((_, i) => (
              <button key={i} onClick={() => setWater(i + 1 === water ? i : i + 1)}
                style={{
                  width:28, height:34, borderRadius:'0 0 6px 6px',
                  border: i < water ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                  borderTop:'none', background: i < water ? 'linear-gradient(0deg,#3b82f6,#60a5fa)' : '#f8fafc',
                  cursor:'pointer', transition:'all 0.2s', padding:0
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main two-column ────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* LEFT: Upload */}
        <div>
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, background:'#ecfdf5', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'#059669' }}><Camera size={14}/></div>
              Log a Meal
            </div>

            {imgData ? (
              <div style={{ position:'relative' }}>
                <img src={imgData.dataUrl} alt="food" style={{ width:'100%', maxHeight:180, objectFit:'cover', borderRadius:10, border:'1px solid #e2e8f0', marginBottom:12, display:'block' }}/>
                <button onClick={() => setImgData(null)}
                  style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.55)', color:'white', border:'none', borderRadius:6, padding:5, cursor:'pointer', display:'flex' }}>
                  <XIcon size={13}/>
                </button>
              </div>
            ) : (
              <div style={{ position:'relative', border:'2px dashed #d1d8e0', borderRadius:12, padding:'28px 16px', textAlign:'center', cursor:'pointer', background:'#f8fafc', marginBottom:12, overflow:'hidden' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#10b981'}
                onMouseLeave={e => e.currentTarget.style.borderColor='#d1d8e0'}>
                <input type="file" accept="image/*" capture="environment" onChange={handleImg}
                  style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}/>
                <div style={{ width:46, height:46, background:'#fff', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', boxShadow:'0 2px 6px rgba(0,0,0,0.06)', color:'#059669' }}><Camera size={20}/></div>
                <div style={{ fontSize:14, fontWeight:600, color:'#0f172a', marginBottom:3 }}>Take a photo or upload</div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>Tap to use camera or select from gallery</div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Describe food <span style={{ color:'#94a3b8' }}>optional</span></label>
                <input style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', fontFamily:'inherit' }}
                  placeholder="e.g. 2 rotis with dal" value={desc} onChange={e => setDesc(e.target.value)}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Quantity <span style={{ color:'#94a3b8' }}>optional</span></label>
                <input style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', fontFamily:'inherit' }}
                  placeholder="e.g. 1 medium bowl" value={qty} onChange={e => setQty(e.target.value)}/>
              </div>
            </div>

            {conditions.length > 0 && (
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#1e40af', display:'flex', gap:6, alignItems:'flex-start' }}>
                <Info size={13} style={{ flexShrink:0, marginTop:1 }}/>
                <span>AI will check this food against your {conditions.length} condition{conditions.length>1?'s':''} and {medicines.length} medicine{medicines.length>1?'s':''}</span>
              </div>
            )}

            <button
              disabled={loading || (!imgData && !desc.trim())}
              onClick={handleAnalyze}
              style={{
                width:'100%', padding:'11px', background: (loading || (!imgData && !desc.trim())) ? '#e2e8f0' : '#10b981',
                color: (loading || (!imgData && !desc.trim())) ? '#94a3b8' : 'white',
                border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor: (loading || (!imgData && !desc.trim())) ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all 0.2s'
              }}>
              <Sparkles size={15}/>{loading ? 'Analyzing...' : 'Analyze with AI'}
            </button>
          </div>
        </div>

        {/* RIGHT: Results + Interactions */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {loading && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22, animation:'fadeIn 0.2s ease' }}>
              <LoadingSpinner text="Analyzing nutritional content..." />
            </div>
          )}

          {analysis && !loading && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22, animation:'fadeUp 0.35s ease' }}>
              {aiNotice && (
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'9px 11px', fontSize:12, color:'#92400e', marginBottom:12 }}>
                  {aiNotice}
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:26, height:26, background:'#ecfdf5', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'#059669' }}><Sparkles size={14}/></div>
                  AI Analysis
                </div>
                <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background: analysis.confidence==='high'?'#ecfdf5':analysis.confidence==='medium'?'#fffbeb':'#fef2f2', color: analysis.confidence==='high'?'#059669':analysis.confidence==='medium'?'#b45309':'#dc2626' }}>
                  {analysis.confidence} confidence
                </span>
              </div>

              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:20, color:'#0f172a', marginBottom:12 }}>{analysis.food_name}</div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
                {[
                  { val:analysis.calories, unit:'kcal', label:'Calories', color:'#ef4444' },
                  { val:`${analysis.protein}g`, unit:'protein', label:'Protein', color:'#3b82f6' },
                  { val:`${analysis.carbs}g`, unit:'carbs', label:'Carbs', color:'#f59e0b' },
                  { val:`${analysis.fiber}g`, unit:'fiber', label:'Fiber', color:'#10b981' },
                ].map(n => (
                  <div key={n.label} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 8px', textAlign:'center' }}>
                    <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:22, color:n.color, lineHeight:1 }}>{n.val}</div>
                    <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>{n.unit}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#475569', marginTop:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>{n.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#1e40af', marginBottom:14, display:'flex', gap:7, alignItems:'flex-start' }}>
                <span style={{ fontSize:15, flexShrink:0 }}>💡</span><span>{analysis.portion_note}</span>
              </div>

              {analysis.alternative_foods?.length > 0 && (
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#92400e', marginBottom:14 }}>
                  <strong>Confused? Could this be:</strong> {analysis.alternative_foods.join(', ')}?
                  <button onClick={() => setCorrectingId('new')} style={{ marginLeft:8, color:'#b45309', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontSize:12, textDecoration:'underline' }}>Correct it</button>
                </div>
              )}

              {/* This is where user confirms */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleAccept}
                  style={{ flex:1, padding:'10px', background:'#10b981', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <Check size={14}/>Add to Log
                </button>
                <button onClick={() => setAnalysis(null)}
                  style={{ padding:'10px 14px', background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0', borderRadius:9, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <XIcon size={13}/>Discard
                </button>
              </div>
            </div>
          )}

          {/* ── CROSS-MODULE INTERACTION RESULT ── */}
          {checkLoading && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22 }}>
              <LoadingSpinner text="Checking food–medicine interactions..." color="#f59e0b"/>
            </div>
          )}

          {interactions && !checkLoading && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22, animation:'fadeUp 0.35s ease' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:26, height:26, background:'#fef2f2', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}><AlertTriangle size={14}/></div>
                Health Intelligence Check
              </div>

              {/* Medicine/condition warnings */}
              {interactions.food_medicine_warnings?.length > 0 ? (
                <div style={{ marginBottom:14 }}>
                  {interactions.food_medicine_warnings.map((w, i) => (
                    <div key={i} style={{
                      background: w.severity==='high'?'#fef2f2':w.severity==='medium'?'#fffbeb':'#f0fdf4',
                      border:`1px solid ${w.severity==='high'?'#fecaca':w.severity==='medium'?'#fde68a':'#bbf7d0'}`,
                      borderRadius:10, padding:'11px 13px', marginBottom:8,
                      display:'flex', gap:10, alignItems:'flex-start'
                    }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{w.severity==='high'?'🚨':w.severity==='medium'?'⚠️':'ℹ️'}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color: getSeverityColor(w.severity), marginBottom:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                          {w.medicine}
                        </div>
                        <div style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>{w.warning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', borderRadius:10, padding:'11px 13px', marginBottom:14, display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:16 }}>✅</span>
                  <span style={{ fontSize:13, color:'#065f46', fontWeight:500 }}>No food–medicine conflicts detected for this meal.</span>
                </div>
              )}

              {/* Calorie advice */}
              {interactions.calorie_advice && (
                <div style={{
                  background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'13px 15px'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:14 }}>🎯</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>Next Meal Suggestion</span>
                    <span style={{ marginLeft:'auto', padding:'2px 9px', borderRadius:99, fontSize:10, fontWeight:600, background: getStatusColor(interactions.calorie_advice.status)+'22', color: getStatusColor(interactions.calorie_advice.status) }}>
                      {interactions.calorie_advice.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:'#374151', lineHeight:1.55, marginBottom: interactions.calorie_advice.avoid ? 8 : 0 }}>
                    {interactions.calorie_advice.next_meal_suggestion}
                  </div>
                  {interactions.calorie_advice.avoid && (
                    <div style={{ fontSize:12, color:'#b45309', marginTop:6, display:'flex', gap:5, alignItems:'flex-start' }}>
                      <span style={{ flexShrink:0 }}>⚠ Avoid:</span>
                      <span>{interactions.calorie_advice.avoid}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!analysis && !loading && !interactions && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:12 }}>How cross-module AI works</div>
              {[
                { icon:'📸', t:'Snap your food', d:'AI identifies the dish and estimates portion size' },
                { icon:'⚕️', t:'Medicine check', d:'AI checks if the food conflicts with your medicines or conditions' },
                { icon:'🎯', t:'Calorie guidance', d:'AI suggests what to eat next based on your remaining daily limit' },
                { icon:'⚠️', t:'Allergy alert', d:'AI warns you if food contains your flagged allergens' },
              ].map((it, i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i<3?'1px solid #f1f5f9':'none' }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{it.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', marginBottom:2 }}>{it.t}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5 }}>{it.d}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Today's Log ─────────────────────────── */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22, marginTop:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, background:'#f8fafc', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}><Edit3 size={14}/></div>
          Today's Food Log
          <span style={{ color:'#94a3b8', fontWeight:500, fontSize:13 }}>· {foodLog.length} entries</span>
        </div>

        {foodLog.length === 0 ? (
          <div style={{ textAlign:'center', padding:'30px 20px', color:'#94a3b8' }}>
            <div style={{ fontSize:28, marginBottom:8, opacity:0.5 }}>🍽️</div>
            <div style={{ fontSize:14 }}>No meals logged yet — snap a photo above</div>
          </div>
        ) : (
          foodLog.map(entry => (
            <div key={entry.id}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11, flex:1, minWidth:0 }}>
                  {entry.thumb
                    ? <img src={entry.thumb} alt="" style={{ width:38, height:38, borderRadius:9, objectFit:'cover', flexShrink:0 }}/>
                    : <div style={{ width:38, height:38, background:'#f8fafc', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🍽️</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{entry.food_name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                      {new Date(entry.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                      {' · '}{entry.protein}g P · {entry.carbs}g C · {entry.fiber}g F
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:17, color:'#0f172a' }}>
                    {entry.calories}<span style={{ fontSize:11, color:'#94a3b8', fontStyle:'normal', fontFamily:'inherit', marginLeft:2 }}>kcal</span>
                  </span>
                  <button onClick={() => setCorrectingId(correctingId===entry.id?null:entry.id)}
                    style={{ padding:'4px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#fffbeb', color:'#b45309', border:'1px solid #fde68a', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    <Edit3 size={10}/>Correct
                  </button>
                  <button onClick={() => removeFoodEntry(entry.id)}
                    style={{ padding:6, background:'none', border:'none', color:'#94a3b8', cursor:'pointer', display:'flex' }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>

              {correctingId === entry.id && (
                <div style={{ padding:'14px 0', borderBottom:'1px dashed #e2e8f0' }}>
                  <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, padding:'10px 13px', marginBottom:10, fontSize:12, color:'#92400e', display:'flex', gap:7 }}>
                    <span style={{ flexShrink:0 }}>✏️</span>
                    <span>AI identified this as <strong>{entry.food_name}</strong>.
                      {entry.alternative_foods?.length > 0 && <> Could it be: <strong>{entry.alternative_foods.join(', ')}</strong>?</>}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', color:'#0f172a' }}
                      placeholder="Type the correct food name" value={correctName} onChange={e => setCorrectName(e.target.value)}/>
                    <button disabled={!correctName.trim()||correctLoading} onClick={() => handleCorrect(entry.id)}
                      style={{ padding:'9px 16px', background: correctLoading||!correctName.trim()?'#e2e8f0':'#10b981', color: correctLoading||!correctName.trim()?'#94a3b8':'white', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor: correctLoading||!correctName.trim()?'not-allowed':'pointer' }}>
                      {correctLoading?'Updating...':'Re-analyze'}
                    </button>
                    <button onClick={() => { setCorrectingId(null); setCorrectName(''); }}
                      style={{ padding:'9px 13px', background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
