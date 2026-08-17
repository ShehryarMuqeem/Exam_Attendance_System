import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

import { Splash, Login, ForgotPassword } from './pages/AuthPages';
import { AdminDashboard, SchoolManagement, AddSchool, UserManagement, AddUser, EditUser, ExamManagement, CreateExam, CenterManagement, AttendanceOverview, BatchManagement, PasswordResetRequests } from './pages/AdminPages';
import { SchoolDashboard, SchoolStudents, SchoolTeachers, AddSchoolTeacher, SchoolAssignDuty, SchoolCenterDetails } from './pages/SchoolPages';
import { TeacherDashboard, MarkAttendance, AttendanceReport, AbsentReport, DutySlip } from './pages/TeacherPages';
import { StudentDashboard } from './pages/StudentPages';
import { AnalyticsDashboard } from './pages/AnalyticsPage';

// ===== NAV CONFIG =====
const NAV_LINKS = {
  BoardAdmin: [
    { path:'/admin',                   icon:'🏠', label:'Home'      },
    { path:'/admin/schools',           icon:'🏫', label:'Schools'   },
    { path:'/admin/exams',             icon:'📋', label:'Exams'     },
    { path:'/admin/batches',           icon:'📅', label:'Batches'   },
    { path:'/admin/users',             icon:'👥', label:'Users'     },
    { path:'/admin/password-requests', icon:'🔐', label:'Resets'    },
    { path:'/admin/centers',           icon:'📍', label:'Centers'   },
    { path:'/admin/analytics',         icon:'📊', label:'Analytics' },
  ],
  SchoolAdmin: [
    { path:'/school',           icon:'🏠', label:'Home'     },
    { path:'/school/students',  icon:'🎓', label:'Students' },
    { path:'/school/teachers',  icon:'👩‍🏫', label:'Teachers' },
    { path:'/school/duties',    icon:'📋', label:'Duties'   },
    { path:'/school/center',    icon:'📍', label:'Center'   },
  ],
  Teacher: [
    { path:'/teacher',                  icon:'🏠', label:'Home'    },
    { path:'/teacher/mark-attendance',  icon:'📝', label:'Attend.' },
    { path:'/teacher/report',           icon:'📊', label:'Sheet'   },
    { path:'/teacher/absent',           icon:'❌', label:'Absent'  },
    { path:'/teacher/duty-slip',        icon:'📋', label:'Duty'    },
  ],
  Student: [
    { path:'/student', icon:'🏠', label:'Home' },
  ],
};

// ===== DESKTOP TOP BAR =====
function DesktopTopBar() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  if (!currentUser) return null;
  const initials = currentUser.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'U';

  return (
    <div style={{
      background:'linear-gradient(135deg,#0a1f6b 0%,#1a3a9c 100%)',
      height:'var(--topbar-h)', display:'flex', alignItems:'center',
      justifyContent:'space-between', padding:'0 24px',
      flexShrink:0, position:'sticky', top:0, zIndex:200,
      boxShadow:'0 1px 4px rgba(0,0,0,.25)'
    }}>
      {/* Brand */}
      <div style={{ color:'#fff', fontSize:20, fontWeight:900, letterSpacing:2, fontFamily:'Poppins,sans-serif' }}>
        ATTEND<span style={{ color:'#4ade80' }}>X</span>
      </div>

      {/* Centre label */}
      <div style={{ color:'rgba(255,255,255,.8)', fontSize:12, fontWeight:600, fontFamily:'Poppins,sans-serif' }}>
        Board Exam Management System
      </div>

      {/* User chip */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ color:'#fff', fontSize:12, fontWeight:700, fontFamily:'Poppins,sans-serif' }}>{currentUser.name}</div>
          <div style={{ color:'rgba(255,255,255,.65)', fontSize:10, fontFamily:'Poppins,sans-serif' }}>{currentUser.role}</div>
        </div>
        <div style={{
          width:34, height:34, borderRadius:'50%',
          background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:800, fontSize:13, fontFamily:'Poppins,sans-serif',
          flexShrink:0
        }}>{initials}</div>
        <button onClick={() => { logout(); navigate('/login'); }}
          style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ===== DESKTOP SIDEBAR =====
