import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { isAuthenticated, isSubmitting, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const validate = () => {
    if (isSignup && form.name.trim().length < 2) return 'Please enter your full name.';
    if (!EMAIL_PATTERN.test(form.email.trim())) return 'Please enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (isSignup && form.password !== form.confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);

    try {
      const values = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };
      await (isSignup ? signup(values) : login(values));
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <div className="auth-brand">
          <span className="auth-brand-mark"><Activity size={22} /></span>
          <span>Healify</span>
        </div>
        <div className="auth-showcase-content">
          <span className="auth-kicker">Your everyday health companion</span>
          <h1>Three essential health tools. One calm, private space.</h1>
          <p>Track nutrition, stay consistent with medicines, and access emergency guidance from one unified dashboard.</p>
          <div className="auth-module-list">
            <span>Food Tracker</span>
            <span>Medicine Manager</span>
            <span>Emergency Care</span>
          </div>
        </div>
        <div className="auth-showcase-note">Built for clearer routines and better daily decisions.</div>
      </section>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark"><Activity size={19} /></span>
            <span>Healify</span>
          </div>
          <div className="auth-heading">
            <span className="auth-kicker">{isSignup ? 'Create your account' : 'Welcome back'}</span>
            <h2>{isSignup ? 'Start your health journey' : 'Sign in to Healify'}</h2>
            <p>{isSignup ? 'Set up your personal workspace in a moment.' : 'Continue to your personal health dashboard.'}</p>
          </div>

          <form onSubmit={submit} noValidate>
            {error && <div className="auth-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}

            {isSignup && (
              <AuthField label="Full name" icon={<User size={18} />}>
                <input autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)}
                  placeholder="Your full name" disabled={isSubmitting} />
              </AuthField>
            )}

            <AuthField label="Email address" icon={<Mail size={18} />}>
              <input type="email" autoComplete="email" value={form.email}
                onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" disabled={isSubmitting} />
            </AuthField>

            <AuthField label="Password" icon={<LockKeyhole size={18} />}>
              <input type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={form.password} onChange={(e) => update('password', e.target.value)}
                placeholder="Minimum 8 characters" disabled={isSubmitting} />
              <button type="button" className="auth-eye" onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </AuthField>

            {isSignup && (
              <AuthField label="Confirm password" icon={<LockKeyhole size={18} />}>
                <input type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)}
                  placeholder="Enter the same password" disabled={isSubmitting} />
              </AuthField>
            )}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}</span>
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to Healify?'}
            <button type="button" onClick={() => navigate(isSignup ? '/login' : '/signup')}>
              {isSignup ? 'Sign in' : 'Create account'}
            </button>
          </p>
          <div className="auth-demo-note">Demo mode stores this session only in your browser.</div>
        </div>
      </main>
    </div>
  );
}

function AuthField({ label, icon, children }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input-wrap">{icon}{children}</div>
    </label>
  );
}
