import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);
const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// ---- API helper ----
async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('attendx_token'));
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem('attendx_token');
    if (saved) {
      apiFetch('/auth/me', {}, saved)
        .then(d => { setCurrentUser(d.user); setToken(saved); })
        .catch(() => { localStorage.removeItem('attendx_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('attendx_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      return { ok: true, route: data.route };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('attendx_token');
    setToken(null);
    setCurrentUser(null);
  }, []);

  // Generic API call with auth token
  const api = useCallback((path, options = {}) => {
    return apiFetch(path, options, token);
  }, [token]);

  return (
    <AppContext.Provider value={{
      currentUser, token, login, logout, api,
      toast, showToast, loading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