function DesktopSidebar() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  if (!currentUser) return null;

  const links = NAV_LINKS[currentUser.role] || [];
  const isActive = (path) => {
    if (path === '/admin' || path === '/school' || path === '/teacher' || path === '/student')
      return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{
      width:'var(--sidebar-w)', background:'#fff',
      borderRight:'1px solid #e2e8f0', height:'100%',
      display:'flex', flexDirection:'column',
      padding:'12px 8px', gap:2, overflowY:'auto',
      flexShrink:0
    }}>
      {/* School / user context */}
      {currentUser.schoolName && (
        <div style={{ padding:'10px 12px 12px', borderBottom:'1px solid #f1f5f9', marginBottom:8 }}>
          <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:.4 }}>School</div>
          <div style={{ fontSize:12, fontWeight:700, color:'#0a1f6b', marginTop:2, lineHeight:1.3 }}>{currentUser.schoolName}</div>
        </div>
      )}

      {links.map(l => (
        <button key={l.path}
          onClick={() => navigate(l.path)}
          style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'10px 14px', border:'none', borderRadius:10,
            background: isActive(l.path) ? '#f0f4ff' : 'transparent',
            color: isActive(l.path) ? '#0a1f6b' : '#475569',
            fontWeight: isActive(l.path) ? 700 : 500,
            fontSize:13, fontFamily:'Poppins,sans-serif',
            cursor:'pointer', width:'100%', textAlign:'left',
            transition:'all .15s',
          }}
          onMouseEnter={e => { if (!isActive(l.path)) e.currentTarget.style.background='#f8fafc'; }}
          onMouseLeave={e => { if (!isActive(l.path)) e.currentTarget.style.background='transparent'; }}
        >
          <span style={{ fontSize:18, flexShrink:0 }}>{l.icon}</span>
          <span>{l.label}</span>
          {isActive(l.path) && (
            <span style={{ marginLeft:'auto', width:4, height:22, background:'#0a1f6b', borderRadius:2, flexShrink:0 }} />
          )}
        </button>
      ))}
    </div>
  );
}

// ===== MOBILE BOTTOM NAV =====
function MobileNav() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  if (!currentUser) return null;

  const links = NAV_LINKS[currentUser.role] || [];
  const isActive = (path) => {
    if (path === '/admin' || path === '/school' || path === '/teacher' || path === '/student')
      return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      {links.map(l => (
        <button key={l.path}
          className={`nav-item${isActive(l.path) ? ' active' : ''}`}
          onClick={() => navigate(l.path)}>
          <span className="nav-icon">{l.icon}</span>
          <span>{l.label}</span>
        </button>
      ))}
      <button className="nav-item" onClick={() => { logout(); navigate('/login'); }}>
        <span className="nav-icon">↩</span>
        <span>Exit</span>
      </button>
    </nav>
  );
}

// ===== RESPONSIVE LAYOUT WRAPPER =====
// On mobile:  [TopBar (inside page)] + [Content] + [BottomNav fixed]
// On desktop: [TopBar full-width] + [Sidebar | Content] side by side
function AppLayout({ children }) {
  const { currentUser } = useApp();
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 900);

  React.useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Auth pages (login, splash) — no chrome
  if (!currentUser) return <>{children}</>;

  if (isDesktop) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
        {/* Full-width top bar */}
        <DesktopTopBar />
        {/* Sidebar + page content */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          <DesktopSidebar />
          <main style={{ flex:1, overflowY:'auto', background:'#f0f2f5' }}>
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Mobile layout — children render their own AmsHeader/PageHeader + content
  return (
    <>
      {children}
      <MobileNav />
    </>
  );
}

// ===== PROTECTED ROUTE =====
function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, loading } = useApp();
  const location = useLocation();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#dde3f0' }}>
      <div style={{ textAlign:'center', color:'#0a1f6b', fontFamily:'Poppins,sans-serif' }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
        <div style={{ fontWeight:700 }}>Loading…</div>
      </div>
    </div>
  );
  if (!currentUser) return <Navigate to="/login" state={{ from:location }} replace />;
  if (requiredRole && currentUser.role !== requiredRole) {
    const home = { BoardAdmin:'/admin', SchoolAdmin:'/school', Teacher:'/teacher', Student:'/student' }[currentUser.role] || '/login';
    return <Navigate to={home} replace />;
  }
  return children;
}

