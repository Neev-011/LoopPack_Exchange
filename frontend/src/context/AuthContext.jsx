import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5001/api/v1';
const STORAGE_KEY = 'looppack_active_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch demo accounts for evaluation
  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/demo-users`)
      .then(res => res.json())
      .then(res => {
        if (res.data) setDemoUsers(res.data);
      })
      .catch(err => console.error('[AuthContext] Error loading demo users:', err));
  }, []);

  const persistUser = (user) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const checkUsername = async (username) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/check-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      return await res.json();
    } catch (err) {
      console.error('[AuthContext] checkUsername failed:', err);
      return { exists: false, error: err.message };
    }
  };

  const login = async ({ usernameOrEmail, password }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      persistUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      persistUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async ({ usernameOrEmail, securityAnswer, newPassword }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, securityAnswer, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      if (data.user) persistUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const recoverUsername = async ({ email, companyName }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, companyName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Username recovery failed');
      return data.data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    persistUser(null);
  };

  const switchAccount = (user) => {
    persistUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        loading,
        demoUsers,
        checkUsername,
        login,
        register,
        resetPassword,
        recoverUsername,
        logout,
        switchAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
