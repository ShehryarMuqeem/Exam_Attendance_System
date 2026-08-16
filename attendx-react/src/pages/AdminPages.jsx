import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AmsHeader, PageHeader, BottomNav, Toast, SearchBar, ConfirmModal, Page, SearchableSelect } from '../components/Shared';

function statusBadge(s) {
  return <span className={`badge ${s === 'Active' ? 'badge-green' : 'badge-red'}`}>{s}</span>;
}
function roleBadge(r) {
  const colors = { BoardAdmin:'#7c3aed', SchoolAdmin:'#0a1f6b', Teacher:'#0891b2', Student:'#16a34a' };
  return <span style={{ background: colors[r]+'18', color: colors[r], border:`1px solid ${colors[r]}33`, borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{r}</span>;
}
function examStatusBadge(s) {
  return <span className={`badge ${s==='Done'?'badge-green':s==='Ongoing'?'badge-orange':'badge-blue'}`}>{s}</span>;
}

// ===== ADMIN DASHBOARD =====
export function AdminDashboard() {
  const navigate = useNavigate();
  const { api, currentUser } = useApp();
  const [stats, setStats] = useState({ schools:0, teachers:0, students:0, exams:0 });

  useEffect(() => {
    Promise.all([
      api('/schools').catch(()=>[]),
      api('/users?role=Teacher').catch(()=>[]),
      api('/users?role=Student').catch(()=>[]),
      api('/exams').catch(()=>[]),
    ]).then(([schools, teachers, students, exams]) => {
      setStats({ schools: schools.length, teachers: teachers.length, students: students.length, exams: exams.length });
    });
  }, [api]);

  const cards = [
    { label:'Schools',  value: stats.schools,  icon:'🏫', color:'#2255d4', path:'/admin/schools' },
    { label:'Teachers', value: stats.teachers, icon:'👩‍🏫', color:'#0891b2', path:'/admin/users?role=Teacher' },
    { label:'Students', value: stats.students, icon:'🎓', color:'#16a34a', path:'/admin/users?role=Student' },
    { label:'Exams',    value: stats.exams,    icon:'📋', color:'#d97706', path:'/admin/exams' },
  ];

  const actions = [
    { label:'Manage Schools',     icon:'🏫', path:'/admin/schools',   desc:'Add, edit, and manage registered schools' },
    { label:'Manage Users',       icon:'👥', path:'/admin/users',     desc:'Teachers and students across all schools' },
    { label:'Manage Exams',       icon:'📋', path:'/admin/exams',     desc:'Year → Term → Department → Subject hierarchy' },
    { label:'Manage Batches',     icon:'📅', path:'/admin/batches',   desc:'Add and manage academic year batches (e.g. 2026-2027)' },
    { label:'Examination Centers',icon:'📍', path:'/admin/centers',   desc:'Assign schools as exam centers for other schools' },
    { label:'Attendance Overview',icon:'✅', path:'/admin/attendance',desc:'View attendance records across all exams' },
    { label:'Analytics',          icon:'📊', path:'/admin/analytics', desc:'Attendance rates and trends' },
  ];

  return (
    <Page>
      <Toast />
      <AmsHeader title="Board Admin Panel" subtitle="Manage schools, exams, centers, and attendance across the board." />
      <div className="page-content">
        <div style={{ background:'#e0e8ff', borderRadius:12, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#0a1f6b', fontWeight:600 }}>
          👋 Welcome, {currentUser?.name}
        </div>
        <div className="wide-grid" style={{ gridTemplateColumns:'repeat(2, 1fr)', marginBottom:18 }}>
          {cards.map(c => (
            <div key={c.label} onClick={()=>navigate(c.path)} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', textAlign:'center' }}>
              <div style={{ fontSize:24 }}>{c.icon}</div>
              <div style={{ fontSize:22, fontWeight:800, color:c.color, marginTop:4 }}>{c.value}</div>
              <div style={{ fontSize:11, color:'var(--gray-500)', fontWeight:600 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div className="wide-grid">
          {actions.map(a => (
            <div key={a.label} onClick={()=>navigate(a.path)} style={{ background:'#fff', borderRadius:14, padding:'16px', border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:26 }}>{a.icon}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{a.label}</div>
                <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>{a.desc}</div>
              </div>
              <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

// ===== SCHOOL MANAGEMENT =====
export function SchoolManagement() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(()=>api('/schools').then(setSchools).catch(e=>showToast(e.message,'error')),[api,showToast]);
  useEffect(()=>{ load(); },[load]);

  const filtered = schools.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase())||s.school_id.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id) => {
    try { await api(`/schools/${id}`, { method:'DELETE' }); showToast('School deleted','success'); load(); }
    catch(e) { showToast(e.message,'error'); }
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Schools" icon="🏫" backPath="/admin" />
      <div className="page-content">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary btn-sm" style={{ margin:'10px 0 16px' }} onClick={()=>navigate('/admin/schools/add')}>+ Register School</button>
        <div className="wide-grid">
          {filtered.map(s=>(
            <div key={s.id} className="center-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--gray-500)' }}>{s.school_id}</div>
                  {s.district && <div style={{ fontSize:11, color:'#0a1f6b', fontWeight:600, marginTop:2 }}>📍 {s.district}</div>}
                  <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>{s.address}</div>
                  {s.admin_username && <div style={{ fontSize:11, color:'#0a1f6b', marginTop:4, fontWeight:600 }}>👤 Admin: {s.admin_username}</div>}
                  <div style={{ marginTop:6 }}>{statusBadge(s.status)}</div>
                </div>
                <button className="btn btn-red btn-sm" onClick={()=>setConfirmDelete(s.id)}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No schools yet</div>}
        </div>
      </div>
      <ConfirmModal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} onConfirm={()=>handleDelete(confirmDelete)} title="Delete School" message="This will permanently delete the school and all its teachers/students. This cannot be undone." />
    </Page>
  );
}

export function AddSchool() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [form, setForm] = useState({ name:'', district:'', address:'', phone:'', email:'', adminUsername:'', adminPassword:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if (!form.name) { showToast('School name is required','error'); return; }
    if (!form.district) { showToast('District is required','error'); return; }
    if (!form.adminUsername) { showToast('Admin username is required','error'); return; }
    if (!form.adminPassword) { showToast('Admin password is required','error'); return; }
    setLoading(true);
    try {
      await api('/schools', { method:'POST', body: JSON.stringify(form) });
      showToast('School registered! ✓','success');
      setTimeout(()=>navigate('/admin/schools'),700);
    } catch(e) { showToast(e.message,'error'); }
    setLoading(false);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Register School" icon="🏫" backPath="/admin/schools" />
      <div className="page-content">
        <div className="card" style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'#0a1f6b' }}>School Information</div>
          <div className="input-group">
            <label>School Name *</label>
            <input className="input-field" placeholder="e.g. Allied Public School" value={form.name} onChange={e=>set('name',e.target.value)} />
          </div>
          <div className="input-group">
            <label>District * <span style={{ color:'#dc2626' }}>(required)</span></label>
            <input className="input-field" placeholder="e.g. Karachi, Lahore, Faisalabad" value={form.district} onChange={e=>set('district',e.target.value)} />
          </div>
          <div className="input-group">
            <label>Address</label>
            <input className="input-field" placeholder="Street address" value={form.address} onChange={e=>set('address',e.target.value)} />
          </div>
          <div className="input-group">
            <label>Phone</label>
            <input className="input-field" placeholder="0300-0000000" value={form.phone} onChange={e=>set('phone',e.target.value)} />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input className="input-field" placeholder="school@example.edu" value={form.email} onChange={e=>set('email',e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginTop:12 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'#0a1f6b' }}>School Admin Account</div>
          <div className="input-group">
            <label>Admin Username *</label>
            <input className="input-field" placeholder="e.g. alliedschool" value={form.adminUsername} onChange={e=>set('adminUsername',e.target.value)} />
          </div>
          <div className="input-group">
            <label>Admin Password *</label>
            <input className="input-field" type="text" placeholder="e.g. all1234" value={form.adminPassword} onChange={e=>set('adminPassword',e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={save} disabled={loading}>
          {loading ? 'Registering…' : '+ Register School'}
        </button>
      </div>
    </Page>
  );
}

// ===== USER MANAGEMENT =====
export function UserManagement() {
  const { api, showToast, currentUser } = useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [roleFilter, setRoleFilter] = useState('Teacher');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Board Admin sees school picker first. School Admin automatically
  // sees only their own school — no picker needed.
  const isBoardAdmin = currentUser?.role === 'BoardAdmin';

  useEffect(() => {
    if (isBoardAdmin) {
      api('/schools').then(setSchools).catch(e => showToast(e.message, 'error'));
    }
  }, [api, isBoardAdmin, showToast]);

  const load = useCallback(() => {
    let url = `/users?role=${roleFilter}`;
    if (isBoardAdmin && selectedSchool) url += `&schoolId=${selectedSchool}`;
    api(url).then(setUsers).catch(e => showToast(e.message, 'error'));
  }, [api, roleFilter, selectedSchool, isBoardAdmin, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.uniqueId.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (id) => {
    try { await api(`/users/${id}/toggle-status`, { method: 'PATCH' }); load(); }
    catch (e) { showToast(e.message, 'error'); }
  };
  const handleDelete = async (id) => {
    try { await api(`/users/${id}`, { method: 'DELETE' }); showToast('User deleted', 'success'); load(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const selectedSchoolName = schools.find(s => String(s.id) === String(selectedSchool))?.name;

  return (
    <Page>
      <Toast />
      <PageHeader title="Users" icon="👥" backPath="/admin" />
      <div className="page-content">

        {/* Board Admin must pick a school first */}
        {isBoardAdmin && (
          <div style={{ marginBottom: 14 }}>
            <SearchableSelect
              label="🏫 Select School to View"
              placeholder="Search school..."
              options={schools.map(s => ({ value: s.id, label: `${s.name} (${s.school_id})` }))}
              value={selectedSchool}
              onChange={v => { setSelectedSchool(v); setSearch(''); }}
            />
          </div>
        )}

        {/* Only show users when school is selected (Board Admin) or always (School Admin) */}
        {(!isBoardAdmin || selectedSchool) ? (
          <>
            {isBoardAdmin && selectedSchoolName && (
              <div style={{ background: '#e0e8ff', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#0a1f6b' }}>
                Showing: {selectedSchoolName}
              </div>
            )}
            <div className="att-tabs">
              {['Teacher', 'Student'].map(r => (
                <button key={r} className={`att-tab ${roleFilter === r ? 'active' : ''}`} onClick={() => setRoleFilter(r)}>{r}s</button>
              ))}
            </div>
            <SearchBar value={search} onChange={setSearch} />
            <button className="btn btn-primary btn-sm" style={{ margin: '10px 0 16px' }} onClick={() => navigate('/admin/users/add')}>
              + Add {roleFilter}
            </button>
            <div className="wide-grid">
              {filtered.map(u => (
                <div key={u.id} className="center-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>
                        ID: <strong style={{ color: '#0a1f6b' }}>{u.uniqueId}</strong> · @{u.username}
                      </div>
                      {u.class && <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>Class: {u.class}</div>}
                      {u.assignedClassroom && <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>Duty: {u.assignedClassroom}</div>}
                      <div style={{ marginTop: 5 }}>{statusBadge(u.status)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/users/edit/${u.id}`)}>Edit</button>
                      <button className="btn btn-outline btn-sm" onClick={() => toggleStatus(u.id)}>
                        {u.status === 'Active' ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-red btn-sm" onClick={() => setConfirmDelete(u.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>
                  No {roleFilter.toLowerCase()}s found
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏫</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-600)' }}>Select a school above</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Teachers and students will appear here</div>
          </div>
        )}
      </div>
      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => handleDelete(confirmDelete)} title="Delete User" message="This will permanently remove this user. This cannot be undone." />
    </Page>
  );
}

export function AddUser() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({ name:'', email:'', phone:'', role:'Teacher', username:'', password:'', class:'', rollNo:'', schoolId:'' });
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null); // shows auto-generated credentials for students
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{ api('/schools').then(setSchools).catch(()=>{}); },[api]);

  const save = async () => {
    if (!form.name || !form.schoolId) { showToast('Fill required fields (Name + School)','error'); return; }
    if (form.role === 'Teacher' && (!form.username || !form.password)) { showToast('Username and password required for Teachers','error'); return; }
    setLoading(true);
    try {
      const res = await api('/users', { method:'POST', body: JSON.stringify(form) });
      if (form.role === 'Student' && res.generatedUsername) {
        // Show generated credentials before navigating
        setGenerated({ username: res.generatedUsername, password: res.generatedPassword });
      } else {
        showToast(`${form.role} created! ✓`,'success');
        setTimeout(()=>navigate('/admin/users'),700);
      }
    } catch(e) { showToast(e.message,'error'); }
    setLoading(false);
  };

  // Show generated credentials screen
  if (generated) return (
    <Page>
      <PageHeader title="Student Added!" icon="✅" backPath="/admin/users" />
      <div className="page-content" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ background:'#dcfce7', border:'2px solid #16a34a', borderRadius:14, padding:20, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
          <div style={{ fontWeight:800, fontSize:16, color:'#14532d', marginBottom:4 }}>Student Created!</div>
          <div style={{ fontSize:12, color:'#166534' }}>Note down the login credentials below</div>
        </div>
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--gray-100)', padding:20 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:14, color:'#0a1f6b' }}>🔑 Auto-Generated Login Credentials</div>
          {[
            { label:'Username', value: generated.username },
            { label:'Password', value: generated.password },
          ].map(r=>(
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <span style={{ fontSize:12, color:'var(--gray-500)', fontWeight:600 }}>{r.label}</span>
              <span style={{ fontSize:13, fontWeight:800, color:'#0a1f6b', fontFamily:'monospace', background:'#f0f4ff', padding:'4px 12px', borderRadius:8 }}>{r.value}</span>
            </div>
          ))}
          <div style={{ marginTop:12, fontSize:11, color:'var(--gray-500)' }}>
            ⚠ Share these credentials with the student. They can be reset later from User Management.
          </div>
        </div>
        <button className="btn btn-primary" onClick={()=>navigate('/admin/users')}>Done</button>
        <button className="btn btn-ghost" onClick={()=>{ setGenerated(null); setForm({ name:'', email:'', phone:'', role:'Student', username:'', password:'', class:'', rollNo:'', schoolId:form.schoolId }); }}>
          + Add Another Student
        </button>
      </div>
    </Page>
  );

  return (
    <Page>
      <Toast />
      <PageHeader title="Add User" icon="👤" backPath="/admin/users" />
      <div className="page-content">
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
          <div className="input-group"><label>Role *</label>
            <select className="input-field" value={form.role} onChange={e=>set('role',e.target.value)}>
              <option value="Teacher">Teacher</option>
              <option value="Student">Student</option>
            </select>
          </div>
          <div className="input-group"><label>School *</label>
            <SearchableSelect
              placeholder="Search school..."
              options={schools.map(s => ({ value: s.id, label: `${s.name} (${s.school_id})` }))}
              value={form.schoolId}
              onChange={v => set('schoolId', v)}
            />
          </div>
          <div className="input-group"><label>Full Name *</label><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} /></div>
          <div className="input-group"><label>Email</label><input className="input-field" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
          <div className="input-group"><label>Phone</label><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
          {form.role==='Student' && (
            <>
              <div className="input-group"><label>Class</label>
                <select className="input-field" value={form.class} onChange={e=>set('class',e.target.value)}>
                  <option value="">Select Class</option>
                  {['SSC-I','SSC-II','HSC-I','HSC-II','SSC-I Supplementary','SSC-II Supplementary','HSC-I Supplementary','HSC-II Supplementary'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group"><label>Roll No</label><input className="input-field" value={form.rollNo} onChange={e=>set('rollNo',e.target.value)} /></div>
            </>
          )}
          <div className="divider" />
          {form.role === 'Teacher' && (
            <>
              <div className="input-group"><label>Username *</label><input className="input-field" value={form.username} onChange={e=>set('username',e.target.value)} /></div>
              <div className="input-group"><label>Password *</label><input className="input-field" value={form.password} onChange={e=>set('password',e.target.value)} /></div>
            </>
          )}
          {form.role === 'Student' && (
            <div style={{ background:'#f0f4ff', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#0a1f6b', fontWeight:600 }}>
              ℹ Username & password will be auto-generated from student name + roll number.
            </div>
          )}
        </div>
        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={save} disabled={loading}>{loading?'Creating…':'Create User'}</button>
      </div>
    </Page>
  );
}

export function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [form, setForm] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{ api(`/users/${id}`).then(setForm).catch(e=>showToast(e.message,'error')); },[api,id,showToast]);

  const save = async () => {
    try { await api(`/users/${id}`, { method:'PUT', body: JSON.stringify(form) }); showToast('Updated! ✓','success'); setTimeout(()=>navigate('/admin/users'),600); }
    catch(e) { showToast(e.message,'error'); }
  };

  if (!form) return <Page><PageHeader title="Edit User" backPath="/admin/users" /></Page>;

  return (
    <Page>
      <Toast />
      <PageHeader title="Edit User" icon="✏️" backPath="/admin/users" />
      <div className="page-content">
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
          <div className="input-group"><label>Name</label><input className="input-field" value={form.name||''} onChange={e=>set('name',e.target.value)} /></div>
          <div className="input-group"><label>Email</label><input className="input-field" value={form.email||''} onChange={e=>set('email',e.target.value)} /></div>
          <div className="input-group"><label>Phone</label><input className="input-field" value={form.phone||''} onChange={e=>set('phone',e.target.value)} /></div>
          <div className="input-group"><label>New Password (leave blank to keep)</label><input className="input-field" onChange={e=>set('password',e.target.value)} /></div>
        </div>
        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={save}>Save Changes</button>
      </div>
    </Page>
  );
}

// ===== EXAM MANAGEMENT — List & Wizard =====
export function ExamManagement() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'wizard'

  // List view state
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [years, setYears] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewDetailsExam, setViewDetailsExam] = useState(null);

  // Wizard state
  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [year, setYear] = useState(null);
  const [term, setTerm] = useState(null);
  const [shift, setShift] = useState(null);
  const [department, setDepartment] = useState(null);
  const [subject, setSubject] = useState(null);

  const [wizardExams, setWizardExams] = useState([]);
  const [examsLoaded, setExamsLoaded] = useState(false);

  // Load initial data
  const loadExams = useCallback(() => {
    setLoading(true);
    api('/exams')
      .then(res => {
        if (Array.isArray(res)) setAllExams(res);
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [api, showToast]);

  useEffect(() => {
    loadExams();
    api('/academic/years').then(res => { if (Array.isArray(res)) setYears(res); }).catch(() => {});
  }, [loadExams, api]);

  // Wizard API calls
  useEffect(() => {
    if (!year) { setTerm(null); return; }
    api('/academic/terms').then(res => { if (Array.isArray(res)) setTerms(res); }).catch(() => {});
  }, [api, year]);

  useEffect(() => {
    if (!term) { setDepartment(null); return; }
    setShift(null);
    api(`/academic/departments?term=${encodeURIComponent(term)}`).then(res => { if (Array.isArray(res)) setDepartments(res); }).catch(() => {});
  }, [api, term]);

  useEffect(() => {
    if (!department) { setSubject(null); return; }
    api(`/academic/subjects?department=${encodeURIComponent(department)}`).then(res => { if (Array.isArray(res)) setSubjects(res); }).catch(() => {});
  }, [api, department]);

  useEffect(() => {
    if (!year || !term || !shift || !department || !subject) { setExamsLoaded(false); return; }
    const matching = allExams.filter(e =>
      e.academicYear === year && e.term === term && e.shift === shift &&
      e.department === department && e.subject === subject
    );
    setWizardExams(matching);
    setExamsLoaded(true);
  }, [allExams, year, term, shift, department, subject]);

  const handleDelete = async (id) => {
    try {
      await api(`/exams/${id}`, { method: 'DELETE' });
      showToast('Exam deleted successfully', 'success');
      loadExams();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setConfirmDelete(null);
  };

  const filteredExams = allExams.filter(e => {
    const matchesSearch = !search ||
      (e.subject && e.subject.toLowerCase().includes(search.toLowerCase())) ||
      (e.class && e.class.toLowerCase().includes(search.toLowerCase())) ||
      (e.centerName && e.centerName.toLowerCase().includes(search.toLowerCase())) ||
      (e.academicYear && e.academicYear.toLowerCase().includes(search.toLowerCase()));
    const matchesYear = !yearFilter || e.academicYear === yearFilter;
    return matchesSearch && matchesYear;
  });

  const resetWizard = (level) => {
    if (level <= 0) setYear(null);
    if (level <= 1) setTerm(null);
    if (level <= 2) setShift(null);
    if (level <= 3) setDepartment(null);
    if (level <= 4) setSubject(null);
    setExamsLoaded(false);
  };

  const crumbs = [year, term, shift, department, subject].filter(Boolean);

  return (
    <Page>
      <Toast />
      <PageHeader title="Manage Exams" icon="📋" backPath="/admin" />
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Header Actions & Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="att-tabs" style={{ margin: 0, width: 'auto' }}>
            <button
              className={`att-tab ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 Scheduled Exams ({allExams.length})
            </button>
            <button
              className={`att-tab ${viewMode === 'wizard' ? 'active' : ''}`}
              onClick={() => setViewMode('wizard')}
            >
              🎯 Curriculum Hierarchy Wizard
            </button>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: 'auto', padding: '9px 18px', fontSize: 13 }}
            onClick={() => navigate('/admin/exams/create')}
          >
            + Create New Exam
          </button>
        </div>

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <SearchBar value={search} onChange={setSearch} placeholder="Search exam by subject, class, center..." />
              </div>
              <select
                className="input-field"
                style={{ width: 160, padding: 8 }}
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
              >
                <option value="">All Batches</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="wide-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {filteredExams.map(e => (
                <div key={e._id || e.id} className="center-card" style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>{e.academicYear} • {e.shift || 'Morning'}</span>
                      {examStatusBadge(e.status)}
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0a1f6b', marginBottom: 4 }}>
                      {e.subject} <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>({e.class})</span>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--gray-600)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div>📅 <strong>Date:</strong> {e.date} {e.time ? `at ${e.time}` : ''}</div>
                      <div>📍 <strong>Center:</strong> {e.centerName || 'Not Assigned'}</div>
                      <div>🏛 <strong>Dept & Term:</strong> {e.department || '—'} ({e.term || '—'})</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setViewDetailsExam(e)}
                    >
                      👁️ View Details
                    </button>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => setConfirmDelete(e._id || e.id)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}

              {filteredExams.length === 0 && !loading && (
                <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px dashed var(--gray-300)' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-700)' }}>No scheduled exams found</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Click "+ Create New Exam" above to add your first exam.</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* WIZARD VIEW */}
        {viewMode === 'wizard' && (
          <>
            {crumbs.length > 0 && (
              <div className="wizard-summary">
                {crumbs.map((c, i) => (
                  <span key={i} className="wizard-crumb" style={{ cursor: 'pointer' }} onClick={() => resetWizard(i)}>{c} ✕</span>
                ))}
              </div>
            )}

            {!year && (
              <div className="wizard-step">
                <div className="wizard-step-label">Step 1 — Select Academic Year</div>
                <div className="wizard-options">
                  {years.map(y => (
                    <div key={y} className="wizard-option" onClick={() => setYear(y)}>
                      <span className="wizard-radio" /> {y}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {year && !term && (
              <div className="wizard-step">
                <div className="wizard-step-label">Step 2 — Select Term</div>
                <div className="wizard-options">
                  {terms.map(t => (
                    <div key={t} className="wizard-option" onClick={() => setTerm(t)}>
                      <span className="wizard-radio" /> {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {term && !shift && (
              <div className="wizard-step">
                <div className="wizard-step-label">Step 3 — Select Shift</div>
                <div className="wizard-options">
                  {['Morning', 'Evening'].map(sh => (
                    <div key={sh} className="wizard-option" onClick={() => setShift(sh)}>
                      <span className="wizard-radio" /> {sh}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shift && !department && (
              <div className="wizard-step">
                <div className="wizard-step-label">Step 4 — Select Department</div>
                <div className="wizard-options">
                  {departments.map(d => (
                    <div key={d} className="wizard-option" onClick={() => setDepartment(d)}>
                      <span className="wizard-radio" /> {d}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {department && !subject && (
              <div className="wizard-step">
                <div className="wizard-step-label">Step 5 — Select Subject</div>
                <div className="wizard-options">
                  {subjects.map(sub => (
                    <div key={sub} className="wizard-option" onClick={() => setSubject(sub)}>
                      <span className="wizard-radio" /> {sub}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {examsLoaded && (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginBottom: 14, width: 'auto' }}
                  onClick={() => navigate('/admin/exams/create', { state: { year, term, shift, department, subject } })}
                >
                  + Create Exam for this Combination
                </button>
                <div className="wide-grid">
                  {wizardExams.length === 0 && <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 30 }}>No exams created yet for this specific combination.</div>}
                  {wizardExams.map(e => (
                    <div key={e._id || e.id} className="center-card" style={{ background: '#fff', padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0a1f6b' }}>{e.subject} — {e.class}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{e.date} {e.time && `· ${e.time}`}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>📍 Center: {e.centerName || '—'}</div>
                          <div style={{ marginTop: 6 }}>{examStatusBadge(e.status)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setViewDetailsExam(e)}>👁️ View</button>
                          <button className="btn btn-red btn-sm" onClick={() => setConfirmDelete(e._id || e.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Exam"
        message="Are you sure you want to delete this exam? This will remove all associated duty assignments and attendance records."
      />

      {/* EXAM DETAILS MODAL */}
      {viewDetailsExam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Exam Schedule Details</div>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#0a1f6b', marginTop: 2 }}>{viewDetailsExam.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>Class: <strong>{viewDetailsExam.class}</strong> · {viewDetailsExam.shift || 'Morning'} Shift</div>
              </div>
              {examStatusBadge(viewDetailsExam.status)}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid var(--gray-200)', padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Exam ID', value: viewDetailsExam.examId || viewDetailsExam.id },
                { label: 'Academic Year', value: viewDetailsExam.academicYear },
                { label: 'Term', value: viewDetailsExam.term || '—' },
                { label: 'Department', value: viewDetailsExam.department || '—' },
                { label: 'Exam Date', value: viewDetailsExam.date },
                { label: 'Start Time', value: viewDetailsExam.time || 'Not specified' },
                { label: 'Duration', value: viewDetailsExam.duration ? `${viewDetailsExam.duration} mins (${Math.round(viewDetailsExam.duration / 60 * 10) / 10} hrs)` : '180 mins (Standard 3 hrs)' },
                { label: 'Examination Center', value: viewDetailsExam.centerName || 'Assigned Center' },
                { label: 'Attendance Lock Status', value: viewDetailsExam.status === 'Locked' ? '🔒 Locked (Marking Disabled)' : '🔓 Unlocked (Marking Enabled)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, borderBottom: '1px solid #edf2f7', paddingBottom: 6 }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>{item.label}:</span>
                  <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: 12 }}
                onClick={() => {
                  setViewDetailsExam(null);
                  navigate('/admin/attendance');
                }}
              >
                📊 View Attendance Records for this Exam
              </button>

              <button
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={() => setViewDetailsExam(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// ===== CREATE EXAM =====
export function CreateExam() {
  const { api, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};

  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [centers, setCenters] = useState([]);
  const [createdExamResult, setCreatedExamResult] = useState(null);
  const [classOptions, setClassOptions] = useState([
    'SSC-I', 'SSC-II', 'HSC-I', 'HSC-II',
    'SSC-I Supplementary', 'SSC-II Supplementary',
    'HSC-I Supplementary', 'HSC-II Supplementary'
  ]);

  const [form, setForm] = useState({
    academicYear: prefill.year || '',
    term: prefill.term || '',
    shift: prefill.shift || 'Morning',
    department: prefill.department || '',
    subject: prefill.subject || '',
    class: '',
    date: '',
    time: '',
    duration: '',
    centerId: '',
    allCenters: false
  });

  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { api('/academic/years').then(res => { if (Array.isArray(res)) setYears(res); }).catch(() => {}); }, [api]);
  useEffect(() => { api('/academic/terms').then(res => { if (Array.isArray(res)) setTerms(res); }).catch(() => {}); }, [api]);
  useEffect(() => { api('/academic/classes').then(res => { if (Array.isArray(res)) setClassOptions(res); }).catch(() => {}); }, [api]);
  useEffect(() => { api('/schools').then(res => { if (Array.isArray(res)) setCenters(res); }).catch(() => {}); }, [api]);

  useEffect(() => {
    if (!form.term) return;
    api(`/academic/departments?term=${encodeURIComponent(form.term)}`).then(res => { if (Array.isArray(res)) setDepartments(res); }).catch(() => {});
  }, [api, form.term]);

  useEffect(() => {
    if (!form.department) return;
    api(`/academic/subjects?department=${encodeURIComponent(form.department)}`).then(res => { if (Array.isArray(res)) setSubjects(res); }).catch(() => {});
  }, [api, form.department]);

  const save = async () => {
    if (!form.academicYear || !form.term || !form.department || !form.subject || !form.class || !form.date || (!form.allCenters && !form.centerId)) {
      showToast('Fill all required fields (*)', 'error');
      return;
    }
    setLoading(true);
    try {
      const created = await api('/exams', { method: 'POST', body: JSON.stringify(form) });
      showToast('Exam created successfully! ✓', 'success');
      setCreatedExamResult(created);
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Create Exam" icon="📋" backPath="/admin/exams" />
      <div className="page-content">
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid var(--gray-100)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, color: '#0a1f6b', borderBottom: '1px solid var(--gray-100)', paddingBottom: 8 }}>
            Academic Hierarchy
          </div>

          <div className="input-group">
            <label>Academic Year *</label>
            <select className="input-field" value={form.academicYear} onChange={e => set('academicYear', e.target.value)}>
              <option value="">Select Academic Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Term *</label>
            <select className="input-field" value={form.term} onChange={e => { set('term', e.target.value); set('department', ''); set('subject', ''); }}>
              <option value="">Select Term</option>
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Shift *</label>
            <select className="input-field" value={form.shift} onChange={e => set('shift', e.target.value)}>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </select>
          </div>

          <div className="input-group">
            <label>Department *</label>
            <select className="input-field" value={form.department} onChange={e => { set('department', e.target.value); set('subject', ''); }} disabled={!form.term}>
              <option value="">{form.term ? 'Select Department' : 'Select Term first'}</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Subject *</label>
            <select className="input-field" value={form.subject} onChange={e => set('subject', e.target.value)} disabled={!form.department}>
              <option value="">{form.department ? 'Select Subject' : 'Select Department first'}</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="divider" />

          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, color: '#0a1f6b', borderBottom: '1px solid var(--gray-100)', paddingBottom: 8 }}>
            Exam Scheduling Details
          </div>

          <div className="input-group">
            <label>Class / Level *</label>
            <select className="input-field" value={form.class} onChange={e => set('class', e.target.value)}>
              <option value="">Select Class</option>
              {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ background: '#f0f4ff', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #c7d2fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="allCenters" checked={form.allCenters} onChange={e => set('allCenters', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <label htmlFor="allCenters" style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0a1f6b' }}>
                Assign to All Active Examination Centers
              </label>
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 4, marginLeft: 26 }}>
              {form.allCenters ? 'Will automatically generate separate exam schedules for each active center.' : 'Uncheck to assign to a specific school center below.'}
            </div>
          </div>

          {!form.allCenters && (
            <div className="input-group">
              <label>Examination Center School *</label>
              <SearchableSelect
                placeholder="Search center school..."
                options={centers.map(c => ({ value: c.id, label: `${c.name} (${c.school_id})` }))}
                value={form.centerId}
                onChange={v => set('centerId', v)}
              />
            </div>
          )}

          <div className="input-group">
            <label>Exam Date *</label>
            <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Time</label>
              <input className="input-field" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Duration (min)</label>
              <input className="input-field" type="number" placeholder="e.g. 180" value={form.duration} onChange={e => set('duration', e.target.value)} />
            </div>
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 18, padding: 14, fontSize: 15 }} onClick={save} disabled={loading}>
          {loading ? 'Creating Exam…' : '✅ Create Exam'}
        </button>
      </div>

      {/* CREATED EXAM DETAILS MODAL */}
      {createdExamResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 44 }}>✅</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>Exam Created Successfully!</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Review the details of your newly created exam schedule:</div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid var(--gray-200)', padding: 16, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #edf2f7', paddingBottom: 6 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Subject & Level:</span>
                <strong style={{ color: '#0a1f6b' }}>{form.subject} ({form.class})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #edf2f7', paddingBottom: 6 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Batch / Shift:</span>
                <strong>{form.academicYear} · {form.shift} Shift</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #edf2f7', paddingBottom: 6 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Department & Term:</span>
                <strong>{form.department} ({form.term})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #edf2f7', paddingBottom: 6 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Exam Date:</span>
                <strong>📅 {form.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #edf2f7', paddingBottom: 6 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Scheduled Time:</span>
                <strong>⏰ {form.time || 'Not specified'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #edf2f7', paddingBottom: 6 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Duration:</span>
                <strong>⏱ {form.duration ? `${form.duration} mins (${Math.round(form.duration / 60 * 10) / 10} hrs)` : '180 mins (Standard 3 hrs)'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Assigned Center:</span>
                <strong>{form.allCenters ? 'All Active Centers' : (centers.find(c => c.id === form.centerId)?.name || 'Center Assigned')}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{ flex: '1 1 180px', padding: 12 }}
                onClick={() => navigate('/admin/exams')}
              >
                📋 View in Scheduled Exams
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: '1 1 140px', padding: 12 }}
                onClick={() => {
                  setCreatedExamResult(null);
                  setForm(f => ({ ...f, subject: '', date: '', time: '', duration: '' }));
                }}
              >
                + Create Another Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// ===== EXAMINATION CENTER MANAGEMENT (Board) =====
export function CenterManagement() {
  const { api, showToast } = useApp();
  const [assignments, setAssignments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [homeSchoolId, setHomeSchoolId] = useState('');
  const [centerSchoolId, setCenterSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    api('/centers').then(setAssignments).catch(()=>{});
    api('/schools').then(setSchools).catch(()=>{});
  }, [api]);
  useEffect(()=>{ load(); },[load]);

  // Schools already assigned as home — remove from dropdown (one center per school)
  const assignedHomeIds = new Set(assignments.filter(a => !editId || a._id !== editId).map(a => String(a.homeSchool.id)));
  const availableHomeSchools = schools.filter(s => !assignedHomeIds.has(String(s.id)));

  const save = async () => {
    if (!homeSchoolId || !centerSchoolId) { showToast('Select both schools','error'); return; }
    if (String(homeSchoolId) === String(centerSchoolId)) { showToast('Home and center cannot be the same school','error'); return; }
    setLoading(true);
    try {
      if (editId) { await api(`/centers/${editId}`, { method:'DELETE' }); }
      await api('/centers/assign', { method:'POST', body: JSON.stringify({ homeSchoolId, centerSchoolId }) });
      showToast(editId ? 'Assignment updated! ✓' : 'Center assigned! ✓','success');
      setHomeSchoolId(''); setCenterSchoolId(''); setEditId(null);
      load();
    } catch(e) { showToast(e.message,'error'); }
    setLoading(false);
  };

  const startEdit = (a) => {
    setEditId(a._id);
    setHomeSchoolId(String(a.homeSchool.id));
    setCenterSchoolId(String(a.centerSchool.id));
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const remove = async (id) => {
    try { await api(`/centers/${id}`, { method:'DELETE' }); showToast('Removed','success'); load(); }
    catch(e) { showToast(e.message,'error'); }
    setConfirmDelete(null);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Examination Centers" icon="📍" backPath="/admin" />
      <div className="page-content">
        <div style={{ background:'#e0e8ff', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:11, color:'#0a1f6b', fontWeight:600 }}>
          ℹ A home school can only have ONE center. Multiple home schools can share the same center.
        </div>

        {/* Form */}
        <div style={{ background:'#fff', borderRadius:14, padding:16, border: editId ? '2px solid #d97706' : '1px solid var(--gray-100)', marginBottom:18 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color: editId ? '#d97706' : 'var(--gray-900)' }}>
            {editId ? '✏️ Edit Assignment' : '+ Assign Center'}
          </div>
          <div className="input-group">
            <label>Home School * <span style={{ fontSize:10, color:'var(--gray-400)' }}>(students from this school)</span></label>
            <SearchableSelect placeholder="Search school..." options={availableHomeSchools.map(s=>({ value:s.id, label:`${s.name} (${s.school_id})` }))} value={homeSchoolId} onChange={setHomeSchoolId} />
          </div>
          <div className="input-group">
            <label>Examination Center * <span style={{ fontSize:10, color:'var(--gray-400)' }}>(where exam is held)</span></label>
            <SearchableSelect placeholder="Search center..." options={schools.map(s=>({ value:s.id, label:`${s.name} (${s.school_id})` }))} value={centerSchoolId} onChange={setCenterSchoolId} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={loading}>{loading ? 'Saving…' : editId ? '✓ Update' : 'Assign Center'}</button>
            {editId && <button className="btn btn-ghost btn-sm" onClick={()=>{ setEditId(null); setHomeSchoolId(''); setCenterSchoolId(''); }}>Cancel</button>}
          </div>
        </div>

        {/* List */}
        <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Current Assignments ({assignments.length})</div>
        <div className="wide-grid">
          {assignments.length===0 && <div style={{ textAlign:'center', color:'var(--gray-400)', padding:30 }}>No assignments yet</div>}
          {assignments.map(a=>(
            <div key={a._id} className="center-card" style={{ border: editId===a._id ? '2px solid #d97706' : '1px solid var(--gray-100)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--gray-400)', fontWeight:600, textTransform:'uppercase' }}>Home School</div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>{a.homeSchool.name}</div>
                  <div style={{ fontSize:10, color:'var(--gray-400)' }}>↓ exams held at</div>
                  <div style={{ fontSize:10, color:'var(--gray-400)', fontWeight:600, textTransform:'uppercase', marginTop:6 }}>Center</div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#0a1f6b' }}>📍 {a.centerSchool.name}</div>
                  <div style={{ fontSize:10, color:'var(--gray-400)' }}>{a.centerSchool.schoolId}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>startEdit(a)}>✏️ Edit</button>
                  <button className="btn btn-red btn-sm" onClick={()=>setConfirmDelete(a._id)}>🗑 Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ConfirmModal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} onConfirm={()=>remove(confirmDelete)} title="Remove Assignment" message="Remove this center assignment?" />
    </Page>
  );
}
// ===== ASSIGN DUTY (now done by School/Center Admin — see SchoolPages.jsx) =====
// Kept here as a redirect target only if linked from old bookmarks.

// ===== ATTENDANCE OVERVIEW =====
export function AttendanceOverview() {
  const { api } = useApp();
  const [records, setRecords] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/attendance').catch(() => []),
      api('/exams').catch(() => [])
    ]).then(([attData, examData]) => {
      if (Array.isArray(attData)) setRecords(attData);
      if (Array.isArray(examData)) setExams(examData);
    }).finally(() => setLoading(false));
  }, [api]);

  const filteredRecords = records.filter(r => {
    if (selectedExamId && String(r.examId?.id || r.exam_id) !== String(selectedExamId)) {
      return false;
    }
    if (statusFilter !== 'ALL' && r.status !== statusFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const roll = (r.studentId?.rollNo || '').toLowerCase();
    const name = (r.studentId?.name || '').toLowerCase();
    const uid = (r.studentId?.uniqueId || '').toLowerCase();
    const copy = (r.copyNumber || '').toLowerCase();
    const subject = (r.examId?.subject || '').toLowerCase();
    const center = (r.examId?.centerName || '').toLowerCase();
    const room = (r.classroom || '').toLowerCase();
    const teacher = (r.teacherId?.name || '').toLowerCase();
    const school = (r.studentId?.schoolName || '').toLowerCase();

    return (
      roll.includes(q) ||
      name.includes(q) ||
      uid.includes(q) ||
      copy.includes(q) ||
      subject.includes(q) ||
      center.includes(q) ||
      room.includes(q) ||
      teacher.includes(q) ||
      school.includes(q)
    );
  });

  const totalCount = records.length;
  const presentCount = records.filter(r => r.status === 'Present').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;

  const downloadCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Sr', 'Roll No', 'Student Name', 'Unique ID', 'Class', 'Home School', 'Exam Subject', 'Exam Date', 'Center', 'Room', 'Copy / Sheet No.', 'Status', 'Invigilator', 'Marked Time'];
    const csvRows = [
      headers.join(','),
      ...filteredRecords.map((r, idx) => {
        const markedTime = r.markedAt 
          ? new Date(r.markedAt).toLocaleString().replace(/,/g, ' ') 
          : '—';
        return [
          idx + 1,
          `"${r.studentId?.rollNo || '—'}"`,
          `"${r.studentId?.name || '—'}"`,
          `"${r.studentId?.uniqueId || '—'}"`,
          `"${r.studentId?.class || '—'}"`,
          `"${r.studentId?.schoolName || '—'}"`,
          `"${r.examId?.subject || '—'}"`,
          `"${r.examId?.date || '—'}"`,
          `"${r.examId?.centerName || '—'}"`,
          `"${r.classroom || '—'}"`,
          `"${r.copyNumber || '—'}"`,
          `"${r.status || 'Present'}"`,
          `"${r.teacherId?.name || '—'}"`,
          `"${markedTime}"`
        ].join(',');
      })
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Records_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Attendance Overview" icon="✅" backPath="/admin" />
      <div className="page-content">

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--gray-100)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>Total Records</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0a1f6b', marginTop: 2 }}>{totalCount}</div>
          </div>
          <div style={{ background: '#ecfdf5', borderRadius: 12, padding: '12px 14px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>Present</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#059669', marginTop: 2 }}>{presentCount}</div>
          </div>
          <div style={{ background: '#fef2f2', borderRadius: 12, padding: '12px 14px', border: '1px solid #fecaca', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Absent</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626', marginTop: 2 }}>{absentCount}</div>
          </div>
        </div>

        {/* Filters Card */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid var(--gray-100)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)', display: 'block', marginBottom: 4 }}>Filter by Exam</label>
              <select className="input-field" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                <option value="">All Exams</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.subject} — {e.class} ({e.date}) {e.centerName ? `[${e.centerName}]` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '0 0 130px' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)', display: 'block', marginBottom: 4 }}>Status</label>
              <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <SearchBar placeholder="Search roll no, copy no, student name, center, room..." value={search} onChange={setSearch} />
            </div>
            {filteredRecords.length > 0 && (
              <button className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap', padding: '10px 14px' }} onClick={downloadCSV}>
                📥 Export CSV
              </button>
            )}
          </div>
        </div>

        {/* List of records */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>Loading attendance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40, background: '#fff', borderRadius: 12 }}>
            No matching attendance records found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredRecords.map(r => {
              const studentInitial = (r.studentId?.name && r.studentId?.name !== 'Student') 
                ? r.studentId.name[0].toUpperCase() 
                : (r.studentId?.rollNo ? 'R' : 'S');
              
              const isPresent = r.status === 'Present';

              return (
                <div key={r._id || r.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--gray-100)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    
                    {/* Left: Avatar + Student info */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: isPresent ? '#dcfce7' : '#fee2e2',
                        color: isPresent ? '#15803d' : '#b91c1c',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 16
                      }}>
                        {studentInitial}
                      </div>
                      <div>
                        {/* Roll number pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 800 }}>
                            Roll No: {r.studentId?.rollNo || '—'}
                          </span>
                          {r.studentId?.uniqueId && r.studentId?.uniqueId !== r.studentId?.rollNo && (
                            <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>
                              ID: {r.studentId?.uniqueId}
                            </span>
                          )}
                        </div>

                        {/* Student Name */}
                        {r.studentId?.name && (
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)', marginTop: 4 }}>
                            {r.studentId?.name}
                          </div>
                        )}

                        {/* School & Class */}
                        <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                          {r.studentId?.schoolName ? `🏫 ${r.studentId.schoolName}` : ''} 
                          {r.studentId?.class ? ` · Class: ${r.studentId.class}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status badge */}
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${isPresent ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 11, fontWeight: 800 }}>
                        {r.status || 'Present'}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: 'var(--gray-100)', margin: '10px 0' }} />

                  {/* Bottom meta details: Exam, Center, Room, Copy Number, Invigilator, Time */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 14px', fontSize: 11 }}>
                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Exam: </span>
                      <strong style={{ color: '#0a1f6b' }}>{r.examId?.subject || '—'}</strong> ({r.examId?.class || '—'})
                    </div>

                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Center / Room: </span>
                      <strong style={{ color: 'var(--gray-800)' }}>{r.examId?.centerName || '—'}</strong> · Room: <strong style={{ color: '#0a1f6b' }}>{r.classroom || '—'}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Copy No: </span>
                      <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {r.copyNumber || '—'}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Marked by: </span>
                      <span style={{ color: 'var(--gray-700)', fontWeight: 600 }}>{r.teacherId?.name || 'Invigilator'}</span>
                      {r.markedAt && (
                        <span style={{ color: 'var(--gray-400)', marginLeft: 4 }}>
                          ({new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </Page>
  );
}

// ===== BATCH / ACADEMIC YEAR MANAGEMENT =====
export function BatchManagement() {
  const { api, showToast } = useApp();
  const [batches, setBatches] = useState([]);
  const [newBatch, setNewBatch] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadBatches = useCallback(() => {
    api('/academic/years')
      .then(res => {
        if (Array.isArray(res)) setBatches(res);
      })
      .catch(e => showToast(e.message, 'error'));
  }, [api, showToast]);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // Generate next 3 sequential batch suggestions based on highest year
  const getSuggestions = () => {
    if (batches.length === 0) return ['2026-2027', '2027-2028', '2028-2029'];
    let maxYear = 2025;
    batches.forEach(b => {
      const match = b.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        const y2 = parseInt(match[2]);
        if (y2 > maxYear) maxYear = y2;
      }
    });
    return [
      `${maxYear}-${maxYear + 1}`,
      `${maxYear + 1}-${maxYear + 2}`,
      `${maxYear + 2}-${maxYear + 3}`
    ].filter(s => !batches.includes(s)).slice(0, 3);
  };

  const handleAddBatch = async (batchName) => {
    const target = batchName || newBatch;
    if (!target || !target.trim()) {
      showToast('Please enter a valid batch year (e.g. 2026-2027)', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/academic/years', {
        method: 'POST',
        body: JSON.stringify({ year: target.trim() })
      });
      showToast(res.message || 'Batch year added successfully! ✓', 'success');
      setNewBatch('');
      loadBatches();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  const handleDeleteBatch = async (year) => {
    try {
      await api(`/academic/years/${encodeURIComponent(year)}`, { method: 'DELETE' });
      showToast(`Batch ${year} removed successfully`, 'success');
      loadBatches();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setConfirmDelete(null);
  };

  const suggestions = getSuggestions();
  const currentYearStr = new Date().getFullYear().toString();
  
  const filteredBatches = batches.filter(b => !search || b.toLowerCase().includes(search.toLowerCase()));

  return (
    <Page>
      <Toast />
      <PageHeader title="Manage Batches" icon="📅" backPath="/admin" />
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Banner Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1f6b 0%, #1e3a8a 60%, #3b82f6 100%)',
          borderRadius: 16,
          padding: '24px 24px',
          color: '#fff',
          boxShadow: '0 10px 25px -5px rgba(10, 31, 107, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#93c5fd', marginBottom: 6 }}>
              <span>📅 Curriculum Policy</span>
              <span>•</span>
              <span>Academic System</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
              Academic Batches & Sessions
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6, maxWidth: 600, lineHeight: 1.5 }}>
              Manage registered academic year batches for enrollment, student profile assignments, examination scheduling, and board reports.
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase' }}>Total Active Batches</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>{batches.length} Sessions</div>
              </div>
              {batches.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase' }}>Latest Registered Batch</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', marginTop: 2 }}>{batches[0]}</div>
                </div>
              )}
            </div>
          </div>
          {/* Decorative graphic */}
          <div style={{ position: 'absolute', right: -20, bottom: -30, fontSize: 140, opacity: 0.08, userSelect: 'none', pointerEvents: 'none' }}>
            📆
          </div>
        </div>

        {/* Creator Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 20,
          border: '1px solid var(--gray-200)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>➕ Create New Academic Batch</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>Enter custom batch string or select from quick recommendations</div>
            </div>
            <span className="badge badge-blue" style={{ fontSize: 11, padding: '4px 10px' }}>Format: YYYY-YYYY</span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="input-group" style={{ flex: '1 1 240px', margin: 0 }}>
              <input
                className="input-field"
                style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}
                placeholder="e.g. 2028-2029"
                value={newBatch}
                onChange={e => setNewBatch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddBatch(); }}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '11px 24px', whiteSpace: 'nowrap' }}
              onClick={() => handleAddBatch()}
              disabled={loading}
            >
              {loading ? 'Registering…' : '✨ Add Batch Year'}
            </button>
          </div>

          {/* Quick Suggestions Chips */}
          {suggestions.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Quick Add Recommendations:</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {suggestions.map(sug => (
                  <button
                    key={sug}
                    onClick={() => handleAddBatch(sug)}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)',
                      border: '1px solid #c7d2fe',
                      borderRadius: 20,
                      padding: '5px 14px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#3730a3',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = '#6366f1'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                  >
                    <span>+ Add</span> <strong>{sug}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Registered Academic Batches</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{filteredBatches.length} batch session{filteredBatches.length !== 1 ? 's' : ''} active in system</div>
          </div>
          {batches.length > 3 && (
            <div style={{ width: 'min(240px, 100%)' }}>
              <SearchBar value={search} onChange={setSearch} placeholder="Filter batches..." />
            </div>
          )}
        </div>

        {/* Batches Grid */}
        <div className="wide-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredBatches.map(b => {
            const isCurrent = b.includes(currentYearStr);
            return (
              <div
                key={b}
                className="center-card"
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  padding: 18,
                  border: isCurrent ? '2px solid #2563eb' : '1px solid var(--gray-200)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  gap: 14,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: isCurrent ? 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)' : '#f8fafc',
                      border: `1px solid ${isCurrent ? '#bfdbfe' : '#e2e8f0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0
                    }}>
                      📆
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', letterSpacing: '-0.2px' }}>{b}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 600, marginTop: 1 }}>Academic Session</div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="badge badge-green" style={{ fontSize: 10, padding: '3px 8px' }}>Active Session</span>
                  ) : (
                    <span className="badge badge-blue" style={{ fontSize: 10, padding: '3px 8px' }}>Registered</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>System Standard</span>
                  <button
                    className="btn btn-red btn-sm"
                    style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700 }}
                    onClick={() => setConfirmDelete(b)}
                  >
                    🗑 Remove
                  </button>
                </div>
              </div>
            );
          })}

          {filteredBatches.length === 0 && (
            <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px dashed var(--gray-300)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-700)' }}>No matching batches found</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Add a batch using the form above or clear your search query.</div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDeleteBatch(confirmDelete)}
        title="Remove Batch Year"
        message={`Are you sure you want to remove batch "${confirmDelete}"? This batch option will no longer appear in future selection dropdowns.`}
      />
    </Page>
  );
}


