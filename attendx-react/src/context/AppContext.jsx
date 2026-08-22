import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getOfflineQueue, syncOfflineAttendance } from '../utils/offlineStorage';

const AppContext = createContext(null);
const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// ---- API helper ----
async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
  } else {
    const text = await res.text();
    data = { message: text || `HTTP ${res.status} ${res.statusText}` };
  }

  if (!res.ok) {
    const errorMsg = (data && (data.message || data.error)) || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('attendx_token'));
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRequests, setActiveRequests] = useState(0);

  // Connectivity & Offline Queue State
  const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
  const [offlineCount, setOfflineCount] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3800);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const refreshOfflineCount = useCallback(() => {
    setOfflineCount(getOfflineQueue().length);
  }, []);

  // Generic API call with auth token and active request state tracking
  const api = useCallback(async (path, options = {}) => {
    setActiveRequests(c => c + 1);
    try {
      const data = await apiFetch(path, options, token);
      return data;
    } finally {
      setActiveRequests(c => Math.max(0, c - 1));
    }
  }, [token]);

  // Sync offline queue to backend
  const syncOfflineNow = useCallback(async () => {
    if (!token || isSyncing) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      setOfflineCount(0);
      return;
    }

    setIsSyncing(true);
    try {
      const res = await syncOfflineAttendance(api);
      refreshOfflineCount();
      if (res.synced > 0) {
        showToast(`✅ Synced ${res.synced} offline attendance record(s) to server!`, 'success');
      }
    } catch (e) {
      console.warn('Auto-sync error:', e.message);
    } finally {
      setIsSyncing(false);
      refreshOfflineCount();
    }
  }, [token, isSyncing, api, refreshOfflineCount, showToast]);

  // Listen to network status changes & auto-sync when restored
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('📶 Internet connection restored!', 'success');
      // Auto-trigger sync when back online
      syncOfflineNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('⚠️ Working Offline: Attendance will be saved locally and auto-synced.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 15s to auto-sync pending records if online
    const interval = setInterval(() => {
      refreshOfflineCount();
      if (navigator.onLine && getOfflineQueue().length > 0 && !isSyncing) {
        syncOfflineNow();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [syncOfflineNow, showToast, refreshOfflineCount, isSyncing]);

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

  return (
    <AppContext.Provider value={{
      currentUser, token, login, logout, api,
      toast, showToast, hideToast, loading,
      isOnline, offlineCount, isSyncing, syncOfflineNow, refreshOfflineCount,
      isRequestActive: activeRequests > 0, activeRequests
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
