import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {StatusBar, Page } from '../components/Shared';

export function Splash() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => navigate('/login', { replace: true }), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [navigate]);

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'#0a1f6b',
      display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'hidden',
    }}>
      {/* Background circles */}
      <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(34,85,212,0.25)' }} />
      <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(34,85,212,0.18)' }} />

      {/* Centered content */}
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:20,
        opacity: phase===2 ? 0 : 1,
        transform: phase===0 ? 'scale(0.8) translateY(30px)' : 'scale(1) translateY(0)',
        transition: phase===2 ? 'opacity 0.55s ease' : 'opacity 0.5s ease, transform 0.65s cubic-bezier(.22,1,.36,1)',
        zIndex:1,
      }}>
        <div style={{ width:110, height:110, borderRadius:28, background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
            <path d="M60 8 L105 100 H15 Z" fill="#ffffff" opacity=".9"/>
            <path d="M60 8 L36 62 H84 Z" fill="#2255d4" opacity=".85"/>
            <path d="M42 82 L72 56" stroke="#22c55e" strokeWidth="7" strokeLinecap="round"/>
            <path d="M54 82 L72 56" stroke="#22c55e" strokeWidth="7" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:42, fontWeight:900, color:'#ffffff', letterSpacing:5, lineHeight:1 }}>
            ATTEND<span style={{ color:'#22c55e' }}>X</span>
          </div>
          <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.65)', marginTop:10, letterSpacing:1 }}>
            Board Exam Management System
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ width:8, height:8, borderRadius:'50%', background: i===0?'#22c55e':'rgba(255,255,255,0.3)', animation: phase>=1?`dotpulse 1.2s ${i*0.2}s infinite`:'none' }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes dotpulse{0%,100%{opacity:0.3;transform:scale(0.85)}50%{opacity:1;transform:scale(1.15)}}`}</style>
    </div>
  );
}

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, showToast, currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      const routes = { BoardAdmin:'/admin', SchoolAdmin:'/school', Teacher:'/teacher', Student:'/student' };
      navigate(routes[currentUser.role] || '/admin');
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password) { setError('Enter your username and password'); return; }
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (res.ok) {
      showToast('Login successful! ✓', 'success');
      setTimeout(() => navigate(res.route), 300);
    } else {
      setError(res.error);
    }
  };

  function Logo() {
    return (
      <svg width="56" height="56" viewBox="0 0 120 120" fill="none">
        <path d="M60 8 L105 100 H15 Z" fill="#ffffff" opacity=".9"/>
        <path d="M60 8 L36 62 H84 Z" fill="#1e3fa0" opacity=".8"/>
        <path d="M42 82 L72 56" stroke="#22c55e" strokeWidth="7" strokeLinecap="round"/>
        <path d="M54 82 L72 56" stroke="#22c55e" strokeWidth="7" strokeLinecap="round"/>
      </svg>
    );
  }

  function FormSection() {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:'var(--gray-900)', marginBottom:4 }}>Welcome back</h2>
          <p style={{ fontSize:12, color:'var(--gray-500)' }}>Sign in with credentials provided by your Admin</p>
        </div>

        <input className="input-bare" type="text" placeholder="Username"
          value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />

        <div style={{ position:'relative' }}>
          <input className="input-bare" type={showPw ? 'text' : 'password'} placeholder="Password"
            value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
            style={{ paddingRight:48 }} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <button onClick={() => setShowPw(!showPw)}
            style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:18 }}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>

        {error && (
          <div style={{ background:'var(--red-bg)', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px' }}>
            <p style={{ fontSize:12, color:'var(--red)', margin:0 }}>⚠ {error}</p>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}
          style={{ marginTop:2, opacity:loading ? 0.7 : 1, padding:'13px 20px', fontSize:14 }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <button onClick={() => navigate('/forgot-password')}
          style={{ background:'none', border:'none', color:'var(--blue-light)', fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif', textAlign:'center' }}>
          Forgot password?
        </button>

        <div style={{ background:'var(--blue-bg)', border:'1px solid #c7d7ff', borderRadius:12, padding:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#0a1f6b', marginBottom:5 }}>ℹ Account Access</p>
          <p style={{ fontSize:11, color:'var(--gray-600)', lineHeight:1.6, margin:0 }}>
            Accounts are created by the <strong>Board Administrator</strong>. Contact your Admin to receive login credentials.
          </p>
        </div>

        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:10, color:'var(--gray-400)', marginBottom:8 }}>Demo quick-fill:</p>
          <button onClick={() => { setUsername('boardadmin'); setPassword('Admin@2026'); setError(''); }}
            style={{ background:'var(--gray-100)', border:'1px solid var(--gray-200)', borderRadius:8, padding:'5px 14px', fontSize:11, fontWeight:600, color:'var(--blue)', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
            👑 Board Admin
          </button>
        </div>
      </div>
    );
  }

  // ── DESKTOP (≥ 900px): Facebook-style — left brand panel + right form ──
  // ── MOBILE (< 900px): centered card ──
  return (
    <>
      {/* DESKTOP LAYOUT — Facebook style */}
      <div className="login-desktop">
        {/* Left — Brand panel (smaller, like FB) */}
        <div style={{
          background:'var(--header-grad)',
          flex:'0 0 45%', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'48px 48px', minHeight:'100vh',
        }}>
          {/* Logo + Name centered */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, marginBottom:32 }}>
            {Logo()}
            <div style={{ color:'#fff', fontSize:38, fontWeight:900, letterSpacing:4, lineHeight:1 }}>
              ATTEND<span style={{ color:'#4ade80' }}>X</span>
            </div>
            <div style={{ color:'rgba(255,255,255,.8)', fontSize:14, fontWeight:600, letterSpacing:1, textAlign:'center' }}>
              BOARD EXAM MANAGEMENT SYSTEM
            </div>
          </div>

          <div style={{ color:'rgba(255,255,255,.75)', fontSize:15, lineHeight:1.8, maxWidth:320, textAlign:'center', marginBottom:28 }}>
            Manage examinations, track attendance, assign duties and generate reports.
          </div>

          {/* Feature pills */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:280 }}>
            {['📋 Exam Management', '📍 Center Assignment', '📊 Attendance Tracking', '📈 Analytics'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.12)', borderRadius:10, padding:'10px 16px', color:'#fff', fontSize:13, fontWeight:600 }}>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right — Login form (55%, vertically centered, white) */}
        <div style={{
          flex:'0 0 55%', background:'#f0f2f5',
          display:'flex', alignItems:'center', justifyContent:'center',
          minHeight:'100vh', padding:'40px 32px',
        }}>
          <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 4px 24px rgba(0,0,0,.10)', padding:'40px 40px', width:'100%', maxWidth:420 }}>
            {FormSection()}
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="login-mobile">
        <div style={{ background:'var(--header-grad)', padding:'32px 24px 28px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, flexShrink:0 }}>
          {Logo()}
          <div style={{ color:'#fff', fontSize:26, fontWeight:900, letterSpacing:3 }}>
            ATTEND<span style={{ color:'#4ade80' }}>X</span>
          </div>
          <div style={{ color:'rgba(255,255,255,.7)', fontSize:11, letterSpacing:1, fontWeight:500 }}>
            BOARD EXAM MANAGEMENT SYSTEM
          </div>
        </div>
        <div style={{ flex:1, padding:'28px 24px 40px', background:'#fff', overflowY:'auto' }}>
          {FormSection()}
        </div>
      </div>
    </>
  );
}

export function ForgotPassword() {
  const navigate = useNavigate();
  return (
    <Page>
      <div style={{ background:'var(--header-grad)', minHeight:160, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <h1 style={{ color:'#fff', fontSize:22, fontWeight:900, letterSpacing:2 }}>ATTEND<span style={{ color:'#4ade80' }}>X</span></h1>
      </div>
      <div style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:16, alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:48 }}>🔐</div>
        <h3 style={{ fontSize:18, fontWeight:800, textAlign:'center', color:'var(--gray-900)' }}>Forgot Password?</h3>
        <div style={{ background:'#f0f4ff', border:'1px solid #c7d7ff', borderRadius:14, padding:18, width:'100%' }}>
          <p style={{ fontSize:13, color:'var(--gray-700)', lineHeight:1.7, textAlign:'center', margin:0 }}>
            Password resets are handled by the <strong style={{ color:'#0a1f6b' }}>System Administrator</strong>.
            <br/><br/>
            Contact your Admin to reset your password. They can update it from the User Management panel.
          </p>
        </div>
        <button className="btn btn-primary" style={{ width:'100%' }} onClick={()=>navigate('/login')}>Back to Login</button>
      </div>
    </Page>
  );
}
