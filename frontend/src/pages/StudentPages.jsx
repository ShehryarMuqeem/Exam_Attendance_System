import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {AmsHeader, BottomNav, Toast, Page } from '../components/Shared';

// Admit cards / QR are removed per the new requirements. Students now see
// their exam schedule and attendance status directly.
export function StudentDashboard() {
  const { api, currentUser, logout } = useApp();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/exams')
      .then(all => {
        const mine = all.filter(e => e.class === currentUser?.class);
        setExams(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, currentUser]);

  return (
    <Page>
      <Toast />
      <AmsHeader title="Student Portal" subtitle="View your exam schedule and attendance." />
      <div className="page-content">
        <div style={{
          background: 'var(--header-grad)', borderRadius: 16,
          padding: '16px', marginBottom: 16, color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>🎓</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{currentUser?.name}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>ID: {currentUser?.uniqueId}</div>
              {currentUser?.class && (
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {currentUser.class} · Roll: {currentUser.rollNo || '—'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-700)', marginBottom: 10 }}>
          📋 My Exam Schedule
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>Loading…</div>
        ) : exams.length === 0 ? (
          <div style={{
            background: '#f0f4ff', borderRadius: 14, padding: 24,
            textAlign: 'center', border: '1px dashed #c7d7ff',
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0a1f6b', marginBottom: 6 }}>No Exams Scheduled Yet</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.6 }}>
              Your exam schedule will appear here once the Board creates exams for your class.
            </div>
          </div>
        ) : (
          <div className="wide-grid">
            {exams.map(e => (
              <div key={e._id} style={{
                background: '#fff', borderRadius: 14,
                border: '1px solid var(--gray-100)', padding: '14px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{e.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 2 }}>
                  📅 {e.date} {e.time ? `at ${e.time}` : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 2 }}>
                  📍 Center: <strong>{e.centerName || '—'}</strong>
                </div>
                {e.roomNo && <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>🏫 Room: {e.roomNo}</div>}
                {e.duration && <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>⏱ Duration: {e.duration} mins</div>}
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn-ghost"
          style={{ marginTop: 16, width: '100%', color: '#dc2626', borderColor: '#fecaca' }}
          onClick={() => { logout(); }}
        >
          ↩ Sign Out
        </button>
      </div>
    </Page>
  );
}
