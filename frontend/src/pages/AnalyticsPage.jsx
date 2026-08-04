import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader, BottomNav, Toast, Page } from '../components/Shared';

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--gray-100)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:44, height:44, borderRadius:12, background: color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:22, fontWeight:900, color }}>{value}</div>
        <div style={{ fontSize:11, color:'var(--gray-500)', fontWeight:600 }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:'var(--gray-400)' }}>{sub}</div>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value/max)*100)) : 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
        <span style={{ fontWeight:600, color:'var(--gray-700)' }}>{label}</span>
        <span style={{ fontWeight:700, color }}>{value} <span style={{ color:'var(--gray-400)', fontWeight:400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height:8, background:'var(--gray-100)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const { api } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const loadStats = () => {
    setLoading(true);
    setError('');
    api('/stats/dashboard')
      .then(data => { setStats(data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, [api]);

  if (loading) return (
    <Page>
      <PageHeader title="Analytics" icon="📊" backPath="/admin" />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:40 }}>📊</div>
        <div style={{ fontWeight:700, color:'var(--gray-400)' }}>Loading analytics…</div>
      </div>
    </Page>
  );

  if (error || !stats) return (
    <Page>
      <PageHeader title="Analytics" icon="📊" backPath="/admin" />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24 }}>
        <div style={{ fontSize:48 }}>⚠️</div>
        <div style={{ fontWeight:700, fontSize:15, color:'var(--gray-700)' }}>Could not load analytics</div>
        <div style={{ fontSize:12, color:'var(--gray-500)', textAlign:'center' }}>{error || 'No data available. Add schools and exams first.'}</div>
        <button className="btn btn-primary btn-sm" onClick={loadStats}>🔄 Retry</button>
      </div>
    </Page>
  );

  const overview   = stats.overview   || {};
  const examStats  = stats.examStats  || [];
  const schoolStats= stats.schoolStats|| [];
  const dailyTrend = stats.dailyTrend || [];

  return (
    <Page>
      <Toast />
      <PageHeader title="Analytics Dashboard" icon="📊" backPath="/admin" />
      <div className="page-content">
        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
          {[
            { key:'overview', label:'📈 Overview' },
            { key:'exams',    label:'📋 Exams' },
            { key:'schools',  label:'🏫 Schools' },
            { key:'trend',    label:'📅 Trend' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding:'7px 14px', borderRadius:20, fontSize:11, fontWeight:700,
              border:'none', cursor:'pointer', whiteSpace:'nowrap',
              background: activeTab===t.key ? '#0a1f6b' : 'var(--gray-100)',
              color: activeTab===t.key ? '#fff' : 'var(--gray-600)',
              fontFamily:'Poppins,sans-serif',
            }}>{t.label}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && overview && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              <StatCard icon="🏫" label="Schools"  value={overview.schools}  color="#0a1f6b" />
              <StatCard icon="👩‍🏫" label="Teachers" value={overview.teachers} color="#0891b2" />
              <StatCard icon="🎓" label="Students" value={overview.students} color="#16a34a" />
              <StatCard icon="📋" label="Exams"    value={overview.exams}    color="#d97706" />
            </div>

            {/* Attendance rate gauge */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid var(--gray-100)', padding:20, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', marginBottom:12 }}>OVERALL ATTENDANCE RATE</div>
              <div style={{ position:'relative', width:160, height:160, margin:'0 auto 12px' }}>
                <svg viewBox="0 0 160 160" style={{ width:160, height:160, transform:'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="65" fill="none" stroke="#f0f0f0" strokeWidth="16" />
                  <circle cx="80" cy="80" r="65" fill="none"
                    stroke={overview.attendanceRate >= 75 ? '#16a34a' : overview.attendanceRate >= 50 ? '#d97706' : '#dc2626'}
                    strokeWidth="16"
                    strokeDasharray={`${(overview.attendanceRate / 100) * 408} 408`}
                    strokeLinecap="round"
                    style={{ transition:'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:32, fontWeight:900, color: overview.attendanceRate >= 75 ? '#16a34a' : overview.attendanceRate >= 50 ? '#d97706' : '#dc2626' }}>
                    {overview.attendanceRate}%
                  </div>
                  <div style={{ fontSize:10, color:'var(--gray-400)', fontWeight:600 }}>Attendance</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:16, justifyContent:'center', fontSize:12 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:800, fontSize:18, color:'#16a34a' }}>{overview.totalPresent}</div>
                  <div style={{ color:'var(--gray-500)', fontSize:11 }}>Present</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:800, fontSize:18, color:'#dc2626' }}>{overview.totalAttendance - overview.totalPresent}</div>
                  <div style={{ color:'var(--gray-500)', fontSize:11 }}>Absent</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:800, fontSize:18, color:'#0a1f6b' }}>{overview.totalAttendance}</div>
                  <div style={{ color:'var(--gray-500)', fontSize:11 }}>Total</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* EXAMS */}
        {activeTab === 'exams' && (
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--gray-700)', marginBottom:12 }}>
              Attendance per Exam
            </div>
            {examStats?.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No exam data yet</div>
            )}
            {examStats?.map((e, i) => (
              <div key={i} style={{ background:'#fff', borderRadius:12, border:'1px solid var(--gray-100)', padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{e.subject}</div>
                    <div style={{ fontSize:11, color:'var(--gray-500)' }}>Class {e.class} · {e.date}</div>
                  </div>
                  <span style={{
                    background: e.rate >= 75 ? '#dcfce7' : e.rate >= 50 ? '#fef3c7' : '#fee2e2',
                    color: e.rate >= 75 ? '#166534' : e.rate >= 50 ? '#92400e' : '#991b1b',
                    borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:800,
                  }}>{e.rate}%</span>
                </div>
                <MiniBar
                  label={`${e.present} Present`}
                  value={e.present}
                  max={e.total || 1}
                  color={e.rate >= 75 ? '#16a34a' : e.rate >= 50 ? '#d97706' : '#dc2626'}
                />
              </div>
            ))}
          </div>
        )}

        {/* SCHOOLS */}
        {activeTab === 'schools' && (
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--gray-700)', marginBottom:12 }}>
              School-wise Overview
            </div>
            {schoolStats?.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No schools registered yet</div>
            )}
            {schoolStats?.map((s, i) => (
              <div key={i} style={{ background:'#fff', borderRadius:12, border:'1px solid var(--gray-100)', padding:'14px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>🏫 {s.name}</div>
                    <div style={{ fontSize:11, color:'var(--gray-500)' }}>ID: {s.schoolId}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {[
                    { label:'Teachers', count:s.teachers, color:'#0891b2', icon:'👩‍🏫' },
                    { label:'Students', count:s.students, color:'#16a34a', icon:'🎓' },
                  ].map(item => (
                    <div key={item.label} style={{ flex:1, background:item.color+'10', borderRadius:10, padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:20 }}>{item.icon}</div>
                      <div style={{ fontSize:18, fontWeight:800, color:item.color }}>{item.count}</div>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--gray-500)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TREND */}
        {activeTab === 'trend' && (
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--gray-700)', marginBottom:12 }}>
              Last 7 Days Attendance
            </div>
            {(!dailyTrend || dailyTrend.length === 0) ? (
              <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No recent attendance data</div>
            ) : (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--gray-100)', padding:16 }}>
                {/* Simple bar chart */}
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120, marginBottom:8 }}>
                  {(() => {
                    const maxCount = Math.max(...dailyTrend.map(d => d.count), 1);
                    return dailyTrend.map((d, i) => {
                      const pct = (d.count / maxCount) * 100;
                      const date = new Date(d.date);
                      const dayLabel = date.toLocaleDateString('en-US', { weekday:'short' });
                      return (
                        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#0a1f6b' }}>{d.count}</div>
                          <div style={{ width:'100%', background:'#0a1f6b', borderRadius:'4px 4px 0 0', height:`${Math.max(pct, 8)}%`, transition:'height 0.8s ease' }} />
                          <div style={{ fontSize:9, color:'var(--gray-500)', fontWeight:600 }}>{dayLabel}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div style={{ textAlign:'center', fontSize:11, color:'var(--gray-400)' }}>
                  Total attendance marked in last 7 days
                </div>
              </div>
            )}

            {/* Summary boxes */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
              <div style={{ background:'#e0e8ff', borderRadius:12, padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:900, color:'#0a1f6b' }}>
                  {dailyTrend?.reduce((sum, d) => sum + d.count, 0) || 0}
                </div>
                <div style={{ fontSize:11, fontWeight:600, color:'#0a1f6b' }}>Last 7 Days Total</div>
              </div>
              <div style={{ background:'#dcfce7', borderRadius:12, padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:900, color:'#16a34a' }}>
                  {dailyTrend?.length > 0 ? Math.round(dailyTrend.reduce((s,d) => s+d.count,0)/dailyTrend.length) : 0}
                </div>
                <div style={{ fontSize:11, fontWeight:600, color:'#16a34a' }}>Daily Average</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
