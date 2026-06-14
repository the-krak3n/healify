import { useState } from 'react';
import { AlertTriangle, Camera, Sparkles, X as XIcon, Phone, Shield, ListChecks } from 'lucide-react';
import { getEmergencyHelp, fileToBase64 } from '../utils/gemini';
import { useApp } from '../context/AppContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function EmergencyCare() {
  const { profile, medicines } = useApp();
  const [imgData, setImgData]  = useState(null);
  const [desc, setDesc]        = useState('');
  const [loading, setLoading]  = useState(false);
  const [result, setResult]    = useState(null);
  const [notice, setNotice]    = useState('');

  const conditions = profile?.conditions || [];
  const allergies  = profile?.allergies  || [];

  const handleImg = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { setImgData(await fileToBase64(f)); }
    catch { alert('Failed to read image'); }
  };

  const handleAnalyze = async (overrideText) => {
    const description = overrideText || desc;
    if (!description.trim() && !imgData) {
      alert('Describe the emergency or upload a photo.');
      return;
    }
    if (overrideText) setDesc(overrideText);
    setLoading(true); setResult(null); setNotice('');
    try {
      const r = await getEmergencyHelp({
        description,
        imageBase64: imgData?.base64,
        imageMime:   imgData?.mimeType,
        conditions:  [...conditions, ...allergies.map(a => `${a} allergy`)],
        medicines:   medicines.filter(m => m.status !== 'missed'),
      });
      setResult(r);
      if (r._fallback) setNotice('Live AI guidance is unavailable. Showing the safest general emergency guidance.');
    } catch {
      setNotice('Emergency guidance could not be loaded. Call 112 or 108 if the situation may be serious.');
    } finally {
      setLoading(false);
    }
  };

  const quickItems = [
    {e:'🐝',t:'Bee sting, swelling on arm'},
    {e:'🔥',t:'Minor burn from hot pan'},
    {e:'🩸',t:'Deep cut with bleeding'},
    {e:'😮',t:'Person choking on food'},
    {e:'😵',t:'Person fainted, unconscious'},
    {e:'🦶',t:'Sprained ankle from fall'},
    {e:'🩺',t:'Nose bleed not stopping'},
    {e:'👁',t:'Chemical splash in eye'},
    {e:'🐍',t:'Snake bite on leg'},
    {e:'⚡',t:'Electric shock injury'},
  ];

  const sevBg  = { mild:'#ecfdf5', moderate:'#fffbeb', severe:'#fef2f2' };
  const sevBdr = { mild:'#bbf7d0', moderate:'#fde68a', severe:'#fecaca' };
  const sevClr = { mild:'#065f46', moderate:'#92400e', severe:'#991b1b' };

  return (
    <div style={{ animation:'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:36, color:'#0f172a', marginBottom:4 }}>Emergency Care</div>
        <div style={{ fontSize:14, color:'#475569' }}>AI first-aid guidance — personalised to your medical profile</div>
      </div>

      {/* Emergency banner */}
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'14px 18px', marginBottom:18, display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ fontSize:22, flexShrink:0 }}>🚨</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#991b1b', marginBottom:3 }}>For life-threatening emergencies, call 112 immediately</div>
          <div style={{ fontSize:12, color:'#b91c1c', opacity:0.85 }}>
            India: <strong>112</strong> (National) · <strong>108</strong> (Ambulance) · <strong>1066</strong> (Poison Control). This tool provides guidance only.
          </div>
        </div>
      </div>

      {/* Medical profile context shown to user */}
      {(conditions.length > 0 || allergies.length > 0) && (
        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'12px 16px', marginBottom:18, fontSize:13, color:'#1e40af' }}>
          <div style={{ fontWeight:600, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
            <Shield size={13}/> Your medical profile is active — AI will personalise first-aid advice
          </div>
          {conditions.length > 0 && <div style={{ marginBottom:2 }}>Conditions: {conditions.join(' · ')}</div>}
          {allergies.length > 0  && <div>Allergies: {allergies.join(' · ')}</div>}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* LEFT: Input */}
        <div>
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:26, height:26, background:'#fef2f2', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}><AlertTriangle size={14}/></div>
              Describe the Emergency
            </div>

            {imgData && (
              <div style={{ position:'relative', marginBottom:14 }}>
                <img src={imgData.dataUrl} alt="emergency" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:10, border:'1px solid #e2e8f0', display:'block' }}/>
                <button onClick={() => setImgData(null)} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.55)', color:'white', border:'none', borderRadius:6, padding:5, cursor:'pointer', display:'flex' }}>
                  <XIcon size={13}/>
                </button>
              </div>
            )}

            {!imgData && (
              <div style={{ position:'relative', border:'2px dashed #e2e8f0', borderRadius:10, padding:'18px 16px', textAlign:'center', cursor:'pointer', background:'#f8fafc', marginBottom:14, overflow:'hidden' }}>
                <input type="file" accept="image/*" capture="environment" onChange={handleImg} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}/>
                <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:'#fef2f2', color:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center' }}><Camera size={17}/></div>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>Upload a photo</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>Optional — helps AI assess better</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Describe what happened *</label>
              <textarea
                style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontFamily:'inherit', fontSize:13, color:'#0f172a', outline:'none', resize:'vertical', minHeight:80, lineHeight:1.55 }}
                placeholder="e.g. My friend got stung by a bee on the arm, swelling is starting..."
                value={desc} onChange={e => setDesc(e.target.value)}
              />
            </div>

            <button disabled={loading || (!desc.trim() && !imgData)} onClick={() => handleAnalyze()}
              style={{
                width:'100%', padding:'12px', background: (loading||(!desc.trim()&&!imgData)) ? '#e2e8f0' : '#ef4444',
                color: (loading||(!desc.trim()&&!imgData)) ? '#94a3b8' : 'white',
                border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor: (loading||(!desc.trim()&&!imgData)) ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:7
              }}>
              <Sparkles size={15}/>{loading ? 'Generating protocol...' : 'Get First Aid Instructions'}
            </button>
          </div>

          {/* Quick select */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:26, height:26, background:'#f8fafc', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}><ListChecks size={14}/></div>
              Quick Select
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
              {quickItems.map((q, i) => (
                <button key={i} onClick={() => handleAnalyze(q.t)}
                  style={{ padding:'8px 11px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontFamily:'inherit', fontSize:12, fontWeight:500, color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', gap:7, transition:'all 0.15s', textAlign:'left' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#ef4444'; e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='#fef2f2'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#475569'; e.currentTarget.style.background='#fff'; }}>
                  <span style={{ fontSize:15 }}>{q.e}</span>
                  <span>{q.t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Result */}
        <div>
          {loading && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22 }}>
              <LoadingSpinner text="Generating personalised first-aid protocol..." color="#ef4444"/>
            </div>
          )}

          {result && !loading && (
            <div style={{ animation:'fadeUp 0.35s ease' }}>
              {notice && (
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 12px', marginBottom:12, fontSize:12, color:'#92400e' }}>
                  {notice}
                </div>
              )}
              {/* Severity banner */}
              <div style={{ background:sevBg[result.severity]||'#f8fafc', border:`1px solid ${sevBdr[result.severity]||'#e2e8f0'}`, borderRadius:14, padding:'16px 18px', marginBottom:14, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:28 }}>{result.severity==='severe'?'🚨':result.severity==='moderate'?'⚠️':'✅'}</span>
                  <div>
                    <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:19, color:sevClr[result.severity], lineHeight:1.2 }}>{result.emergency_type}</div>
                    <div style={{ fontSize:12, color:sevClr[result.severity], opacity:0.8, marginTop:3 }}>
                      <strong style={{ textTransform:'uppercase', letterSpacing:'0.05em' }}>{result.severity}</strong> · {result.severity_reason}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setResult(null); setDesc(''); setImgData(null); }}
                  style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', display:'flex', padding:4 }}>
                  <XIcon size={15}/>
                </button>
              </div>

              {/* Condition-specific alerts — the unique feature */}
              {result.condition_alerts?.length > 0 && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'13px 16px', marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#991b1b', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <Shield size={13}/> Special Alert — Based on Your Medical Profile
                  </div>
                  {result.condition_alerts.map((alert, i) => (
                    <div key={i} style={{ fontSize:13, color:'#7f1d1d', padding:'5px 0', borderBottom: i<result.condition_alerts.length-1?'1px solid #fecaca':'none', display:'flex', gap:8 }}>
                      <span style={{ color:'#ef4444', flexShrink:0 }}>⚠</span>
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Steps */}
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:20, marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:24, height:24, background:'#ecfdf5', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#059669' }}><ListChecks size={13}/></div>
                  First Aid Steps
                </div>
                {result.steps.map((step, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i<result.steps.length-1?'1px solid #f1f5f9':'none', alignItems:'flex-start' }}>
                    <div style={{ width:26, height:26, background:'#10b981', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, marginTop:1 }}>{i+1}</div>
                    <div style={{ fontSize:13, color:'#0f172a', lineHeight:1.6, flex:1 }}>{step.replace(/^Step \d+:\s*/,'')}</div>
                  </div>
                ))}
              </div>

              {/* Don't do */}
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:20, marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:24, height:24, background:'#fef2f2', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444', fontSize:14, fontWeight:700 }}>✕</div>
                  Things You Should NOT Do
                </div>
                {result.do_not.map((d, i) => (
                  <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom: i<result.do_not.length-1?'1px solid #f1f5f9':'none', alignItems:'flex-start' }}>
                    <div style={{ width:22, height:22, background:'#fef2f2', color:'#ef4444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, marginTop:1 }}>✕</div>
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.55, flex:1 }}>{d}</div>
                  </div>
                ))}
              </div>

              {/* When to see doctor */}
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'14px 16px', display:'flex', gap:11, alignItems:'flex-start' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>🏥</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#92400e', marginBottom:4 }}>When to seek emergency care</div>
                  <div style={{ fontSize:13, color:'#92400e', lineHeight:1.55 }}>{result.see_doctor}</div>
                  <div style={{ marginTop:10, fontSize:11, color:'#b45309', fontWeight:600 }}>
                    🇮🇳 India: 112 (National) · 108 (Ambulance) · 1066 (Poison Control)
                  </div>
                </div>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:22 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:26, height:26, background:'#f8fafc', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}><Sparkles size={14}/></div>
                What makes Emergency Care smarter
              </div>
              {[
                { icon:'🏥', t:'Profile-aware advice', d:'AI knows your conditions — e.g. if you have diabetes, emergency protocols are adjusted accordingly' },
                { icon:'💊', t:'Medicine-aware protocol', d:'If you are on blood thinners, AI includes specific warnings relevant to your medications' },
                { icon:'⚠️', t:'Allergy-sensitive', d:'Your registered allergies are factored into emergency assessment and treatment suggestions' },
                { icon:'📋', t:'Structured output', d:'Numbered steps + DO NOT DO list + when-to-go-to-hospital, all in one response' },
              ].map((it, i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'11px 0', borderBottom: i<3?'1px solid #f1f5f9':'none' }}>
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
    </div>
  );
}
