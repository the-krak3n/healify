import { useNavigate } from 'react-router-dom';
import { Apple, AlertTriangle, Pill, ArrowRight, Sparkles, Shield, Activity, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Home() {
  const navigate = useNavigate();
  const { profile } = useApp();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const modules = [
    {
      to: '/food',
      icon: Apple,
      colorClass: 'green',
      title: 'Food Tracker',
      desc: 'AI-powered nutrition intelligence. Snap a photo of your meal — get calories, protein, carbs, fiber instantly.',
      features: ['Photo & manual food entry', 'Personalized calorie targets', 'Hydration tracking', 'Daily history']
    },
    {
      to: '/emergency',
      icon: AlertTriangle,
      colorClass: 'red',
      title: 'Emergency Care',
      desc: 'In emergencies, seconds matter. Get AI-driven first-aid steps, severity assessment, and critical warnings.',
      features: ['Text or photo input', 'Step-by-step protocol', 'Things NOT to do', 'When to see a doctor']
    },
    {
      to: '/medicines',
      icon: Pill,
      colorClass: 'orange',
      title: 'Medicine Manager',
      desc: 'Never miss a dose. Track daily, weekly, and monthly medications with auto-miss intelligence.',
      features: ['Daily / Weekly / Monthly', 'Yes / No tracking', 'Drug info & alternatives', 'Price comparison']
    }
  ];

  return (
    <div className="fade-up">
      <div className="home-hero">
        <div className="home-greet">
          {greeting}{profile ? `, ${profile.name.split(' ')[0]}` : ''}
        </div>
        <h1 className="home-title">
          Your Health, <span className="accent">Simplified.</span>
        </h1>
        <p className="home-subtitle">
          AI-powered digital wellness platform combining nutrition tracking, emergency care, and medication management — all in one elegant interface.
        </p>
      </div>

      <div className="module-grid">
        {modules.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={m.to}
              className="module-card fade-up"
              onClick={() => navigate(m.to)}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`module-icon ${m.colorClass}`}>
                <Icon size={26} />
              </div>
              <h3 className="module-name">{m.title}</h3>
              <p className="module-desc">{m.desc}</p>
              <ul className="module-features">
                {m.features.map((f, j) => <li key={j}>{f}</li>)}
              </ul>
              <span className="module-cta">
                Open module <ArrowRight size={14} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="home-stats fade-up" style={{ animationDelay: '0.3s' }}>
        {[
          { icon: Sparkles, num: 'AI', label: 'Powered by Gemini' },
          { icon: Shield, num: '100%', label: 'Privacy first' },
          { icon: Activity, num: '3', label: 'Unified modules' },
          { icon: Heart, num: '24/7', label: 'Always available' }
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="home-stat-item">
              <Icon size={18} style={{ color: 'var(--primary-dark)', marginBottom: 6 }} />
              <div className="home-stat-num">{s.num}</div>
              <div className="home-stat-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 36, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
        Healify v1.0 — Built by <strong style={{ color: 'var(--text-2)' }}>Team MediCode</strong> — MSRIT Bangalore
      </div>
    </div>
  );
}