// ===== ROUTES =====
function AppRoutes() {
  const { currentUser } = useApp();

  return (
    <AppLayout>
      <Routes>
        <Route path="/"                       element={<Splash />} />
        <Route path="/login"                  element={<Login />} />
        <Route path="/forgot-password"        element={<ForgotPassword />} />
        <Route path="/register"               element={<Navigate to="/login" replace />} />

        {/* Board Admin */}
        <Route path="/admin"                  element={<ProtectedRoute requiredRole="BoardAdmin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/schools"          element={<ProtectedRoute requiredRole="BoardAdmin"><SchoolManagement /></ProtectedRoute>} />
        <Route path="/admin/schools/add"      element={<ProtectedRoute requiredRole="BoardAdmin"><AddSchool /></ProtectedRoute>} />
        <Route path="/admin/users"            element={<ProtectedRoute requiredRole="BoardAdmin"><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/users/add"        element={<ProtectedRoute requiredRole="BoardAdmin"><AddUser /></ProtectedRoute>} />
        <Route path="/admin/users/edit/:id"   element={<ProtectedRoute requiredRole="BoardAdmin"><EditUser /></ProtectedRoute>} />
        <Route path="/admin/password-requests" element={<ProtectedRoute requiredRole="BoardAdmin"><PasswordResetRequests /></ProtectedRoute>} />
        <Route path="/admin/exams"            element={<ProtectedRoute requiredRole="BoardAdmin"><ExamManagement /></ProtectedRoute>} />
        <Route path="/admin/exams/create"     element={<ProtectedRoute requiredRole="BoardAdmin"><CreateExam /></ProtectedRoute>} />
        <Route path="/admin/batches"          element={<ProtectedRoute requiredRole="BoardAdmin"><BatchManagement /></ProtectedRoute>} />
        <Route path="/admin/centers"          element={<ProtectedRoute requiredRole="BoardAdmin"><CenterManagement /></ProtectedRoute>} />
        <Route path="/admin/attendance"       element={<ProtectedRoute requiredRole="BoardAdmin"><AttendanceOverview /></ProtectedRoute>} />
        <Route path="/admin/analytics"        element={<ProtectedRoute requiredRole="BoardAdmin"><AnalyticsDashboard /></ProtectedRoute>} />

        {/* School Admin */}
        <Route path="/school"                 element={<ProtectedRoute requiredRole="SchoolAdmin"><SchoolDashboard /></ProtectedRoute>} />
        <Route path="/school/students"        element={<ProtectedRoute requiredRole="SchoolAdmin"><SchoolStudents /></ProtectedRoute>} />
        <Route path="/school/teachers"        element={<ProtectedRoute requiredRole="SchoolAdmin"><SchoolTeachers /></ProtectedRoute>} />
        <Route path="/school/teachers/add"    element={<ProtectedRoute requiredRole="SchoolAdmin"><AddSchoolTeacher /></ProtectedRoute>} />
        <Route path="/school/duties"          element={<ProtectedRoute requiredRole="SchoolAdmin"><SchoolAssignDuty /></ProtectedRoute>} />
        <Route path="/school/center"          element={<ProtectedRoute requiredRole="SchoolAdmin"><SchoolCenterDetails /></ProtectedRoute>} />

        {/* Teacher */}
        <Route path="/teacher"                element={<ProtectedRoute requiredRole="Teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/mark-attendance" element={<ProtectedRoute requiredRole="Teacher"><MarkAttendance /></ProtectedRoute>} />
        <Route path="/teacher/report"         element={<ProtectedRoute requiredRole="Teacher"><AttendanceReport /></ProtectedRoute>} />
        <Route path="/teacher/absent"         element={<ProtectedRoute requiredRole="Teacher"><AbsentReport /></ProtectedRoute>} />
        <Route path="/teacher/duty-slip"      element={<ProtectedRoute requiredRole="Teacher"><DutySlip /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student"                element={<ProtectedRoute requiredRole="Student"><StudentDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
