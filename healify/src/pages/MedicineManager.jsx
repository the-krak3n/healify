import { useState } from 'react';
import { Plus, Check, X, ChevronRight, Sparkles, Trash2, AlertTriangle, Clock, Minus, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMedicineInfo } from '../utils/gemini';
import LoadingSpinner from '../components/LoadingSpinner';
import MedicineAnalyticsModal from '../components/MedicineAnalyticsModal';

// Frequency presets -> default time slots with smart labels
const FREQUENCY_PRESETS = {
  once:   { label: 'Once a day',          slots: [{ label: 'Dose time',     default: '09:00' }] },
  twice:  { label: 'Twice a day',         slots: [{ label: 'Morning dose',  default: '08:00' }, { label: 'Evening dose', default: '20:00' }] },
  thrice: { label: 'Three times a day',   slots: [{ label: 'Morning dose',  default: '08:00' }, { label: 'Afternoon dose', default: '14:00' }, { label: 'Night dose', default: '20:00' }] },
  four:   { label: 'Four times a day',    slots: [{ label: 'Morning dose',  default: '08:00' }, { label: 'Afternoon dose', default: '13:00' }, { label: 'Evening dose', default: '18:00' }, { label: 'Night dose', default: '22:00' }] },
  custom: { label: 'Custom',              slots: [] },
};

