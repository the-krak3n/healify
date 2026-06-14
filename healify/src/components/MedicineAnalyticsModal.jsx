import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

const formatTime12 = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2,'0')} ${period}`;
};

const STATUS_COLOR = {
  taken:    '#10b981',
  partial:  '#f59e0b',
  missed:   '#ef4444',
  inactive: '#e2e8f0',
};

const STATUS_LABEL = {
  taken:    'All doses taken',
  partial:  'Some doses taken',
  missed:   'All doses missed',
  inactive: 'Not started / future',
};

export default function MedicineAnalyticsModal({ medicine, onClose }) {
  const { getMonthlyAnalytics } = useApp();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const stats = getMonthlyAnalytics(medicine, year, month);

  const monthName = viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

  // Build calendar grid with leading blanks for correct weekday alignment
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const leadingBlanks = Array.from({ length: firstDayOfWeek });

  const changeMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setViewDate(next);
    setSelectedDay(null);
  };

  const selectedData = selectedDay ? stats.calendar.find(c => c.day === selectedDay) : null;

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(8px)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16
    }}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(15,23,42,0.15)', maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:24, color:'#0f172a' }}>Medication Analytics</div>
            <div style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>{medicine.name}{medicine.strength && ` · ${medicine.strength}`}</div>
          </div>
          <button onClick={onClose} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:6, cursor:'pointer', display:'flex' }}>
            <X size={16}/>
          </button>
        </div>

        {/* Month navigator */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'18px 0 14px' }}>
          <button onClick={() => changeMonth(-1)} style={{ width:34, height:34, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={16}/>
          </button>
          <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>{monthName}</div>
          <button onClick={() => changeMonth(1)} style={{ width:34, height:34, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronRight size={16}/>
          </button>
        </div>

        {/* Stat summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18 }}>
          {[
            { label:'Expected', value:stats.totalExpected, color:'#0f172a' },
            { label:'Taken', value:stats.totalTaken, color:'#10b981' },
            { label:'Missed', value:stats.totalMissed, color:'#ef4444' },
            { label:'Adherence', value:`${stats.adherence}%`, color: stats.adherence>=80?'#10b981':stats.adherence>=50?'#f59e0b':'#ef4444' },
          ].map((s, i) => (
            <div key={i} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:20, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{ marginBottom:14 }}>
          {/* Weekday headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:6 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#94a3b8' }}>{d}</div>
            ))}
          </div>
          {/* Days */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {leadingBlanks.map((_, i) => <div key={`b${i}`}/>)}
            {stats.calendar.map(c => (
              <button
                key={c.day}
                onClick={() => c.status !== 'inactive' && setSelectedDay(c.day)}
                disabled={c.status === 'inactive'}
                style={{
                  aspectRatio:'1', borderRadius:8, border: selectedDay===c.day ? '2px solid #0f172a' : '1px solid transparent',
                  background: STATUS_COLOR[c.status],
                  color: c.status === 'inactive' ? '#94a3b8' : '#fff',
                  fontSize:12, fontWeight:700, cursor: c.status === 'inactive' ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  opacity: c.status === 'inactive' ? 0.5 : 1,
                  transition:'transform 0.1s',
                }}
                title={`${c.dateStr} — ${STATUS_LABEL[c.status]}`}
              >
                {c.day}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:18, fontSize:11, color:'#64748b' }}>
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:STATUS_COLOR[key] }}/>
              {label}
            </div>
          ))}
        </div>

        {/* Daily breakdown */}
        {selectedData && (
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:16, animation:'fadeUp 0.25s ease' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:10 }}>
              {new Date(selectedData.dateStr).toLocaleDateString([], { weekday:'long', day:'numeric', month:'long' })}
            </div>
            <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:13 }}>
              <span>Expected: <strong>{selectedData.expected}</strong></span>
              <span style={{ color:'#10b981' }}>Taken: <strong>{selectedData.taken}</strong></span>
              <span style={{ color:'#ef4444' }}>Missed: <strong>{selectedData.missed}</strong></span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {selectedData.doses.map((d, i) => {
                const c = {
                  taken:    { bg:'#ecfdf5', text:'#059669', label:'✓ Taken' },
                  skipped:  { bg:'#fffbeb', text:'#b45309', label:'⏭ Skipped' },
                  missed:   { bg:'#fef2f2', text:'#ef4444', label:'✕ Missed' },
                  upcoming: { bg:'#eff6ff', text:'#3b82f6', label:'Upcoming' },
                }[d.status];
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:c.bg }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Clock size={13} style={{ color:c.text }}/>
                      <span style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{formatTime12(d.time)}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:c.text }}>{c.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!selectedData && (
          <div style={{ textAlign:'center', fontSize:12, color:'#94a3b8', padding:'8px 0' }}>
            Tap a date to see its dose breakdown
          </div>
        )}
      </div>
    </div>
  );
}
