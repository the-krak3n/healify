import { NavLink } from 'react-router-dom';
import { Home, Apple, AlertTriangle, Pill, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onProfileClick }) {
  const { profile } = useApp();
  const { user, logout } = useAuth();

  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/food', label: 'Food Tracker', icon: Apple },
    { to: '/emergency', label: 'Emergency Care', icon: AlertTriangle },
    { to: '/medicines', label: 'Medicine Manager', icon: Pill }
  ];

  const displayName = profile?.name || user?.name || 'Healify User';
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'GU';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <div>
          <div className="brand-text">Healify</div>
          <div className="brand-tagline">By MediCode</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Modules</div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={onProfileClick} title="Edit profile">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{displayName}</div>
            <div className="user-email">
              {user?.email || (profile?.calories ? `${profile.calories} kcal/day` : 'Set up profile')}
            </div>
          </div>
        </div>
        <button className="logout-button" type="button" onClick={logout}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