const formatTime12 = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2,'0')} ${period}`;
};

export default function MedicineManager() {
  const {
    medicines, foodLog, addMedicine, removeMedicine, markDose, getTodayDoses, profile,
    getAdherence, getMissedCount, getWeeklyHistory, getOverallAdherence
  } = useApp();

  const [showAdd, setShowAdd]     = useState(false);
  const [detailId, setDetailId]   = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analyticsMed, setAnalyticsMed] = useState(null);

  const conditions = profile?.conditions || [];
  const overall    = getOverallAdherence(7);
  const alertMeds  = medicines.filter(m => getMissedCount(m, 7) >= 3);

  const handleLearnMore = async (med) => {
    if (detailId === med.id) { setDetailId(null); setDetailData(null); return; }
    setDetailId(med.id);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const info = await getMedicineInfo(`${med.name} ${med.strength}`.trim(), foodLog.slice(0, 5));
      setDetailData(info);
    } catch (err) {
      alert('Error: ' + err.message);
      setDetailId(null);
    }
    setDetailLoading(false);
  };

  const handleDelete = (med) => {
    if (!window.confirm(`Remove ${med.name}? This will delete its dose history and reminders.`)) return;
    removeMedicine(med.id);
    if (detailId === med.id) { setDetailId(null); setDetailData(null); }
  };

  const sevColor = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };
  const adherenceColor = (pct) => pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ animation:'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:36, color:'#0f172a', marginBottom:4 }}>Medicine Manager</div>
          <div style={{ fontSize:14, color:'#475569' }}>
            Track every dose individually · AI drug intelligence · Cross-checks with your food log
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding:'9px 18px', background:'#10b981', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
          <Plus size={15}/> Add Medicine
        </button>
      </div>

      {/* ADHERENCE OVERVIEW */}
      {medicines.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 20px', marginBottom:14, display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ position:'relative', width:72, height:72, flexShrink:0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="#f1f5f9" strokeWidth="7"/>
              <circle
                cx="36" cy="36" r="30" fill="none"
                stroke={adherenceColor(overall.percent)}
                strokeWidth="7"
                strokeDasharray={`${2*Math.PI*30}`}
                strokeDashoffset={`${2*Math.PI*30 * (1 - overall.percent/100)}`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
                style={{ transition:'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:adherenceColor(overall.percent) }}>
              {overall.percent}%
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:3 }}>Weekly Adherence Score</div>
            <div style={{ fontSize:13, color:'#94a3b8' }}>
              {overall.missed === 0
                ? 'Great job! No missed doses this week.'
                : `You missed ${overall.missed} dose${overall.missed > 1 ? 's' : ''} this week (across all medicines).`}
            </div>
          </div>
        </div>
      )}

      {/* ADHERENCE ALERTS */}
      {alertMeds.length > 0 && (
        <div style={{ marginBottom:14 }}>
          {alertMeds.map(m => (
            <div key={m.id} style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px', marginBottom:8, display:'flex', gap:10, alignItems:'flex-start' }}>
              <AlertTriangle size={16} style={{ color:'#ef4444', flexShrink:0, marginTop:1 }}/>
              <div style={{ fontSize:13, color:'#991b1b' }}>
                <strong>Adherence Alert:</strong> You have missed {getMissedCount(m, 7)} dose{getMissedCount(m,7)>1?'s':''} of <strong>{m.name}</strong> this week (adherence: {getAdherence(m, 7)}%).
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conditions banner */}
      {conditions.length > 0 && (
        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'12px 16px', marginBottom:18, display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>🏥</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1e40af', marginBottom:3 }}>Active medical conditions detected</div>
            <div style={{ fontSize:12, color:'#1e40af', opacity:0.8 }}>{conditions.join(' · ')}</div>
            <div style={{ fontSize:12, color:'#3b82f6', marginTop:4 }}>
              When you tap "Learn More" on any medicine, AI will check if your recent foods conflict with it.
            </div>
          </div>
        </div>
      )}

      {medicines.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:50, textAlign:'center', color:'#94a3b8' }}>
          <div style={{ fontSize:36, marginBottom:12, opacity:0.5 }}>💊</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#0f172a', marginBottom:4 }}>No medicines added yet</div>
          <div style={{ fontSize:13 }}>Click "Add Medicine" to set up your first reminder schedule.</div>
        </div>
      ) : (
        medicines.map(med => {
          const adherence = getAdherence(med, 7);
          const missed7 = getMissedCount(med, 7);
          const weekHistory = getWeeklyHistory(med);
          const todayDoses = getTodayDoses(med);
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

          return (
          <div key={med.id} style={{ marginBottom:12 }}>
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>

              {/* Row 1: Name + strength + adherence + delete */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:12, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:42, height:42, background:'#fffbeb', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, border:'1px solid #fde68a' }}>💊</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>
                      {med.name}{med.strength && <span style={{ color:'#94a3b8', fontWeight:500 }}> · {med.strength}</span>}
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                      {FREQUENCY_PRESETS[med.frequency]?.label || `${(med.times||[]).length}x daily`} · {(med.times||[]).map(formatTime12).join(', ')}
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ textAlign:'center', padding:'6px 12px', borderRadius:9, background:'#f8fafc', border:'1px solid #e2e8f0', minWidth:62 }}>
                    <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:18, fontWeight:700, color: adherenceColor(adherence), lineHeight:1 }}>
                      {adherence}%
                    </div>
                    <div style={{ fontSize:8, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>
                      adherence
                    </div>
                  </div>
                  <button onClick={() => handleDelete(med)} title="Remove medicine"
                    style={{ width:36, height:36, borderRadius:9, background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>

              {/* Row 2: TODAY'S DOSES — each independent */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', color:'#94a3b8', fontWeight:600, marginBottom:8 }}>
                  Today's Doses
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {todayDoses.map((dose, i) => {
                    const statusStyle = {
                      taken:    { bg:'#ecfdf5', border:'#bbf7d0', text:'#059669', label:'✓ Taken' },
                      skipped:  { bg:'#fffbeb', border:'#fde68a', text:'#b45309', label:'⏭ Skipped' },
                      pending:  { bg:'#eff6ff', border:'#bfdbfe', text:'#3b82f6', label:'⏰ Due now' },
                      upcoming: { bg:'#f8fafc', border:'#e2e8f0', text:'#94a3b8', label:'Upcoming' },
                    }[dose.status];

                    return (
                      <div key={i} style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'10px 14px', borderRadius:9,
                        background: statusStyle.bg, border:`1px solid ${statusStyle.border}`
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Clock size={14} style={{ color: statusStyle.text }}/>
                          <span style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{formatTime12(dose.time)}</span>
                          <span style={{
                            padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700,
                            background:'rgba(255,255,255,0.6)', color: statusStyle.text
                          }}>
                            {statusStyle.label}
                          </span>
                        </div>

                        {dose.status !== 'upcoming' && (
                          <div style={{ display:'flex', gap:6 }}>
                            <button
                              onClick={() => markDose(med.id, todayKey, dose.time, 'taken')}
                              style={{
                                padding:'6px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
                                background: dose.status==='taken' ? '#10b981' : '#fff',
                                color: dose.status==='taken' ? '#fff' : '#059669',
                                border:'1.5px solid #10b981',
                                display:'flex', alignItems:'center', gap:4
                              }}>
                              <Check size={12}/> Taken
                            </button>
                            <button
                              onClick={() => markDose(med.id, todayKey, dose.time, 'skipped')}
                              style={{
                                padding:'6px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
                                background: dose.status==='skipped' ? '#f59e0b' : '#fff',
                                color: dose.status==='skipped' ? '#fff' : '#b45309',
                                border:'1.5px solid #f59e0b',
                                display:'flex', alignItems:'center', gap:4
                              }}>
                              <X size={12}/> Skip
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: 7-day history dots */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#f8fafc', borderRadius:9, marginBottom:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', color:'#94a3b8', fontWeight:600, marginBottom:5 }}>
                    Last 7 days {missed7 > 0 && <span style={{ color:'#ef4444' }}>· {missed7} dose{missed7>1?'s':''} missed</span>}
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {weekHistory.map((d, i) => {
                      const dotColor = d.status==='taken' ? '#10b981' : d.status==='missed' ? '#ef4444' : d.status==='partial' ? '#f59e0b' : '#e2e8f0';
                      const label = d.date.toLocaleDateString([], { weekday:'narrow' });
                      return (
                        <div key={i} title={d.date.toLocaleDateString()} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                          <div style={{ width:18, height:18, borderRadius:4, background:dotColor }}/>
                          <span style={{ fontSize:8, color:'#cbd5e1' }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 4: Learn More + Analytics */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => handleLearnMore(med)}
                  style={{
                    flex:1, padding:'9px 16px',
                    background: detailId===med.id ? '#8b5cf6' : '#f5f3ff',
                    color: detailId===med.id ? '#fff' : '#7c3aed',
                    border:'1px solid #c4b5fd',
                    borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.2s'
                  }}>
                  <Sparkles size={13}/> Learn More
                  <ChevronRight size={12} style={{ transform: detailId===med.id?'rotate(90deg)':'none', transition:'transform 0.2s' }}/>
                </button>
                <button onClick={() => setAnalyticsMed(med)}
                  style={{
                    flex:1, padding:'9px 16px',
                    background:'#eff6ff', color:'#3b82f6', border:'1px solid #bfdbfe',
                    borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.2s'
                  }}>
                  <BarChart3 size={13}/> Medication Analytics
                </button>
              </div>
            </div>

            {/* Detail Panel */}
            {detailId === med.id && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderTop:'3px solid #8b5cf6', borderRadius:'0 0 14px 14px', padding:22, marginTop:-6, animation:'fadeUp 0.3s ease' }}>
                {detailLoading ? (
                  <LoadingSpinner text="Fetching drug information + checking your recent meals..." color="#8b5cf6"/>
                ) : detailData ? (
                  <div>
                    <div style={{ marginBottom:18 }}>
                      <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:22, color:'#0f172a', marginBottom:6 }}>{med.name}</div>
                      <span style={{ padding:'3px 11px', borderRadius:99, fontSize:11, fontWeight:600, background:'#f5f3ff', color:'#7c3aed' }}>{detailData.drug_class}</span>
                    </div>

                    {detailData.recent_food_warnings?.length > 0 && (
                      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'14px 16px', marginBottom:18 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#991b1b', marginBottom:10, display:'flex', alignItems:'center', gap:7 }}>
                          <AlertTriangle size={14}/> ⚠ Recent Food Conflicts Detected
                        </div>
                        {detailData.recent_food_warnings.map((w, i) => (
                          <div key={i} style={{ display:'flex', gap:8, padding:'7px 0', borderBottom: i<detailData.recent_food_warnings.length-1?'1px solid #fecaca':'none', fontSize:13, color:'#7f1d1d' }}>
                            <span style={{ color:'#ef4444', flexShrink:0 }}>🚨</span>
                            <div><strong>{w.food}:</strong> {w.warning}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                      <div>
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Generic Name</div>
                          <div style={{ fontSize:14, color:'#0f172a' }}>{detailData.generic_name}</div>
                        </div>
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Composition</div>
                          <div style={{ fontSize:14, color:'#0f172a' }}>{detailData.composition}</div>
                        </div>
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>How to Take</div>
                          <div style={{ fontSize:13, color:'#475569' }}>{detailData.how_to_take}</div>
                        </div>
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Used For</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                            {detailData.uses?.map((u, i) => (
                              <span key={i} style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#eff6ff', color:'#3b82f6' }}>{u}</span>
                            ))}
                          </div>
                        </div>

                        {detailData.food_interactions?.length > 0 && (
                          <div>
                            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Foods to Avoid with This Medicine</div>
                            {detailData.food_interactions.map((fi, i) => (
                              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i<detailData.food_interactions.length-1?'1px solid #f1f5f9':'none' }}>
                                <div>
                                  <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{fi.food}</div>
                                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{fi.reason}</div>
                                </div>
                                <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:600, background: fi.severity==='high'?'#fef2f2':fi.severity==='medium'?'#fffbeb':'#ecfdf5', color: fi.severity==='high'?'#dc2626':fi.severity==='medium'?'#b45309':'#059669', flexShrink:0, marginLeft:8 }}>
                                  {fi.severity}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Side Effects</div>
                          {detailData.side_effects?.map((e, i) => (
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i<detailData.side_effects.length-1?'1px solid #f1f5f9':'none', fontSize:13 }}>
                              <span style={{ color:'#0f172a' }}>{e.name}</span>
                              <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:600, background: e.severity==='high'?'#fef2f2':e.severity==='medium'?'#fffbeb':'#ecfdf5', color: sevColor[e.severity]||'#94a3b8', flexShrink:0, marginLeft:8 }}>
                                {e.severity==='high'?'Severe':e.severity==='med'||e.severity==='medium'?'Moderate':'Mild'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Cheaper Alternatives (Same Composition)</div>
                          {detailData.alternatives?.map((alt, i) => (
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#f8fafc', borderRadius:9, marginBottom:6, border:'1px solid #e2e8f0' }}>
                              <div>
                                <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{alt.brand}</div>
                                <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{alt.company}</div>
                              </div>
                              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:17, color:'#059669' }}>{alt.price}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, padding:'10px 12px', marginTop:12, fontSize:12, color:'#92400e', lineHeight:1.6 }}>
                          <strong>⚠ </strong>{detailData.warning}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )})
      )}

      {showAdd && <AddMedicineModal onClose={() => setShowAdd(false)} onSave={med => { addMedicine(med); setShowAdd(false); }}/>}
      {analyticsMed && <MedicineAnalyticsModal medicine={analyticsMed} onClose={() => setAnalyticsMed(null)}/>}
    </div>
  );
}

// ════════════════════════════════════════════════
// Add Medicine Modal — redesigned multi-step flow
// ════════════════════════════════════════════════
function AddMedicineModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [customCount, setCustomCount] = useState(2);
  const [times, setTimes] = useState(FREQUENCY_PRESETS.once.slots.map(s => s.default));

  const handleFrequencyChange = (freq) => {
    setFrequency(freq);
    if (freq === 'custom') {
      setTimes(Array.from({ length: customCount }, (_, i) => '08:00'));
    } else {
      setTimes(FREQUENCY_PRESETS[freq].slots.map(s => s.default));
    }
  };

  const handleCustomCountChange = (delta) => {
    const next = Math.max(1, Math.min(6, customCount + delta));
    setCustomCount(next);
    setTimes(prev => {
      const arr = [...prev];
      while (arr.length < next) arr.push('08:00');
      return arr.slice(0, next);
    });
  };

  const updateTime = (idx, val) => {
    setTimes(prev => prev.map((t, i) => i === idx ? val : t));
  };

  const slotLabels = frequency === 'custom'
    ? times.map((_, i) => `Dose ${i+1} time`)
    : FREQUENCY_PRESETS[frequency].slots.map(s => s.label);

  const handleSave = () => {
    if (!name.trim()) { alert('Enter a medicine name.'); return; }
    if (times.length === 0 || times.some(t => !t)) { alert('Set a time for every dose.'); return; }
    // Check for duplicate times
    const unique = new Set(times);
    if (unique.size !== times.length) { alert('Each dose must have a different time.'); return; }

    onSave({ name: name.trim(), strength: strength.trim(), frequency, times });
  };

  const inputStyle = { width:'100%', padding:'9px 13px', border:'1.5px solid #e2e8f0', borderRadius:8, fontFamily:'inherit', fontSize:14, color:'#0f172a', background:'#fff', outline:'none' };
  const labelStyle = { display:'block', fontSize:13, fontWeight:500, color:'#475569', marginBottom:5 };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(15,23,42,0.15)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:24, color:'#0f172a', marginBottom:4 }}>Add Medication</div>
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>Each dose gets its own reminder and tracking</div>

        {/* 1. Name */}
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>1. Medicine Name *</label>
          <input style={inputStyle} placeholder="e.g. Paracetamol" value={name} onChange={e => setName(e.target.value)}/>
        </div>

        {/* 2. Strength */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>2. Strength / Dosage</label>
          <input style={inputStyle} placeholder="e.g. 500mg" value={strength} onChange={e => setStrength(e.target.value)}/>
        </div>

        {/* 3. Frequency */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>3. Frequency per day</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {Object.entries(FREQUENCY_PRESETS).map(([key, preset]) => (
              <button key={key} onClick={() => handleFrequencyChange(key)}
                style={{
                  padding:'9px 12px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left',
                  background: frequency===key ? '#ecfdf5' : '#f8fafc',
                  border: frequency===key ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                  color: frequency===key ? '#059669' : '#475569',
                }}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom count stepper */}
        {frequency === 'custom' && (
          <div style={{ marginBottom:16 }}>
            <label style={labelStyle}>Number of doses per day</label>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={() => handleCustomCountChange(-1)}
                style={{ width:34, height:34, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Minus size={15}/>
              </button>
              <span style={{ fontSize:18, fontWeight:700, color:'#0f172a', minWidth:24, textAlign:'center' }}>{customCount}</span>
              <button onClick={() => handleCustomCountChange(1)}
                style={{ width:34, height:34, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Plus size={15}/>
              </button>
            </div>
          </div>
        )}

        {/* 4. Time slots — each independent */}
        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>4. Set time for each dose</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {times.map((time, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:9, padding:'8px 12px' }}>
                <Clock size={14} style={{ color:'#94a3b8', flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'#475569', flex:1 }}>{slotLabels[i]}</span>
                <input type="time" value={time} onChange={e => updateTime(i, e.target.value)}
                  style={{ border:'1.5px solid #e2e8f0', borderRadius:7, padding:'6px 10px', fontSize:13, fontFamily:'inherit', color:'#0f172a' }}/>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:8 }}>
            Each dose will have its own reminder and its own Taken/Skip tracking.
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleSave}
            style={{ flex:1, padding:'12px', background:'#10b981', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <Plus size={15}/> Add Medicine
          </button>
          <button onClick={onClose}
            style={{ padding:'12px 18px', background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0', borderRadius:10, fontSize:14, cursor:'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
