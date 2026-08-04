import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Page — replaces <div className="phone"> in every page component.
// On mobile: renders as a white full-screen column.
// On desktop: AppLayout handles the outer shell; this just provides
// the inner content container (white bg, flex column, full height).
export function Page({ children, style }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%', background:'#fff', ...style }}>
      {children}
    </div>
  );
}

// SearchableSelect — type-to-filter dropdown
// options: [{ value, label }]
export function SearchableSelect({ options = [], value, onChange, placeholder = 'Search...', label }) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const inputRef = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input when dropdown opens — using ref avoids autoFocus re-render issues
  React.useEffect(() => {
    if (open && inputRef.current) {
      // Small timeout ensures the dropdown is mounted before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  const selected = options.find(o => String(o.value) === String(value));

  const pick = (opt) => {
    onChange(opt.value);
    setQuery('');
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 5 }}>
          {label}
        </div>
      )}

      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px', border: `1.5px solid ${open ? 'var(--blue-light)' : 'var(--gray-200)'}`,
          borderRadius: 'var(--radius)', background: 'var(--white)', cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(34,85,212,.08)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 13, color: selected ? 'var(--gray-800)' : 'var(--gray-400)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {value && (
            <span onClick={clear} style={{ fontSize: 14, color: 'var(--gray-400)', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}>✕</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--gray-400)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▾</span>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--white)', border: '1.5px solid var(--gray-200)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
          zIndex: 300, overflow: 'hidden',
        }}>
          {/* Search input — NO autoFocus, we use ref + useEffect instead */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--gray-100)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search..."
              onMouseDown={e => e.stopPropagation()}
              style={{
                width: '100%', border: 'none', outline: 'none',
                fontSize: 13, fontFamily: 'Poppins, sans-serif',
                color: 'var(--gray-800)', background: 'transparent',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>
                No results found
              </div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onMouseDown={e => { e.preventDefault(); pick(opt); }}
                  style={{
                    padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                    background: String(opt.value) === String(value) ? 'var(--blue-bg)' : 'transparent',
                    color: String(opt.value) === String(value) ? 'var(--blue)' : 'var(--gray-800)',
                    fontWeight: String(opt.value) === String(value) ? 700 : 400,
                    borderBottom: '1px solid var(--gray-50)',
                  }}
                  onMouseEnter={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = 'var(--gray-50)'; }}
                  onMouseLeave={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusBar({ theme = 'light' }) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className={`status-bar ${theme}`}>
      <span>{time}</span>
      <span>▌▌▌ ≋ 🔋</span>
    </div>
  );
}

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`} key={toast.id}>{toast.msg}</div>
  );
}

export function BottomNav({ role }) {
  const navigate = useNavigate();
  const { logout } = useApp();
  const loc = useLocation();

  const navMap = {
    Admin: [
      { path: '/admin',           icon: '🏠', label: 'Home'      },
      { path: '/admin/schools',   icon: '🏫', label: 'Schools'   },
      { path: '/admin/exams',     icon: '📋', label: 'Exams'     },
      { path: '/admin/users',     icon: '👥', label: 'Users'     },
      { path: '/admin/centers',   icon: '📍', label: 'Centers'   },
      { path: '/admin/analytics', icon: '📊', label: 'Analytics' },
    ],
    School: [
      { path: '/school',          icon: '🏠', label: 'Home'     },
      { path: '/school/students', icon: '🎓', label: 'Students' },
      { path: '/school/teachers', icon: '👩‍🏫', label: 'Teachers' },
      { path: '/school/center',   icon: '📍', label: 'Center'   },
    ],
    Teacher: [
      { path: '/teacher',                 icon: '🏠', label: 'Home'    },
      { path: '/teacher/mark-attendance', icon: '📝', label: 'Attend.' },
      { path: '/teacher/report',          icon: '📊', label: 'Sheet'   },
      { path: '/teacher/absent',          icon: '❌', label: 'Absent'  },
      { path: '/teacher/duty-slip',       icon: '📋', label: 'Duty'    },
    ],
    Student: [
      { path: '/student', icon: '🏠', label: 'Home' },
    ],
  };

  const links = navMap[role] || navMap.Admin;
  const isActive = (path) => loc.pathname === path || (path !== '/admin' && path !== '/school' && path !== '/teacher' && path !== '/student' && loc.pathname.startsWith(path));

  return (
    <nav className="bottom-nav">
      {links.map(l => (
        <button
          key={l.path}
          className={`nav-item${isActive(l.path) ? ' active' : ''}`}
          onClick={() => navigate(l.path)}
          title={l.label}
        >
          <span className="nav-icon">{l.icon}</span>
          <span>{l.label}</span>
        </button>
      ))}
      <button className="nav-item" title="Logout" onClick={() => { logout(); navigate('/login'); }}>
        <span className="nav-icon">↩</span>
        <span>Logout</span>
      </button>
    </nav>
  );
}

export function Sidebar({ open, onClose }) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  if (!open) return null;
  const initials = currentUser?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleColors = { BoardAdmin: '#7c3aed', SchoolAdmin: '#0a1f6b', Teacher: '#0891b2', Student: '#16a34a' };
  const roleColor = roleColors[currentUser?.role] || '#0a1f6b';

  return (
    <>
      <div className="sidebar-overlay" onClick={onClose} />
      <div className="sidebar-drawer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>{currentUser?.name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: roleColor }}>{currentUser?.role}</div>
            <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>{currentUser?.uniqueId}</div>
          </div>
        </div>
        <button style={{ width: '100%', background: 'var(--blue-bg)', border: 'none', borderRadius: 10, padding: '11px 16px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--blue)', fontFamily: 'Poppins,sans-serif', marginBottom: 8 }}
          onClick={() => {
            const routes = { BoardAdmin: '/admin', SchoolAdmin: '/school', Teacher: '/teacher', Student: '/student' };
            navigate(routes[currentUser?.role] || '/login');
            onClose();
          }}>🏠 Dashboard</button>
        <button style={{ width: '100%', background: 'var(--red-bg)', border: 'none', borderRadius: 10, padding: '11px 16px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--red)', fontFamily: 'Poppins,sans-serif' }}
          onClick={() => { logout(); navigate('/login'); }}>↩ Sign Out</button>
      </div>
    </>
  );
}

export function PageHeader({ title, icon, onBack, menuAction, backPath }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleBack = () => {
    if (onBack) onBack();
    else if (backPath) navigate(backPath);
    else navigate(-1);
  };

  return (
    <>
      <StatusBar theme="light" />
      <div className="page-header">
        <button className="back-btn" onClick={handleBack}>‹</button>
        {icon && <span className="page-icon">{icon}</span>}
        <h1 className="title">{title}</h1>
        {menuAction !== false && (
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
        )}
      </div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

export function AmsHeader({ title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  return (
    <>
      <div className="ams-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <div className="header-title">ATTEND<span style={{ color: '#4ade80' }}>X</span></div>
            {subtitle && <div className="header-sub">{subtitle}</div>}
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >☰</button>
        </div>
        {title && title !== 'ATTENDX' && (
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600, marginTop: 4 }}>{title}</div>
        )}
      </div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

export function InputField({ label, ...props }) {
  return (
    <div className="input-group">
      {label && <label>{label}</label>}
      <input className="input-field" {...props} />
    </div>
  );
}

export function SelectField({ label, options, ...props }) {
  return (
    <div className="input-group">
      {label && <label>{label}</label>}
      <select className="input-field" {...props}>
        <option value="">Select {label}</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, onFilterToggle, filterActive }) {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Search…"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {onFilterToggle && (
        <button className={`filter-btn ${filterActive ? 'active' : ''}`} onClick={onFilterToggle}>▽</button>
      )}
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title" style={{ color: '#dc2626' }}>⚠️ {title}</div>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 20, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-red" style={{ flex: 1 }} onClick={() => { onConfirm(); onClose(); }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
