import { createContext, useContext, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runAuth = async (action, values) => {
    setIsSubmitting(true);
    try {
      const nextSession = await action(values);
      setSession(nextSession);
      return nextSession;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    authService.logout();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user || null,
      token: session?.token || null,
      isAuthenticated: Boolean(session?.token && session?.user),
      isSubmitting,
      login: (values) => runAuth(authService.login, values),
      signup: (values) => runAuth(authService.signup, values),
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
