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
  const [stats, setStats] = useState({ schools:0, teachers:0, students:0, exams:0, pendingResets:0 });

  useEffect(() => {
    Promise.all([
      api('/schools').catch(()=>[]),
      api('/users?role=Teacher').catch(()=>[]),
      api('/users?role=Student').catch(()=>[]),
      api('/exams').catch(()=>[]),
      api('/auth/password-reset-requests/count').catch(()=>({ pendingCount: 0 })),
    ]).then(([schools, teachers, students, exams, resetCount]) => {
      setStats({
        schools: schools.length,
        teachers: teachers.length,
        students: students.length,
        exams: exams.length,
        pendingResets: resetCount.pendingCount || 0
      });
    });
  }, [api]);

  const cards = [
    { label:'Schools',  value: stats.schools,  icon:'🏫', color:'#2255d4', path:'/admin/schools' },
    { label:'Teachers', value: stats.teachers, icon:'👩‍🏫', color:'#0891b2', path:'/admin/users?role=Teacher' },
    { label:'Students', value: stats.students, icon:'🎓', color:'#16a34a', path:'/admin/users?role=Student' },
    { label:'Exams',    value: stats.exams,    icon:'📋', color:'#d97706', path:'/admin/exams' },
  ];

  const actions = [
    { label:'Manage Schools',         icon:'🏫', path:'/admin/schools',           desc:'Add, edit, and manage registered schools' },
    { label:'Manage Users',           icon:'👥', path:'/admin/users',             desc:'Teachers and students across all schools' },
    { label:'Password Reset Requests',icon:'🔐', path:'/admin/password-requests', desc:'Review and reset forgotten passwords for staff & teachers', badge: stats.pendingResets },
    { label:'Manage Exams',           icon:'📋', path:'/admin/exams',             desc:'Year → Term → Department → Subject hierarchy' },
    { label:'Manage Batches',         icon:'📅', path:'/admin/batches',           desc:'Add and manage academic year batches (e.g. 2026-2027)' },
    { label:'Examination Centers',    icon:'📍', path:'/admin/centers',           desc:'Assign schools as exam centers for other schools' },
    { label:'Attendance Overview',    icon:'✅', path:'/admin/attendance',        desc:'View attendance records across all exams' },
    { label:'Analytics',              icon:'📊', path:'/admin/analytics',         desc:'Attendance rates and trends' },
  ];

  return (
    <Page>
      <Toast />
      <AmsHeader title="Board Admin Panel" subtitle="Manage schools, exams, centers, and attendance across the board." />
      <div className="page-content">
        <div style={{ background:'#e0e8ff', borderRadius:12, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#0a1f6b', fontWeight:600 }}>
          👋 Welcome, {currentUser?.name}
        </div>

        {/* Real-time Password Reset Notification Banner */}
        {stats.pendingResets > 0 && (
          <div 
            onClick={() => navigate('/admin/password-requests')}
            style={{ 
              background: '#fff1f2', 
              border: '2px solid #e11d48', 
              borderRadius: 14, 
              padding: '14px 16px', 
              marginBottom: 16, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(225,29,72,0.12)',
              animation: 'pulse 2s infinite'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28 }}>🔔</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#9f1239' }}>
                  {stats.pendingResets} Password Reset Request{stats.pendingResets > 1 ? 's' : ''} Pending!
                </div>
                <div style={{ fontSize: 11, color: '#be123c', marginTop: 2 }}>
                  Teachers or School Admins have requested password resets. Click to review & update.
                </div>
              </div>
            </div>
            <div style={{ background: '#e11d48', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
              Review Now →
            </div>
          </div>
        )}

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
                <div style={{ fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                  {a.label}
                  {a.badge > 0 && (
                    <span style={{ background:'#e11d48', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:800 }}>
                      {a.badge} new
                    </span>
                  )}
                </div>
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

// ===== SCHOOL MANAGEMENT & BULK IMPORT HELPERS =====
const loadXlsxLibrary = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

function downloadSchoolSampleCSV() {
  const headers = "school_name,district,principal_name,cnic,address,phone,email\n";
  const row1 = "Army Public School,Karachi East,Brigadier (R) Tariq Mahmood,4210112345671,Main Malir Cantt,03001234567,aps.karachi@example.edu\n";
  const row2 = "City Model High School,Lahore Central,Prof. Ayesha Siddiqa,3520276543212,Gulberg III Lahore,03219876543,citymodel@example.edu\n";
  const blob = new Blob([headers + row1 + row2], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "sample_schools_import_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===== EDIT SCHOOL MODAL =====
function EditSchoolModal({ open, onClose, school, onSaved, showToast, api }) {
  const [form, setForm] = useState({
    name: '',
    district: '',
    principalName: '',
    principalCnic: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name || '',
        district: school.district || '',
        principalName: school.principal_name || school.admin_name || '',
        principalCnic: (school.principal_cnic || school.admin_cnic || '').replace(/[^0-9]/g, ''),
        address: school.address || '',
        phone: school.phone || school.admin_phone || '',
        email: school.email || school.admin_email || '',
        status: school.status || 'Active',
      });
    }
  }, [school]);

  if (!open || !school) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('School name is required', 'error'); return; }
    if (!form.district.trim()) { showToast('District is required', 'error'); return; }
    if (!form.principalName.trim()) { showToast('Principal name is required', 'error'); return; }
    if (!form.principalCnic.trim()) { showToast('Principal CNIC is required', 'error'); return; }

    setLoading(true);
    try {
      await api(`/schools/${school.id}`, {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      showToast('School & Principal details updated! ✓', 'success');
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 10px 40px rgba(0,0,0,0.2)', padding:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, borderBottom:'1px solid var(--gray-100)', paddingBottom:12 }}>
          <div>
            <h3 style={{ fontSize:17, fontWeight:800, color:'#0a1f6b', margin:0 }}>✏️ Edit School & Principal</h3>
            <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>ID: {school.school_id}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--gray-400)' }}>×</button>
        </div>

        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#f8fafc', padding:14, borderRadius:12, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#0a1f6b', marginBottom:10 }}>🏫 School Information</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div className="input-group" style={{ gridColumn:'1 / -1' }}>
                <label style={{ fontSize:11, fontWeight:700 }}>School Name *</label>
                <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="input-group">
                <label style={{ fontSize:11, fontWeight:700 }}>District *</label>
                <input className="input-field" value={form.district} onChange={e => set('district', e.target.value)} required />
              </div>
              <div className="input-group">
                <label style={{ fontSize:11, fontWeight:700 }}>Status</label>
                <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="input-group" style={{ gridColumn:'1 / -1' }}>
                <label style={{ fontSize:11, fontWeight:700 }}>Campus Address</label>
                <input className="input-field" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Campus address" />
              </div>
              <div className="input-group">
                <label style={{ fontSize:11, fontWeight:700 }}>Official Phone</label>
                <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0300-0000000" />
              </div>
              <div className="input-group">
                <label style={{ fontSize:11, fontWeight:700 }}>Official Email</label>
                <input className="input-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="school@example.edu" />
              </div>
            </div>
          </div>

          <div style={{ background:'#eff6ff', padding:14, borderRadius:12, border:'1px solid #bfdbfe' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1e40af', marginBottom:10 }}>👤 Principal & Login Credentials</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div className="input-group">
                <label style={{ fontSize:11, fontWeight:700 }}>Principal Name *</label>
                <input className="input-field" value={form.principalName} onChange={e => set('principalName', e.target.value)} placeholder="e.g. Prof. Tariq" required />
              </div>
              <div className="input-group">
                <label style={{ fontSize:11, fontWeight:700 }}>Principal CNIC * (No dashes)</label>
                <input 
                  className="input-field" 
                  value={form.principalCnic} 
                  maxLength={13}
                  onChange={e => set('principalCnic', e.target.value.replace(/[^0-9]/g, '').slice(0, 13))} 
                  placeholder="4210112345671 (13 digits)" 
                  required 
                />
              </div>
            </div>

            <div style={{ marginTop:10, fontSize:11, color:'#1e3a8a', background:'#dbeafe', padding:'8px 12px', borderRadius:8 }}>
              💡 <strong>Login Info:</strong> Username is <code>{school.admin_username || school.school_id}</code>. The login password is the Principal's CNIC without dashes (<code>{form.principalCnic || 'CNIC'}</code>).
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== BULK IMPORT MODAL =====
function BulkImportSchoolsModal({ open, onClose, onImportSuccess, showToast, api }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdSummary, setCreatedSummary] = useState(null);

  if (!open) return null;

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setParsing(true);
    try {
      const XLSX = await loadXlsxLibrary();
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rawRows || rawRows.length < 2) {
            showToast('Sheet has no data rows.', 'error');
            setParsing(false);
            return;
          }

          const clean = (v) => (v === undefined || v === null ? '' : String(v).trim().replace(/^["']|["']$/g, '').trim());
          const headerRow = (rawRows[0] || []).map(c => clean(c).toLowerCase().replace(/[^a-z0-9]/g, ''));

          let nameIdx = -1, distIdx = -1, princIdx = -1, cnicIdx = -1, addrIdx = -1, phoneIdx = -1, emailIdx = -1, userIdx = -1;

          headerRow.forEach((col, idx) => {
            if (['schoolname', 'name', 'school', 'institutename', 'institute'].includes(col)) nameIdx = idx;
            else if (['district', 'dist', 'city', 'region', 'area'].includes(col)) distIdx = idx;
            else if (['principalname', 'principal', 'headname', 'head', 'headmaster', 'headmistress'].includes(col)) princIdx = idx;
            else if (['cnic', 'principalcnic', 'nic', 'cnicno', 'identity', 'nationalid'].includes(col)) cnicIdx = idx;
            else if (['address', 'addr', 'location', 'campus'].includes(col)) addrIdx = idx;
            else if (['phone', 'contact', 'mobile', 'cell', 'tel'].includes(col)) phoneIdx = idx;
            else if (['email', 'mail'].includes(col)) emailIdx = idx;
            else if (['username', 'adminusername', 'user'].includes(col)) userIdx = idx;
          });

          // Fallback positional if not named
          if (nameIdx === -1) nameIdx = 0;
          if (distIdx === -1 && headerRow.length > 1) distIdx = 1;
          if (princIdx === -1 && headerRow.length > 2) princIdx = 2;
          if (cnicIdx === -1 && headerRow.length > 3) cnicIdx = 3;

          const rows = [];
          for (let i = 1; i < rawRows.length; i++) {
            const r = rawRows[i];
            if (!r || r.length === 0 || r.every(c => !c)) continue;
            const name = nameIdx !== -1 ? clean(r[nameIdx]) : '';
            const district = distIdx !== -1 ? clean(r[distIdx]) : 'General';
            const principalName = princIdx !== -1 ? clean(r[princIdx]) : '';
            const principalCnic = cnicIdx !== -1 ? clean(r[cnicIdx]).replace(/[^0-9]/g, '') : '';
            const address = addrIdx !== -1 ? clean(r[addrIdx]) : '';
            const phone = phoneIdx !== -1 ? clean(r[phoneIdx]) : '';
            const email = emailIdx !== -1 ? clean(r[emailIdx]) : '';
            const adminUsername = userIdx !== -1 ? clean(r[userIdx]) : '';

            if (name || principalCnic) {
              rows.push({
                name,
                district: district || 'General',
                principalName: principalName || `${name} Principal`,
                principalCnic,
                address,
                phone,
                email,
                adminUsername,
                valid: Boolean(name && principalCnic)
              });
            }
          }

          setParsedRows(rows);
        } catch (err) {
          showToast('Failed to parse sheet: ' + err.message, 'error');
        }
        setParsing(false);
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      showToast('Could not load Excel parser', 'error');
      setParsing(false);
    }
  };

  const handleUploadSubmit = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) {
      showToast('No valid school records to register. School Name and Principal CNIC are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api('/schools/bulk', {
        method: 'POST',
        body: JSON.stringify({ schools: validRows })
      });
      showToast(`Registered ${res.count} schools successfully! ✓`, 'success');
      setCreatedSummary(res.schools || []);
      onImportSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSubmitting(false);
  };

  const downloadCredentialsCSV = () => {
    if (!createdSummary || createdSummary.length === 0) return;
    const header = "School ID,School Name,District,Principal Name,Principal CNIC,Assigned Username,Login Password (CNIC)\n";
    const rows = createdSummary.map(s => `"${s.schoolId}","${s.name}","${s.district}","${s.principalName}","${s.principalCnic}","${s.username}","${s.password}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Registered_Schools_Credentials_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Credentials file downloaded! ✓', 'success');
  };

  const copyAllCredentials = () => {
    if (!createdSummary) return;
    const text = createdSummary.map((s, i) => `${i+1}. ${s.name} (${s.schoolId})\n   Principal: ${s.principalName} | CNIC: ${s.principalCnic}\n   Username: ${s.username}\n   Password: ${s.password}`).join('\n\n');
    navigator.clipboard.writeText(text);
    showToast('All credentials copied to clipboard! 📋', 'success');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:720, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 12px 48px rgba(0,0,0,0.25)', padding:24 }}>
        
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, borderBottom:'1px solid var(--gray-100)', paddingBottom:12 }}>
          <div>
            <h3 style={{ fontSize:18, fontWeight:800, color:'#0a1f6b', margin:0 }}>📥 Bulk Import Schools (Excel / CSV)</h3>
            <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>
              Upload multiple schools at once. Principal CNIC is set as the initial login password.
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'var(--gray-400)' }}>×</button>
        </div>

        {/* If summary exists after import */}
        {createdSummary ? (
          <div>
            <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:12, padding:16, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:32 }}>🎉</div>
              <div style={{ fontSize:16, fontWeight:800, color:'#065f46', marginTop:4 }}>
                {createdSummary.length} School{createdSummary.length !== 1 ? 's' : ''} Registered Successfully!
              </div>
              <div style={{ fontSize:12, color:'#047857', marginTop:2 }}>
                School Admin accounts created with assigned usernames and CNIC passwords.
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <button className="btn btn-primary btn-sm" onClick={downloadCredentialsCSV} style={{ flex:1 }}>
                📥 Download Login Credentials (CSV)
              </button>
              <button className="btn btn-ghost btn-sm" onClick={copyAllCredentials} style={{ background:'#eff6ff', color:'#1e40af', border:'1px solid #bfdbfe', fontWeight:700 }}>
                📋 Copy All
              </button>
            </div>

            <div style={{ maxHeight:260, overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:10 }}>
              <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse', textAlign:'left' }}>
                <thead style={{ background:'#f8fafc', position:'sticky', top:0 }}>
                  <tr style={{ borderBottom:'1px solid #cbd5e1' }}>
                    <th style={{ padding:'8px 10px' }}>School</th>
                    <th style={{ padding:'8px 10px' }}>Principal & CNIC</th>
                    <th style={{ padding:'8px 10px' }}>Assigned Username</th>
                    <th style={{ padding:'8px 10px' }}>Default Password</th>
                  </tr>
                </thead>
                <tbody>
                  {createdSummary.map(s => (
                    <tr key={s.schoolId} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'8px 10px', fontWeight:700 }}>{s.name} <span style={{ color:'var(--gray-400)', fontWeight:500 }}>({s.schoolId})</span></td>
                      <td style={{ padding:'8px 10px' }}>{s.principalName}<br/><span style={{ color:'#0a1f6b', fontFamily:'monospace' }}>{s.principalCnic}</span></td>
                      <td style={{ padding:'8px 10px', fontWeight:700, color:'#16a34a', fontFamily:'monospace' }}>{s.username}</td>
                      <td style={{ padding:'8px 10px', fontFamily:'monospace', color:'#64748b' }}>{s.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Template & Upload Controls */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc', padding:'12px 16px', borderRadius:12, border:'1px solid #e2e8f0', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#0a1f6b' }}>📄 Need the format template?</div>
                <div style={{ fontSize:11, color:'var(--gray-500)' }}>Download a sample sheet with expected column headers.</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={downloadSchoolSampleCSV} style={{ background:'#fff', border:'1px solid #cbd5e1', fontWeight:700, color:'#0a1f6b' }}>
                Download Template (.csv)
              </button>
            </div>

            {/* File Dropzone / Picker */}
            <div style={{ border:'2px dashed #cbd5e1', borderRadius:14, padding:'24px 16px', textAlign:'center', marginBottom:16, background:'#fcfcfd' }}>
              <div style={{ fontSize:32, marginBottom:6 }}>📑</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>Select or Drag Excel / CSV File</div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2, marginBottom:12 }}>Supports .xlsx, .xls, .csv</div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ fontSize:12 }} />
              {parsing && <div style={{ fontSize:12, color:'#2563eb', marginTop:8, fontWeight:600 }}>⏳ Parsing sheet data…</div>}
            </div>

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0a1f6b' }}>
                    Preview: {parsedRows.filter(r => r.valid).length} valid / {parsedRows.length} total rows
                  </div>
                  {parsedRows.some(r => !r.valid) && (
                    <span style={{ fontSize:11, color:'#dc2626', fontWeight:600 }}>⚠ Some rows are missing School Name or CNIC</span>
                  )}
                </div>
                <div style={{ maxHeight:200, overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:10 }}>
                  <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse', textAlign:'left' }}>
                    <thead style={{ background:'#f1f5f9', position:'sticky', top:0 }}>
                      <tr style={{ borderBottom:'1px solid #cbd5e1' }}>
                        <th style={{ padding:'6px 8px' }}>Status</th>
                        <th style={{ padding:'6px 8px' }}>School Name</th>
                        <th style={{ padding:'6px 8px' }}>District</th>
                        <th style={{ padding:'6px 8px' }}>Principal Name</th>
                        <th style={{ padding:'6px 8px' }}>Principal CNIC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: r.valid ? '#fff' : '#fef2f2' }}>
                          <td style={{ padding:'6px 8px' }}>
                            {r.valid ? <span className="badge badge-green" style={{ fontSize:9 }}>Ready</span> : <span className="badge badge-red" style={{ fontSize:9 }}>Invalid</span>}
                          </td>
                          <td style={{ padding:'6px 8px', fontWeight:600 }}>{r.name || '<Missing>'}</td>
                          <td style={{ padding:'6px 8px' }}>{r.district}</td>
                          <td style={{ padding:'6px 8px' }}>{r.principalName}</td>
                          <td style={{ padding:'6px 8px', fontFamily:'monospace', color: r.principalCnic ? '#0a1f6b' : '#dc2626' }}>
                            {r.principalCnic || '<Missing CNIC>'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleUploadSubmit} 
                disabled={submitting || parsedRows.filter(r => r.valid).length === 0}
              >
                {submitting ? 'Registering Schools…' : `Register ${parsedRows.filter(r => r.valid).length} Schools`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SCHOOL MANAGEMENT =====
export function SchoolManagement() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingSchool, setEditingSchool] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const load = useCallback(() => {
    api('/schools')
      .then(setSchools)
      .catch(e => showToast(e.message, 'error'));
  }, [api, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = schools.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.school_id && s.school_id.toLowerCase().includes(q)) ||
      (s.district && s.district.toLowerCase().includes(q)) ||
      (s.principal_name && s.principal_name.toLowerCase().includes(q)) ||
      (s.principal_cnic && s.principal_cnic.toLowerCase().includes(q)) ||
      (s.admin_username && s.admin_username.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (id) => {
    try {
      await api(`/schools/${id}`, { method: 'DELETE' });
      showToast('School deleted successfully ✓', 'success');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const copyCreds = (username, cnic) => {
    navigator.clipboard.writeText(`Username: ${username}\nPassword: ${cnic}`);
    showToast('Credentials copied to clipboard! 📋', 'success');
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Schools Management" icon="🏫" backPath="/admin" />
      <div className="page-content">
        
        {/* Top Actions Bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:16 }}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/schools/add')}>
              + Register School
            </button>
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ background:'#e0e8ff', color:'#0a1f6b', fontWeight:700, border:'1px solid #c7d7ff' }} 
              onClick={() => setShowBulkModal(true)}
            >
              📥 Bulk Import (CSV / Excel)
            </button>
          </div>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ fontSize:11, color:'var(--gray-600)' }} 
            onClick={downloadSchoolSampleCSV}
          >
            📄 Sample Template
          </button>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by School Name, ID, District, Principal, or CNIC…" />

        <div style={{ fontSize:11, color:'var(--gray-500)', margin:'10px 0 14px', fontWeight:600 }}>
          {filtered.length} school{filtered.length !== 1 ? 's' : ''} registered
        </div>

        <div className="wide-grid">
          {filtered.map(s => (
            <div key={s.id} className="center-card" style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-200)', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:800, fontSize:15, color:'#0a1f6b' }}>{s.name}</span>
                    <span style={{ background:'#f1f5f9', color:'#475569', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700, border:'1px solid #cbd5e1' }}>
                      {s.school_id}
                    </span>
                    {statusBadge(s.status)}
                  </div>

                  {s.district && (
                    <div style={{ fontSize:11, color:'#2563eb', fontWeight:700, marginTop:4 }}>
                      📍 {s.district}
                    </div>
                  )}

                  {/* Principal & CNIC details */}
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 12px', marginTop:10 }}>
                    <div style={{ fontSize:11, color:'#334155', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                      <span>👤 Principal:</span>
                      <span style={{ color:'#0f172a' }}>{s.principal_name || s.admin_name || 'Not assigned'}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
                      <span>🪪 CNIC (Password):</span>
                      <span style={{ fontFamily:'monospace', fontWeight:700, color:'#0a1f6b' }}>
                        {s.principal_cnic || s.admin_cnic || '—'}
                      </span>
                    </div>
                    {s.admin_username && (
                      <div style={{ fontSize:11, color:'#16a34a', marginTop:3, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <span style={{ fontWeight:700 }}>🔑 Username: </span>
                          <span style={{ fontFamily:'monospace', fontWeight:800 }}>{s.admin_username}</span>
                        </div>
                        <button 
                          onClick={() => copyCreds(s.admin_username, s.principal_cnic || s.admin_cnic || '')}
                          style={{ background:'#e0f2fe', color:'#0284c7', border:'none', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700, cursor:'pointer' }}
                        >
                          📋 Copy Logins
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contact info */}
                  {(s.address || s.phone || s.email) && (
                    <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:8, display:'flex', flexDirection:'column', gap:2 }}>
                      {s.address && <div>🏢 {s.address}</div>}
                      <div style={{ display:'flex', gap:12 }}>
                        {s.phone && <div>📞 {s.phone}</div>}
                        {s.email && <div>✉ {s.email}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ background:'#eff6ff', color:'#1e40af', border:'1px solid #bfdbfe', fontSize:11, padding:'5px 10px', fontWeight:700 }}
                    onClick={() => setEditingSchool(s)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn btn-red btn-sm" 
                    style={{ fontSize:11, padding:'5px 10px' }}
                    onClick={() => setConfirmDelete(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40, gridColumn:'1 / -1' }}>
              No schools found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Edit School Modal */}
      <EditSchoolModal 
        open={Boolean(editingSchool)} 
        school={editingSchool} 
        onClose={() => setEditingSchool(null)} 
        onSaved={load} 
        showToast={showToast} 
        api={api} 
      />

      {/* Bulk Import Modal */}
      <BulkImportSchoolsModal 
        open={showBulkModal} 
        onClose={() => setShowBulkModal(false)} 
        onImportSuccess={load} 
        showToast={showToast} 
        api={api} 
      />

      {/* Delete Confirmation */}
      <ConfirmModal 
        open={!!confirmDelete} 
        onClose={() => setConfirmDelete(null)} 
        onConfirm={() => handleDelete(confirmDelete)} 
        title="Delete School" 
        message="This will permanently delete the school, its School Admin account, teachers, and student records. This cannot be undone." 
      />
    </Page>
  );
}

export function AddSchool() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [form, setForm] = useState({
    name: '',
    district: '',
    principalName: '',
    principalCnic: '',
    address: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [createdInfo, setCreatedInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  const save = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'School name is required';
    if (!form.district.trim()) errs.district = 'District is required';
    if (!form.principalName.trim()) errs.principalName = 'Principal name is required';
    if (!form.principalCnic.trim()) {
      errs.principalCnic = 'Principal CNIC is required (13 digits)';
    } else if (form.principalCnic.length !== 13) {
      errs.principalCnic = 'CNIC must be exactly 13 digits without dashes';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('⚠️ Please fill all required fields highlighted in red', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api('/schools', { method:'POST', body: JSON.stringify(form) });
      showToast('🎉 School registered successfully!', 'success');
      setCreatedInfo({
        school: res.school,
        username: res.adminUser?.username,
        password: res.adminUser?.plainPassword || form.principalCnic,
        principal: res.school?.principal_name,
      });
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  const copyCreds = () => {
    if (!createdInfo) return;
    navigator.clipboard.writeText(`School: ${createdInfo.school?.name} (${createdInfo.school?.school_id})\nPrincipal: ${createdInfo.principal}\nUsername: ${createdInfo.username}\nPassword: ${createdInfo.password}`);
    showToast('Credentials copied to clipboard! 📋', 'success');
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Register School" icon="🏫" backPath="/admin/schools" />
      <div className="page-content">

        {createdInfo ? (
          <div className="card" style={{ background:'#fff', borderRadius:16, padding:24, border:'1px solid #bbf7d0', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign:'center', marginBottom:18 }}>
              <div style={{ fontSize:40 }}>🎉</div>
              <h3 style={{ fontSize:18, fontWeight:800, color:'#166534', margin:'8px 0 4px' }}>School Registered Successfully!</h3>
              <p style={{ fontSize:12, color:'#15803d', margin:0 }}>Share these login credentials with the Principal / School Admin.</p>
            </div>

            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:16, marginBottom:18 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#166534', marginBottom:8 }}>
                🏫 {createdInfo.school?.name} ({createdInfo.school?.school_id})
              </div>
              <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>
                <strong>Principal:</strong> {createdInfo.principal}
              </div>
              <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>
                <strong>Assigned Username:</strong> <span style={{ fontFamily:'monospace', fontWeight:700, color:'#16a34a' }}>{createdInfo.username}</span>
              </div>
              <div style={{ fontSize:12, color:'#334155' }}>
                <strong>Login Password (CNIC):</strong> <span style={{ fontFamily:'monospace', fontWeight:700, color:'#0a1f6b' }}>{createdInfo.password}</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1, border:'1px solid #cbd5e1' }} onClick={copyCreds}>
                📋 Copy Credentials
              </button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={() => navigate('/admin/schools')}>
                Done → View Schools
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* School Info */}
            <div className="card" style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'#0a1f6b' }}>
                🏫 School Information
              </div>
              <div className={`input-group ${errors.name ? 'has-error' : ''}`}>
                <label>School Name <span className="req-star">*</span></label>
                <input 
                  className={`input-field ${errors.name ? 'input-error' : ''}`}
                  placeholder="e.g. Army Public School or City Model High School" 
                  value={form.name} 
                  onChange={e => set('name', e.target.value)} 
                />
                {errors.name && <div className="field-error-msg">⚠️ {errors.name}</div>}
              </div>
              <div className={`input-group ${errors.district ? 'has-error' : ''}`}>
                <label>District <span className="req-star">*</span></label>
                <input 
                  className={`input-field ${errors.district ? 'input-error' : ''}`}
                  placeholder="e.g. Karachi East, Lahore Central, Faisalabad" 
                  value={form.district} 
                  onChange={e => set('district', e.target.value)} 
                />
                {errors.district && <div className="field-error-msg">⚠️ {errors.district}</div>}
              </div>
              <div className="input-group">
                <label>Campus Address</label>
                <input 
                  className="input-field" 
                  placeholder="e.g. Main Boulevard, Block 4" 
                  value={form.address} 
                  onChange={e => set('address', e.target.value)} 
                />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="input-group">
                  <label>Official Phone</label>
                  <input 
                    className="input-field" 
                    placeholder="0300-0000000" 
                    value={form.phone} 
                    onChange={e => set('phone', e.target.value)} 
                  />
                </div>
                <div className="input-group">
                  <label>Official Email</label>
                  <input 
                    className="input-field" 
                    placeholder="school@example.edu" 
                    value={form.email} 
                    onChange={e => set('email', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Principal & Login Details */}
            <div className="card" style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginTop:14 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'#0a1f6b' }}>
                👤 Principal & Login Account
              </div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:12 }}>
                The Principal's CNIC will be used as their default password to log in.
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className={`input-group ${errors.principalName ? 'has-error' : ''}`}>
                  <label>Principal Name <span className="req-star">*</span></label>
                  <input 
                    className={`input-field ${errors.principalName ? 'input-error' : ''}`}
                    placeholder="e.g. Prof. Tariq Mahmood" 
                    value={form.principalName} 
                    onChange={e => set('principalName', e.target.value)} 
                  />
                  {errors.principalName && <div className="field-error-msg">⚠️ {errors.principalName}</div>}
                </div>
                <div className={`input-group ${errors.principalCnic ? 'has-error' : ''}`}>
                  <label>Principal CNIC <span className="req-star">*</span> <span style={{ color:'var(--gray-400)', textTransform:'none', fontWeight:400 }}>(13 digits)</span></label>
                  <input 
                    className={`input-field ${errors.principalCnic ? 'input-error' : ''}`}
                    placeholder="e.g. 4210112345671" 
                    value={form.principalCnic} 
                    maxLength={13}
                    onChange={e => set('principalCnic', e.target.value.replace(/[^0-9]/g, '').slice(0, 13))} 
                  />
                  {errors.principalCnic && <div className="field-error-msg">⚠️ {errors.principalCnic}</div>}
                </div>
              </div>

              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px', marginTop:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#1e40af' }}>⚡ Automatic Account Setup:</div>
                <div style={{ fontSize:11, color:'#1e3a8a', marginTop:2 }}>
                  • <strong>Username:</strong> Automatically assigned from school sequence (e.g. <code>SCH-001</code>)<br />
                  • <strong>Password:</strong> Principal's CNIC without dashes ({form.principalCnic || '13-digit CNIC'})
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={save} disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Registering School…</> : '+ Register School'}
            </button>
          </>
        )}
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
          <div className="input-group">
            <label>Role <span className="req-star">*</span></label>
            <select className="input-field" value={form.role} onChange={e=>set('role',e.target.value)}>
              <option value="Teacher">Teacher</option>
              <option value="Student">Student</option>
            </select>
          </div>
          <div className={`input-group ${errors.schoolId ? 'has-error' : ''}`}>
            <label>School <span className="req-star">*</span></label>
            <SearchableSelect
              placeholder="Search school..."
              options={schools.map(s => ({ value: s.id, label: `${s.name} (${s.school_id})` }))}
              value={form.schoolId}
              onChange={v => set('schoolId', v)}
              error={errors.schoolId}
            />
          </div>
          <div className={`input-group ${errors.name ? 'has-error' : ''}`}>
            <label>Full Name <span className="req-star">*</span></label>
            <input className={`input-field ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={e=>set('name',e.target.value)} />
            {errors.name && <div className="field-error-msg">⚠️ {errors.name}</div>}
          </div>
          <div className="input-group"><label>Email</label><input className="input-field" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
          <div className="input-group"><label>Phone</label><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
          {form.role==='Student' && (
            <>
              <div className={`input-group ${errors.class ? 'has-error' : ''}`}>
                <label>Class <span className="req-star">*</span></label>
                <select className={`input-field ${errors.class ? 'input-error' : ''}`} value={form.class} onChange={e=>set('class',e.target.value)}>
                  <option value="">Select Class</option>
                  {['SSC-I','SSC-II','HSC-I','HSC-II','SSC-I Supplementary','SSC-II Supplementary','HSC-I Supplementary','HSC-II Supplementary'].map(c=><option key={c}>{c}</option>)}
                </select>
                {errors.class && <div className="field-error-msg">⚠️ {errors.class}</div>}
              </div>
              <div className={`input-group ${errors.rollNo ? 'has-error' : ''}`}>
                <label>Roll No <span className="req-star">*</span></label>
                <input className={`input-field ${errors.rollNo ? 'input-error' : ''}`} value={form.rollNo} onChange={e=>set('rollNo',e.target.value)} />
                {errors.rollNo && <div className="field-error-msg">⚠️ {errors.rollNo}</div>}
              </div>
            </>
          )}
          <div className="divider" />
          {form.role === 'Teacher' && (
            <>
              <div className={`input-group ${errors.username ? 'has-error' : ''}`}>
                <label>Username <span className="req-star">*</span></label>
                <input className={`input-field ${errors.username ? 'input-error' : ''}`} value={form.username} onChange={e=>set('username',e.target.value)} />
                {errors.username && <div className="field-error-msg">⚠️ {errors.username}</div>}
              </div>
              <div className={`input-group ${errors.password ? 'has-error' : ''}`}>
                <label>Password <span className="req-star">*</span></label>
                <input className={`input-field ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={e=>set('password',e.target.value)} />
                {errors.password && <div className="field-error-msg">⚠️ {errors.password}</div>}
              </div>
            </>
          )}
          {form.role === 'Student' && (
            <div style={{ background:'#f0f4ff', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#0a1f6b', fontWeight:600 }}>
              ℹ Username & password will be auto-generated from student name + roll number.
            </div>
          )}
        </div>
        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={save} disabled={loading}>
          {loading ? <><span className="btn-spinner" /> Creating User…</> : '+ Create User'}
        </button>
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

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

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
    const errs = {};
    if (!form.academicYear) errs.academicYear = 'Academic Year is required';
    if (!form.term) errs.term = 'Term is required';
    if (!form.department) errs.department = 'Department is required';
    if (!form.subject) errs.subject = 'Subject is required';
    if (!form.class) errs.class = 'Class is required';
    if (!form.date) errs.date = 'Exam Date is required';
    if (!form.allCenters && !form.centerId) errs.centerId = 'Examination Center School is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('⚠️ Please fill in all required fields marked with *', 'error');
      return;
    }

    setLoading(true);
    try {
      const created = await api('/exams', { method: 'POST', body: JSON.stringify(form) });
      showToast('🎉 Exam created successfully!', 'success');
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

          <div className={`input-group ${errors.academicYear ? 'has-error' : ''}`}>
            <label>Academic Year <span className="req-star">*</span></label>
            <select className={`input-field ${errors.academicYear ? 'input-error' : ''}`} value={form.academicYear} onChange={e => set('academicYear', e.target.value)}>
              <option value="">Select Academic Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {errors.academicYear && <div className="field-error-msg">⚠️ {errors.academicYear}</div>}
          </div>

          <div className={`input-group ${errors.term ? 'has-error' : ''}`}>
            <label>Term <span className="req-star">*</span></label>
            <select className={`input-field ${errors.term ? 'input-error' : ''}`} value={form.term} onChange={e => { set('term', e.target.value); set('department', ''); set('subject', ''); }}>
              <option value="">Select Term</option>
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.term && <div className="field-error-msg">⚠️ {errors.term}</div>}
          </div>

          <div className="input-group">
            <label>Shift <span className="req-star">*</span></label>
            <select className="input-field" value={form.shift} onChange={e => set('shift', e.target.value)}>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </select>
          </div>

          <div className={`input-group ${errors.department ? 'has-error' : ''}`}>
            <label>Department <span className="req-star">*</span></label>
            <select className={`input-field ${errors.department ? 'input-error' : ''}`} value={form.department} onChange={e => { set('department', e.target.value); set('subject', ''); }} disabled={!form.term}>
              <option value="">{form.term ? 'Select Department' : 'Select Term first'}</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && <div className="field-error-msg">⚠️ {errors.department}</div>}
          </div>

          <div className={`input-group ${errors.subject ? 'has-error' : ''}`}>
            <label>Subject <span className="req-star">*</span></label>
            <select className={`input-field ${errors.subject ? 'input-error' : ''}`} value={form.subject} onChange={e => set('subject', e.target.value)} disabled={!form.department}>
              <option value="">{form.department ? 'Select Subject' : 'Select Department first'}</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.subject && <div className="field-error-msg">⚠️ {errors.subject}</div>}
          </div>

          <div className="divider" />

          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, color: '#0a1f6b', borderBottom: '1px solid var(--gray-100)', paddingBottom: 8 }}>
            Exam Scheduling Details
          </div>

          <div className={`input-group ${errors.class ? 'has-error' : ''}`}>
            <label>Class / Level <span className="req-star">*</span></label>
            <select className={`input-field ${errors.class ? 'input-error' : ''}`} value={form.class} onChange={e => set('class', e.target.value)}>
              <option value="">Select Class</option>
              {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.class && <div className="field-error-msg">⚠️ {errors.class}</div>}
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
            <div className={`input-group ${errors.centerId ? 'has-error' : ''}`}>
              <label>Examination Center School <span className="req-star">*</span></label>
              <SearchableSelect
                placeholder="Search center school..."
                options={centers.map(c => ({ value: c.id, label: `${c.name} (${c.school_id})` }))}
                value={form.centerId}
                onChange={v => set('centerId', v)}
                error={errors.centerId}
              />
            </div>
          )}

          <div className={`input-group ${errors.date ? 'has-error' : ''}`}>
            <label>Exam Date <span className="req-star">*</span></label>
            <input className={`input-field ${errors.date ? 'input-error' : ''}`} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            {errors.date && <div className="field-error-msg">⚠️ {errors.date}</div>}
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
          {loading ? <><span className="btn-spinner" /> Creating Exam…</> : '✅ Create Exam'}
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
// ===== DOWNLOAD SAMPLE CENTERS CSV =====
function downloadCenterSampleCSV() {
  const headers = ['home_school_code', 'center_school_code', 'home_school_name', 'center_school_name'];
  const sampleData = [
    ['SCH-001', 'SCH-002', 'Govt Boys High School No. 1', 'City Model Degree College (Exam Center)'],
    ['SCH-003', 'SCH-002', 'Army Public School Campus A', 'City Model Degree College (Exam Center)'],
    ['SCH-004', 'SCH-005', 'Beaconhouse Secondary School', 'Govt Higher Secondary School']
  ];
  const csvContent = [headers.join(','), ...sampleData.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'center_assignments_sample.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===== BULK IMPORT CENTERS MODAL =====
function BulkImportCentersModal({ open, onClose, schools, onImportSuccess }) {
  const { api, showToast } = useApp();
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  if (!open) return null;

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setParsing(true);
    try {
      const XLSX = await loadXlsxLibrary();
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rawRows || rawRows.length < 2) {
            showToast('Sheet has no data rows.', 'error');
            setParsing(false);
            return;
          }

          const clean = (v) => (v === undefined || v === null ? '' : String(v).trim().replace(/^["']|["']$/g, '').trim());
          const headerRow = (rawRows[0] || []).map(c => clean(c).toLowerCase().replace(/[^a-z0-9]/g, ''));

          let homeCodeIdx = -1, centerCodeIdx = -1, homeNameIdx = -1, centerNameIdx = -1;

          headerRow.forEach((col, idx) => {
            if (['homeschoolcode', 'homecode', 'homeschoolid', 'schoolcode', 'schoolid'].includes(col)) homeCodeIdx = idx;
            else if (['centerschoolcode', 'centercode', 'centerschoolid', 'centerid', 'examcenterid', 'center_code'].includes(col)) centerCodeIdx = idx;
            else if (['homeschoolname', 'homeschool', 'homename', 'schoolname'].includes(col)) homeNameIdx = idx;
            else if (['centerschoolname', 'centerschool', 'centername', 'examcentername', 'center'].includes(col)) centerNameIdx = idx;
          });

          // Positional fallback
          if (homeCodeIdx === -1 && homeNameIdx === -1) homeCodeIdx = 0;
          if (centerCodeIdx === -1 && centerNameIdx === -1 && headerRow.length > 1) centerCodeIdx = 1;
          if (homeNameIdx === -1 && headerRow.length > 2) homeNameIdx = 2;
          if (centerNameIdx === -1 && headerRow.length > 3) centerNameIdx = 3;

          // Build school lookup map
          const schoolMapByCode = new Map();
          const schoolMapByName = new Map();
          schools.forEach(s => {
            if (s.school_id) schoolMapByCode.set(String(s.school_id).trim().toLowerCase(), s);
            if (s.name) schoolMapByName.set(String(s.name).trim().toLowerCase(), s);
          });

          const findLocalSchool = (code, name) => {
            if (code && schoolMapByCode.has(String(code).trim().toLowerCase())) return schoolMapByCode.get(String(code).trim().toLowerCase());
            if (name && schoolMapByName.has(String(name).trim().toLowerCase())) return schoolMapByName.get(String(name).trim().toLowerCase());
            return null;
          };

          const rows = [];
          for (let i = 1; i < rawRows.length; i++) {
            const r = rawRows[i];
            if (!r || r.length === 0 || r.every(c => !c)) continue;

            const homeCode = homeCodeIdx !== -1 ? clean(r[homeCodeIdx]) : '';
            const centerCode = centerCodeIdx !== -1 ? clean(r[centerCodeIdx]) : '';
            const homeName = homeNameIdx !== -1 ? clean(r[homeNameIdx]) : '';
            const centerName = centerNameIdx !== -1 ? clean(r[centerNameIdx]) : '';

            if (homeCode || centerCode || homeName || centerName) {
              const matchedHome = findLocalSchool(homeCode, homeName);
              const matchedCenter = findLocalSchool(centerCode, centerName);

              let valid = true;
              let error = '';

              if (!matchedHome) {
                valid = false;
                error = `Home school "${homeCode || homeName}" not found`;
              } else if (!matchedCenter) {
                valid = false;
                error = `Center school "${centerCode || centerName}" not found`;
              } else if (matchedHome.id === matchedCenter.id) {
                valid = false;
                error = 'Home and Center cannot be the same school';
              }

              rows.push({
                homeSchoolCode: homeCode || matchedHome?.school_id || '',
                centerSchoolCode: centerCode || matchedCenter?.school_id || '',
                homeSchoolName: homeName || matchedHome?.name || '',
                centerSchoolName: centerName || matchedCenter?.name || '',
                homeSchoolId: matchedHome?.id,
                centerSchoolId: matchedCenter?.id,
                matchedHomeName: matchedHome?.name,
                matchedCenterName: matchedCenter?.name,
                valid,
                error
              });
            }
          }

          setParsedRows(rows);
        } catch (err) {
          showToast('Failed to parse sheet: ' + err.message, 'error');
        }
        setParsing(false);
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      showToast('Could not load Excel parser', 'error');
      setParsing(false);
    }
  };

  const handleUploadSubmit = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) {
      showToast('No valid center assignments found to import.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api('/centers/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ assignments: validRows })
      });
      showToast(res.message || 'Center assignments imported! ✓', 'success');
      setImportSummary(res);
      onImportSuccess();
    } catch (err) {
      showToast(err.message || 'Bulk assignment failed', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:760, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 12px 48px rgba(0,0,0,0.25)', padding:24 }}>
        
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, borderBottom:'1px solid var(--gray-100)', paddingBottom:12 }}>
          <div>
            <h3 style={{ fontSize:18, fontWeight:800, color:'#0a1f6b', margin:0 }}>📥 Bulk Import Centers (CSV / Excel)</h3>
            <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>
              Upload exam center allocations in bulk. Home schools will be assigned to their designated exam centers.
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'var(--gray-400)' }}>×</button>
        </div>

        {/* Summary Screen after Import */}
        {importSummary ? (
          <div>
            <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:12, padding:20, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:36 }}>🎉</div>
              <div style={{ fontSize:17, fontWeight:800, color:'#065f46', marginTop:4 }}>
                {importSummary.assignedCount} Center Assignments Created / Updated!
              </div>
              {importSummary.skippedCount > 0 && (
                <div style={{ fontSize:12, color:'#b45309', marginTop:4 }}>
                  ⚠️ {importSummary.skippedCount} rows were skipped due to errors.
                </div>
              )}
            </div>

            <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Template & Download */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc', padding:'12px 16px', borderRadius:12, border:'1px solid #e2e8f0', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#0a1f6b' }}>📄 Need the format template?</div>
                <div style={{ fontSize:11, color:'var(--gray-500)' }}>Download a sample sheet with expected column headers (home_school_code, center_school_code).</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={downloadCenterSampleCSV} style={{ background:'#fff', border:'1px solid #cbd5e1', fontWeight:700, color:'#0a1f6b' }}>
                Download Template (.csv)
              </button>
            </div>

            {/* Dropzone */}
            <div style={{ border:'2px dashed #cbd5e1', borderRadius:14, padding:'24px 16px', textAlign:'center', marginBottom:16, background:'#fcfcfd' }}>
              <div style={{ fontSize:32, marginBottom:6 }}>📑</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>Select or Drag Excel / CSV File</div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2, marginBottom:12 }}>Supports .xlsx, .xls, .csv</div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ fontSize:12 }} />
              {parsing && <div style={{ fontSize:12, color:'#2563eb', marginTop:8, fontWeight:600 }}>⏳ Parsing sheet data…</div>}
            </div>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0a1f6b' }}>
                    Preview: {parsedRows.filter(r => r.valid).length} valid / {parsedRows.length} total rows
                  </div>
                  {parsedRows.some(r => !r.valid) && (
                    <span style={{ fontSize:11, color:'#dc2626', fontWeight:600 }}>⚠️ Some rows cannot be matched with existing schools</span>
                  )}
                </div>
                <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:10 }}>
                  <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse', textAlign:'left' }}>
                    <thead style={{ background:'#f1f5f9', position:'sticky', top:0 }}>
                      <tr style={{ borderBottom:'1px solid #cbd5e1' }}>
                        <th style={{ padding:'6px 8px' }}>Status</th>
                        <th style={{ padding:'6px 8px' }}>Home School</th>
                        <th style={{ padding:'6px 8px' }}>Exam Center School</th>
                        <th style={{ padding:'6px 8px' }}>Notes / Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: r.valid ? '#fff' : '#fef2f2' }}>
                          <td style={{ padding:'6px 8px' }}>
                            {r.valid ? <span className="badge badge-green" style={{ fontSize:9 }}>Ready</span> : <span className="badge badge-red" style={{ fontSize:9 }}>Invalid</span>}
                          </td>
                          <td style={{ padding:'6px 8px', fontWeight:600 }}>
                            {r.matchedHomeName || r.homeSchoolName || r.homeSchoolCode}
                            {r.homeSchoolCode && <span style={{ color:'var(--gray-400)', fontWeight:400, marginLeft:4 }}>({r.homeSchoolCode})</span>}
                          </td>
                          <td style={{ padding:'6px 8px', fontWeight:700, color: r.valid ? '#0a1f6b' : '#dc2626' }}>
                            📍 {r.matchedCenterName || r.centerSchoolName || r.centerSchoolCode}
                            {r.centerSchoolCode && <span style={{ color:'var(--gray-400)', fontWeight:400, marginLeft:4 }}>({r.centerSchoolCode})</span>}
                          </td>
                          <td style={{ padding:'6px 8px', color: r.valid ? '#16a34a' : '#dc2626', fontSize:10 }}>
                            {r.valid ? 'Valid Allocation' : r.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, borderTop:'1px solid var(--gray-100)', paddingTop:14 }}>
              <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleUploadSubmit}
                disabled={submitting || parsedRows.filter(r => r.valid).length === 0}
              >
                {submitting ? 'Importing Centers…' : `Import ${parsedRows.filter(r => r.valid).length} Center Assignments`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

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
      setHomeSchoolId(''); setCenterSchoolId(''); setEditId(null); setShowManualForm(false);
      load();
    } catch(e) { showToast(e.message,'error'); }
    setLoading(false);
  };

  const startEdit = (a) => {
    setEditId(a._id);
    setHomeSchoolId(String(a.homeSchool.id));
    setCenterSchoolId(String(a.centerSchool.id));
    setShowManualForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const remove = async (id) => {
    try { await api(`/centers/${id}`, { method:'DELETE' }); showToast('Removed','success'); load(); }
    catch(e) { showToast(e.message,'error'); }
    setConfirmDelete(null);
  };

  const downloadAssignmentsCSV = () => {
    if (assignments.length === 0) {
      showToast('No center assignments to export', 'error');
      return;
    }
    const headers = ['Home School Name', 'Home School Code', 'Center School Name', 'Center School Code', 'Assigned Date'];
    const rows = assignments.map(a => [
      `"${a.homeSchool?.name || ''}"`,
      `"${a.homeSchool?.schoolId || ''}"`,
      `"${a.centerSchool?.name || ''}"`,
      `"${a.centerSchool?.schoolId || ''}"`,
      `"${a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'exam_center_assignments.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Center assignments exported to CSV! ✓', 'success');
  };

  const filteredAssignments = assignments.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.homeSchool?.name || '').toLowerCase().includes(q) ||
      (a.homeSchool?.schoolId || '').toLowerCase().includes(q) ||
      (a.centerSchool?.name || '').toLowerCase().includes(q) ||
      (a.centerSchool?.schoolId || '').toLowerCase().includes(q)
    );
  });

  return (
    <Page>
      <Toast />
      <PageHeader title="Examination Centers" icon="📍" backPath="/admin" />
      <div className="page-content">
        <div style={{ background:'#e0e8ff', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:11, color:'#0a1f6b', fontWeight:600 }}>
          ℹ A home school can only have ONE center. Multiple home schools can share the same center. You can assign centers manually or bulk upload via CSV/Excel.
        </div>

        {/* Action Header */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowBulkModal(true)}
            style={{ display:'flex', alignItems:'center', gap:6, background:'#0a1f6b' }}
          >
            📥 Bulk Import Centers (CSV / Excel)
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowManualForm(!showManualForm)}
            style={{ background:'#fff', border:'1px solid var(--gray-300)', fontWeight:700 }}
          >
            {showManualForm ? '✕ Close Manual Form' : '+ Manual Assign Center'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={downloadCenterSampleCSV}
            style={{ background:'#fff', border:'1px solid var(--gray-300)', color:'var(--gray-700)' }}
          >
            📄 Sample CSV
          </button>
          {assignments.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={downloadAssignmentsCSV}
              style={{ background:'#fff', border:'1px solid var(--gray-300)', marginLeft:'auto' }}
            >
              📥 Export CSV ({assignments.length})
            </button>
          )}
        </div>

        {/* Manual Assign / Edit Form */}
        {(showManualForm || editId) && (
          <div style={{ background:'#fff', borderRadius:14, padding:16, border: editId ? '2px solid #d97706' : '1px solid var(--gray-100)', marginBottom:18 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color: editId ? '#d97706' : 'var(--gray-900)' }}>
              {editId ? '✏️ Edit Assignment' : '+ Assign Center (Manual)'}
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
        )}

        {/* Search Bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>
            Current Center Allocations ({filteredAssignments.length}{filteredAssignments.length !== assignments.length ? ` of ${assignments.length}` : ''})
          </div>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Search school or center..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth:240, padding:'6px 10px', fontSize:12 }}
          />
        </div>

        {/* List */}
        <div className="wide-grid">
          {filteredAssignments.length===0 && (
            <div style={{ textAlign:'center', color:'var(--gray-400)', padding:30 }}>
              {searchQuery ? 'No matching assignments found' : 'No center assignments yet. Upload a CSV file or assign manually.'}
            </div>
          )}
          {filteredAssignments.map(a=>(
            <div key={a._id} className="center-card" style={{ border: editId===a._id ? '2px solid #d97706' : '1px solid var(--gray-100)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--gray-400)', fontWeight:600, textTransform:'uppercase' }}>Home School</div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>
                    {a.homeSchool.name} <span style={{ color:'var(--gray-400)', fontWeight:400 }}>({a.homeSchool.schoolId})</span>
                  </div>
                  <div style={{ fontSize:10, color:'var(--gray-400)' }}>↓ exams conducted at</div>
                  <div style={{ fontSize:10, color:'var(--gray-400)', fontWeight:600, textTransform:'uppercase', marginTop:6 }}>Examination Center</div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#0a1f6b' }}>📍 {a.centerSchool.name}</div>
                  <div style={{ fontSize:10, color:'var(--gray-400)' }}>Center Code: {a.centerSchool.schoolId}</div>
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

      <BulkImportCentersModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        schools={schools}
        onImportSuccess={load}
      />

      <ConfirmModal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} onConfirm={()=>remove(confirmDelete)} title="Remove Assignment" message="Remove this center assignment?" />
    </Page>
  );
}
// ===== ASSIGN DUTY (now done by School/Center Admin — see SchoolPages.jsx) =====
// Kept here as a redirect target only if linked from old bookmarks.

// ===== ATTENDANCE OVERVIEW =====
export function AttendanceOverview() {
  const { api, currentUser } = useApp();
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
    const teacherUid = (r.teacherId?.uniqueId || '').toLowerCase();
    const school = (r.studentId?.schoolName || '').toLowerCase();
    const device = (r.deviceInfo || '').toLowerCase();
    const loc = (r.locationAddress || '').toLowerCase();
    const ip = (r.ipAddress || '').toLowerCase();

    return (
      roll.includes(q) ||
      name.includes(q) ||
      uid.includes(q) ||
      copy.includes(q) ||
      subject.includes(q) ||
      center.includes(q) ||
      room.includes(q) ||
      teacher.includes(q) ||
      teacherUid.includes(q) ||
      school.includes(q) ||
      device.includes(q) ||
      loc.includes(q) ||
      ip.includes(q)
    );
  });

  const totalCount = records.length;
  const presentCount = records.filter(r => r.status === 'Present').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;

  const downloadCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Sr',
      'Roll No',
      'Student Name',
      'Unique ID',
      'Class',
      'Home School',
      'Exam Subject',
      'Exam Date',
      'Center',
      'Block',
      'Copy / Sheet No.',
      'Status',
      'Invigilator Name',
      'Invigilator ID',
      'Latitude',
      'Longitude',
      'Location / Coordinates',
      'Google Maps Link',
      'Device Info',
      'IP Address',
      'Marked Time'
    ];
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
          `"${r.teacherId?.uniqueId || '—'}"`,
          `"${r.latitude ?? '—'}"`,
          `"${r.longitude ?? '—'}"`,
          `"${r.locationAddress || (r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : '—')}"`,
          `"${r.googleMapsUrl || '—'}"`,
          `"${r.deviceInfo || '—'}"`,
          `"${r.ipAddress || '—'}"`,
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

  const backPath = currentUser?.role === 'SchoolAdmin' ? '/school' : '/admin';

  return (
    <Page>
      <Toast />
      <PageHeader title="Attendance Overview" icon="✅" backPath={backPath} />
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
              <SearchBar placeholder="Search roll no, copy no, student, teacher, location, device, IP..." value={search} onChange={setSearch} />
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

                  {/* Bottom meta details: Exam, Center, Block, Copy Number */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 14px', fontSize: 11 }}>
                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Exam: </span>
                      <strong style={{ color: '#0a1f6b' }}>{r.examId?.subject || '—'}</strong> ({r.examId?.class || '—'})
                    </div>

                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Center / Block: </span>
                      <strong style={{ color: 'var(--gray-800)' }}>{r.examId?.centerName || '—'}</strong> · Block: <strong style={{ color: '#0a1f6b' }}>{r.classroom || '—'}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Copy No: </span>
                      <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {r.copyNumber || '—'}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Marked by: </span>
                      <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>{r.teacherId?.name || 'Invigilator'}</span>
                      {r.teacherId?.uniqueId && r.teacherId?.uniqueId !== '—' && (
                        <span style={{ color: 'var(--gray-500)', fontSize: 10, marginLeft: 4 }}>({r.teacherId.uniqueId})</span>
                      )}
                      {r.markedAt && (
                        <span style={{ color: 'var(--gray-400)', marginLeft: 4 }}>
                          · {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AUDIT DETAILS: Live Location & Device Info Box */}
                  <div style={{ marginTop: 10, background: '#f8fafc', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
                    {/* Location item */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13 }}>📍</span>
                      <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Location:</span>
                      {r.latitude && r.longitude ? (
                        <>
                          <span style={{ fontWeight: 700, color: '#047857', fontFamily: 'monospace' }}>
                            {r.locationAddress || `${r.latitude.toFixed(5)}°, ${r.longitude.toFixed(5)}°`}
                          </span>
                          {r.googleMapsUrl && (
                            <a
                              href={r.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: 4,
                                padding: '1px 6px',
                                fontSize: 10,
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              🗺️ View on Map ↗
                            </a>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Location not recorded</span>
                      )}
                    </div>

                    {/* Device item */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13 }}>📱</span>
                      <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Device:</span>
                      <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                        {r.deviceInfo || 'Browser'}
                      </span>
                      {r.ipAddress && (
                        <span style={{ color: 'var(--gray-400)', fontSize: 10 }}>
                          (IP: {r.ipAddress})
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

// ===== PASSWORD RESET REQUESTS (BOARD ADMIN) =====
export function PasswordResetRequests() {
  const { api, showToast } = useApp();
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmRejectId, setConfirmRejectId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/auth/password-reset-requests');
      setRequests(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load password reset requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pw = 'Pass@';
    for (let i = 0; i < 4; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pw);
  };

  const handleOpenResetModal = (req) => {
    setSelectedReq(req);
    generateRandomPassword();
    setShowPassword(true);
  };

  const handleResolvePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api(`/auth/password-reset-requests/${selectedReq.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword })
      });
      showToast(res.message || 'Password reset successfully!', 'success');
      setSelectedReq(null);
      loadRequests();
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    try {
      await api(`/auth/password-reset-requests/${id}/reject`, { method: 'PATCH' });
      showToast('Request marked as rejected', 'info');
      setConfirmRejectId(null);
      loadRequests();
    } catch (err) {
      showToast(err.message || 'Failed to reject request', 'error');
    }
  };

  const filtered = requests.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.username && r.username.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.userUniqueId && r.userUniqueId.toLowerCase().includes(q)) ||
      (r.schoolName && r.schoolName.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q))
    );
  });

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const resolvedCount = requests.filter(r => r.status === 'Resolved').length;

  return (
    <Page>
      <Toast />
      <PageHeader title="Password Reset Requests" icon="🔐" backPath="/admin" />
      <div className="page-content">
        {/* Status summary banner */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid var(--gray-200)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              🔔
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0a1f6b' }}>
                Reset Requests from Teachers & Schools
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                {pendingCount} pending request{pendingCount === 1 ? '' : 's'} requiring Board Admin action
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadRequests} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🔄 Refresh List
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { id: 'Pending', label: `Pending (${pendingCount})`, color: '#d97706', bg: '#fef3c7' },
            { id: 'Resolved', label: `Resolved (${resolvedCount})`, color: '#16a34a', bg: '#dcfce7' },
            { id: 'All', label: `All Requests (${requests.length})`, color: '#0a1f6b', bg: '#e0e8ff' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === tab.id ? `2px solid ${tab.color}` : '1px solid var(--gray-200)',
                background: statusFilter === tab.id ? tab.bg : '#fff',
                color: statusFilter === tab.id ? tab.color : 'var(--gray-700)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, username, ID, school, or phone..." />

        {/* Requests List */}
        <div className="wide-grid" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading requests...</div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px dashed var(--gray-300)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-700)' }}>
                No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} password reset requests found
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                When a teacher or school admin requests a password reset, it will appear here instantly.
              </div>
            </div>
          ) : (
            filtered.map(r => {
              const isPending = r.status === 'Pending';
              const isResolved = r.status === 'Resolved';

              return (
                <div
                  key={r.id}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: 18,
                    border: isPending ? '1.5px solid #fed7aa' : '1px solid var(--gray-200)',
                    boxShadow: isPending ? '0 4px 16px rgba(217,119,6,0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: r.role === 'Teacher' ? '#ecfeff' : '#e0f2fe',
                        border: `1px solid ${r.role === 'Teacher' ? '#a5f3fc' : '#bae6fd'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                      }}>
                        {r.role === 'Teacher' ? '👩‍🏫' : '🏫'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0a1f6b' }}>
                          {r.name || r.username}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                          Username: <strong>{r.username}</strong> · ID: <strong>{r.userUniqueId || '—'}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {roleBadge(r.role)}
                      <span className={`badge ${isResolved ? 'badge-green' : isPending ? 'badge-orange' : 'badge-blue'}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: 'var(--gray-700)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                    <div>🏫 <strong>School:</strong> {r.schoolName || '—'}</div>
                    <div>📞 <strong>Phone:</strong> {r.phone || '—'}</div>
                    <div>📅 <strong>Requested:</strong> {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '—'}</div>
                    {r.email && r.email !== '—' && <div>✉️ <strong>Email:</strong> {r.email}</div>}
                  </div>

                  {r.note && (
                    <div style={{ fontSize: 11, color: 'var(--gray-600)', fontStyle: 'italic', background: '#f0f4ff', padding: '6px 12px', borderRadius: 8 }}>
                      💬 Note from user: "{r.note}"
                    </div>
                  )}

                  {isResolved && (
                    <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#14532d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span>✅ Reset by <strong>{r.resolvedByName || 'Board Admin'}</strong> on {new Date(r.resolvedAt).toLocaleString()}</span>
                        {r.newPasswordPlain && (
                          <div style={{ marginTop: 4, fontWeight: 700 }}>
                            New Assigned Password: <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, color: '#166534', border: '1px solid #bbf7d0', fontSize: 13 }}>{r.newPasswordPlain}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions for Pending */}
                  {isPending && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6, borderTop: '1px solid var(--gray-100)' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                        onClick={() => setConfirmRejectId(r.id)}
                      >
                        ❌ Reject
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 800 }}
                        onClick={() => handleOpenResetModal(r)}
                      >
                        🔑 Reset & Update Password
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {selectedReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 440, width: '100%', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 28 }}>🔑</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0a1f6b' }}>
                  Reset User Password
                </h3>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                  For {selectedReq.name || selectedReq.username} ({selectedReq.role})
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--gray-200)', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 11 }}>
              <div>👤 <strong>Account Username:</strong> <span style={{ color: '#0a1f6b', fontWeight: 700 }}>{selectedReq.username}</span></div>
              <div>🏫 <strong>School:</strong> {selectedReq.schoolName || '—'}</div>
              <div>🆔 <strong>User ID:</strong> {selectedReq.userUniqueId || '—'}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-700)' }}>
                  New Password *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  🎲 Auto-Generate
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  className="input-bare"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ paddingRight: 40, fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedReq(null)}
                style={{ flex: 1 }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleResolvePassword}
                style={{ flex: 2, background: '#16a34a', borderColor: '#16a34a', fontWeight: 800 }}
                disabled={actionLoading || !newPassword || newPassword.length < 6}
              >
                {actionLoading ? 'Saving...' : '✅ Confirm & Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation modal */}
      <ConfirmModal
        open={!!confirmRejectId}
        onClose={() => setConfirmRejectId(null)}
        onConfirm={() => handleReject(confirmRejectId)}
        title="Reject Password Request"
        message="Are you sure you want to mark this password reset request as rejected?"
      />
    </Page>
  );
}



