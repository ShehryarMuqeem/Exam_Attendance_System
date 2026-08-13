import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AmsHeader, PageHeader, BottomNav, Toast, SearchBar, ConfirmModal, Page } from '../components/Shared';

function statusBadge(s) {
  return <span className={`badge ${s === 'Active' ? 'badge-green' : 'badge-red'}`}>{s}</span>;
}

// ===== SCHOOL DASHBOARD =====
export function SchoolDashboard() {
  const navigate = useNavigate();
  const { api, currentUser } = useApp();
  const [stats, setStats] = useState({ teachers:0, students:0 });
  const [centerInfo, setCenterInfo] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/users?role=Teacher').catch(()=>[]),
      api('/users?role=Student').catch(()=>[]),
    ]).then(([teachers, students]) => {
      setStats({ teachers: teachers.length, students: students.length });
    });
    api('/centers/my-center-info').then(setCenterInfo).catch(()=>{});
  }, [api]);

  return (
    <Page>
      <Toast />
      <AmsHeader title="School Admin Panel" subtitle="Manage teachers, students, duties, and your exam center." />
      <div className="page-content">
        <div style={{ background:'#e0e8ff', borderRadius:12, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#0a1f6b', fontWeight:600 }}>
          🏫 Welcome, {currentUser?.name}
        </div>

        <div className="wide-grid" style={{ gridTemplateColumns:'repeat(2, 1fr)', marginBottom:18 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', textAlign:'center' }}>
            <div style={{ fontSize:24 }}>👩‍🏫</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#0891b2', marginTop:4 }}>{stats.teachers}</div>
            <div style={{ fontSize:11, color:'var(--gray-500)', fontWeight:600 }}>Teachers</div>
          </div>
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', textAlign:'center' }}>
            <div style={{ fontSize:24 }}>🎓</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#16a34a', marginTop:4 }}>{stats.students}</div>
            <div style={{ fontSize:11, color:'var(--gray-500)', fontWeight:600 }}>Students</div>
          </div>
        </div>

        {/* Center Information section — requirement D: when a school logs in,
            show whether it's an exam center, for whom, and total incoming students. */}
        {centerInfo && (
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>📍 Center Information</div>
              {centerInfo.isCenter && <span className="center-badge">Active Center</span>}
            </div>
            {!centerInfo.isCenter ? (
              <div style={{ fontSize:12, color:'var(--gray-500)' }}>Your school is not currently assigned as an examination center for other schools. You only manage your own {centerInfo.ownStudents} students.</div>
            ) : (
              <>
                <div style={{ fontSize:12, color:'var(--gray-600)', marginBottom:8 }}>
                  Your school is hosting exams for <strong>{centerInfo.assignedSchools.length}</strong> other school(s), bringing in <strong>{centerInfo.totalIncomingStudents}</strong> additional students (plus your own {centerInfo.ownStudents}).
                </div>
                {centerInfo.assignedSchools.map(s=>(
                  <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:'1px solid var(--gray-100)', fontSize:12 }}>
                    <span>{s.name} ({s.schoolCode})</span>
                    <strong>{s.studentCount} students</strong>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div className="wide-grid">
          <div onClick={()=>navigate('/school/students')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>🎓</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Manage Students</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>Register and manage student profiles</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
          <div onClick={()=>navigate('/school/teachers')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>👩‍🏫</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Manage Teachers</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>Add and manage teaching staff</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
          <div onClick={()=>navigate('/school/duties')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>📋</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Assign Duty</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>Assign exam duties to your own teachers</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
          <div onClick={()=>navigate('/school/center')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>📍</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Center Details</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>Full breakdown of center assignments</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
        </div>
      </div>
    </Page>
  );
}

// ===== SCHOOL STUDENTS =====
export function SchoolStudents() {
  const { api, showToast } = useApp();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editForm, setEditForm] = useState({ rollNo: '', academicYear: '' });
  const [uploadClass, setUploadClass] = useState('SSC-I');
  const [uploadBatch, setUploadBatch] = useState('2025-2026');
  const [batchOptions, setBatchOptions] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    api('/academic/years')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setBatchOptions(res);
          setUploadBatch(res[0]);
        }
      })
      .catch(() => {});
  }, [api]);

  const load = useCallback(() => {
    let url = '/users?role=Student';
    if (yearFilter) url += `&academicYear=${encodeURIComponent(yearFilter)}`;
    api(url)
      .then(res => {
        // Sort students alphabetically by name
        const sorted = res.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(sorted);
      })
      .catch(e => showToast(e.message, 'error'));
  }, [api, yearFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.uniqueId.toLowerCase().includes(search.toLowerCase()) ||
    (s.rollNo && s.rollNo.toLowerCase().includes(search.toLowerCase()))
  );

  const loadXlsxLibrary = () => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve(window.XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showToast('Processing file...', 'info');
      const XLSX = await loadXlsxLibrary();
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const updates = [];
          const cleanStr = (val) => (val === undefined || val === null) ? '' : String(val).trim().replace(/^["']|["']$/g, '').trim();

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (row && row.length >= 2) {
              const srNoStr = cleanStr(row[0]);
              const rollNo = cleanStr(row[1]);
              const academicYear = row[2] !== undefined ? cleanStr(row[2]) : '';
              
              const srNo = parseInt(srNoStr);
              if (!isNaN(srNo) && srNo > 0 && rollNo) {
                if (srNo <= students.length) {
                  const student = students[srNo - 1]; // sorted list
                  updates.push({
                    uniqueId: student.uniqueId,
                    rollNo,
                    academicYear: academicYear || yearFilter || uploadBatch,
                    createNew: false
                  });
                } else {
                  updates.push({
                    rollNo,
                    academicYear: academicYear || yearFilter || uploadBatch,
                    createNew: true
                  });
                }
              }
            }
          }
          if (updates.length === 0) {
            showToast('No valid student records found in sheet. Check serial numbers (e.g. 1, 2, 3) matching list below.', 'error');
            return;
          }
          await api('/users/bulk-update-roll', {
            method: 'POST',
            body: JSON.stringify({
              updates,
              defaultClass: uploadClass,
              defaultYear: uploadBatch
            })
          });
          showToast(`✅ Successfully imported ${updates.length} student records!`, 'success');
          load();
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      showToast('Failed to load Excel parser library.', 'error');
    }
    e.target.value = ''; // Reset file input
  };

  const startEdit = (s) => {
    setEditingStudentId(s.id);
    setEditForm({ rollNo: s.rollNo || '', academicYear: s.academicYear || '' });
  };

  const saveEdit = async (student) => {
    try {
      await api(`/users/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...student,
          rollNo: editForm.rollNo,
          academicYear: editForm.academicYear
        })
      });
      showToast('Student updated successfully! ✓', 'success');
      setEditingStudentId(null);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      showToast('Student removed successfully! ✓', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const downloadSampleCSV = () => {
    const sampleContent = "sr_no,roll_no,academic_year\n1,1001,2025-2026\n2,1002,2025-2026\n3,1003,2025-2026\n4,1004,2025-2026\n5,1005,2025-2026\n";
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sample template downloaded! ✓', 'success');
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Students" icon="🎓" backPath="/school" />
      <div className="page-content">
        <div style={{ background:'#fef9e7', border:'1px solid #fde68a', borderRadius:10, padding:'9px 14px', marginBottom:14, fontSize:12, color:'#92400e', fontWeight:600 }}>
          ℹ Students are registered by the Board Admin. Set or import roll numbers and academic years below.
        </div>

        {/* Excel / CSV Import */}
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:6 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'#0a1f6b' }}>📥 Import Roll Numbers & Batches (Excel / CSV)</div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>
                Upload an Excel (<code>.xlsx</code> / <code>.xls</code>) or CSV file with columns: <strong>sr_no, roll_no, academic_year</strong>.<br />
                (If student list is empty or serial numbers are new, this will automatically register new students in your school).
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ background:'#f0f4ff', color:'#0a1f6b', fontWeight:700, border:'1px solid #c7d2fe' }} onClick={downloadSampleCSV}>
              📄 Sample CSV
            </button>
          </div>
          
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--gray-600)' }}>Class for New Students</label>
              <select className="input-field" style={{ padding:6, fontSize:12, marginTop:4 }} value={uploadClass} onChange={e=>setUploadClass(e.target.value)}>
                {['SSC-I','SSC-II','HSC-I','HSC-II','SSC-I Supplementary','SSC-II Supplementary','HSC-I Supplementary','HSC-II Supplementary'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--gray-600)' }}>Batch for New Students</label>
              <select className="input-field" style={{ padding:6, fontSize:12, marginTop:4 }} value={uploadBatch} onChange={e=>setUploadBatch(e.target.value)}>
                {(batchOptions.length > 0 ? batchOptions : ['2025-2026', '2026-2027', '2027-2028']).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} style={{ fontSize:12, cursor:'pointer' }} />
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}><SearchBar value={search} onChange={setSearch} /></div>
          <select className="input-field" style={{ width:130 }} value={yearFilter} onChange={e=>setYearFilter(e.target.value)}>
            <option value="">All Batches</option>
            {(batchOptions.length > 0 ? batchOptions : ['2025-2026', '2026-2027', '2027-2028']).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:10, fontWeight:600 }}>
          {filtered.length} student{filtered.length !== 1 ? 's' : ''} shown
        </div>

        <div className="wide-grid">
          {filtered.map(s => {
            const isEditing = editingStudentId === s.id;
            const globalIndex = students.indexOf(s) + 1;
            return (
              <div key={s.id} className="center-card" style={{ border: isEditing ? '2px solid #0a1f6b' : '1px solid var(--gray-100)' }}>
                {isEditing ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>
                      <span style={{ background:'#e0e8ff', color:'#0a1f6b', padding:'2px 6px', borderRadius:4, marginRight:6, fontSize:11 }}>#{globalIndex}</span>
                      {s.name} ({s.uniqueId})
                    </div>
                    <div className="input-group" style={{ margin:0 }}>
                      <label style={{ fontSize:10 }}>Roll No</label>
                      <input className="input-field" style={{ padding:6, fontSize:12 }} value={editForm.rollNo} onChange={e=>setEditForm(f=>({...f, rollNo:e.target.value}))} />
                    </div>
                    <div className="input-group" style={{ margin:0 }}>
                      <label style={{ fontSize:10 }}>Academic Year / Batch</label>
                      <select className="input-field" style={{ padding:6, fontSize:12 }} value={editForm.academicYear} onChange={e=>setEditForm(f=>({...f, academicYear:e.target.value}))}>
                        <option value="">None</option>
                        {(batchOptions.length > 0 ? batchOptions : ['2025-2026', '2026-2027', '2027-2028']).map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:4 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(s)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingStudentId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>
                        <span style={{ background:'#e0e8ff', color:'#0a1f6b', padding:'2px 6px', borderRadius:4, marginRight:6, fontSize:11 }}>#{globalIndex}</span>
                        {s.name}
                      </div>
                      <div style={{ fontSize:10, color:'var(--gray-500)', marginTop:3 }}>ID: {s.uniqueId} · Roll: <strong style={{ color:'#0a1f6b' }}>{s.rollNo||'—'}</strong></div>
                      <div style={{ fontSize:10, color:'var(--gray-500)' }}>Class: {s.class||'—'} · Batch: <strong>{s.academicYear||'—'}</strong></div>
                      <div style={{ marginTop:6 }}>{statusBadge(s.status)}</div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>Edit</button>
                      <button className="btn btn-red btn-sm" onClick={() => setConfirmDelete(s.id)}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No students found</div>}
        </div>
      </div>
      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => handleDelete(confirmDelete)} title="Remove Student" message="This will permanently remove this student." />
    </Page>
  );
}

// ===== SCHOOL TEACHERS =====
export function SchoolTeachers() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(()=>api('/users?role=Teacher').then(setTeachers).catch(e=>showToast(e.message,'error')),[api,showToast]);
  useEffect(()=>{ load(); },[load]);

  const filtered = teachers.filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase())||t.uniqueId.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id) => {
    try { await api(`/users/${id}`, { method:'DELETE' }); showToast('Teacher removed','success'); load(); } catch(e) { showToast(e.message,'error'); }
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Teachers" icon="👩‍🏫" backPath="/school" />
      <div className="page-content">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary btn-sm" style={{ margin:'10px 0 16px' }} onClick={()=>navigate('/school/teachers/add')}>+ Add Teacher</button>
        <div className="wide-grid">
          {filtered.map(t=>(
            <div key={t.id} className="center-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{t.name}</div>
                  <div style={{ fontSize:10, color:'var(--gray-500)' }}>ID: {t.uniqueId} · @{t.username}</div>
                  {t.assignedClassroom && <div style={{ fontSize:10, color:'var(--gray-500)' }}>Duty: {t.assignedClassroom}</div>}
                  <div style={{ marginTop:5 }}>{statusBadge(t.status)}</div>
                </div>
                <button className="btn btn-red btn-sm" onClick={()=>setConfirmDelete(t.id)}>Remove</button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No teachers yet</div>}
        </div>
      </div>
      <ConfirmModal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} onConfirm={()=>handleDelete(confirmDelete)} title="Remove Teacher" message="This will permanently remove this teacher." />
    </Page>
  );
}

export function AddSchoolTeacher() {
  const navigate = useNavigate();
  const { api, showToast } = useApp();
  const [form, setForm] = useState({ name:'', email:'', phone:'', username:'', password:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if (!form.name||!form.username||!form.password) { showToast('Fill required fields','error'); return; }
    setLoading(true);
    try {
      await api('/users', { method:'POST', body: JSON.stringify({ ...form, role:'Teacher' }) });
      showToast('Teacher added! ✓','success');
      setTimeout(()=>navigate('/school/teachers'),700);
    } catch(e) { showToast(e.message,'error'); }
    setLoading(false);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Add Teacher" icon="👩‍🏫" backPath="/school/teachers" />
      <div className="page-content">
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
          <div className="input-group"><label>Full Name *</label><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} /></div>
          <div className="input-group"><label>Email</label><input className="input-field" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
          <div className="input-group"><label>Phone</label><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
          <div className="divider" />
          <div className="input-group"><label>Username *</label><input className="input-field" value={form.username} onChange={e=>set('username',e.target.value)} /></div>
          <div className="input-group"><label>Password *</label><input className="input-field" value={form.password} onChange={e=>set('password',e.target.value)} /></div>
        </div>
        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={save} disabled={loading}>{loading?'Adding…':'Add Teacher'}</button>
      </div>
    </Page>
  );
}

export function SchoolAssignDuty() {
  const { api, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' or 'students'
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [classroom, setClassroom] = useState('');
  const [duties, setDuties] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentClassroom, setStudentClassroom] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentTab, setStudentTab] = useState('unallocated'); // 'unallocated' or 'allocated'

  useEffect(() => {
    api('/exams').then(setExams).catch(()=>{}); 
    api('/users?role=Teacher').then(setTeachers).catch(()=>{});
  }, [api]);

  useEffect(() => {
    if (!selectedExam) { setDuties([]); setStudents([]); return; }
    if (activeTab === 'teachers') {
      api(`/exams/${selectedExam}/duties`).then(setDuties).catch(()=>{});
    } else {
      api(`/exams/${selectedExam}/roster`).then(setStudents).catch(()=>{});
    }
  }, [api, selectedExam, activeTab]);

  const loadStudents = () => {
    if (selectedExam) {
      api(`/exams/${selectedExam}/roster`).then(setStudents).catch(()=>{});
    }
  };

  const assignTeacher = async () => {
    if (!selectedExam||!selectedTeacher||!classroom) { showToast('Fill all fields','error'); return; }
    setLoading(true);
    try {
      await api(`/exams/${selectedExam}/assign-duty`, { method:'POST', body: JSON.stringify({ teacherId:selectedTeacher, classroom }) });
      showToast('Duty assigned! ✓','success');
      api(`/exams/${selectedExam}/duties`).then(setDuties);
      setSelectedTeacher(''); setClassroom('');
    } catch(e) { showToast(e.message,'error'); }
    setLoading(false);
  };

  const assignStudentsRoom = async () => {
    if (!selectedExam || !studentClassroom || selectedStudents.length === 0) {
      showToast('Please enter a room and select at least one student', 'error');
      return;
    }
    setLoading(true);
    try {
      await api(`/exams/${selectedExam}/assign-students-room`, {
        method: 'POST',
        body: JSON.stringify({ classroom: studentClassroom, studentIds: selectedStudents })
      });
      showToast(`✅ Successfully allocated ${selectedStudents.length} students to ${studentClassroom}!`, 'success');
      setSelectedStudents([]);
      setStudentClassroom('');
      loadStudents();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  const handleStudentSelect = (id) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const unallocatedStudents = students.filter(s => s.classroom === 'Unallocated');
  const allocatedStudents = students.filter(s => s.classroom !== 'Unallocated');
  const displayedStudents = studentTab === 'unallocated' ? unallocatedStudents : allocatedStudents;

  const selectAllFiltered = () => {
    const displayedIds = displayedStudents.map(s => s.id);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedStudents.includes(id));
    if (allSelected) {
      setSelectedStudents(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedStudents(prev => [...new Set([...prev, ...displayedIds])]);
    }
  };

  const handleStudentTabChange = (tab) => {
    setStudentTab(tab);
    setSelectedStudents([]);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Allocations" icon="📋" backPath="/school" />
      <div className="page-content">
        <div className="att-tabs" style={{ marginBottom: 16 }}>
          <button className={`att-tab ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}>👩‍🏫 Teacher Duty</button>
          <button className={`att-tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>🎓 Student Seating</button>
        </div>

        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:14 }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Select Exam (held at your center) *</label>
            <select className="input-field" value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setSelectedStudents([]); }}>
              <option value="">Select Exam</option>
              {exams.map(e => <option key={e._id} value={e._id}>{e.subject} — {e.class} · {e.date}</option>)}
            </select>
          </div>
        </div>

        {activeTab === 'teachers' ? (
          <>
            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'#0a1f6b' }}>Assign Teacher to Classroom</div>
              <div className="input-group"><label>Teacher (your staff only) *</label>
                <select className="input-field" value={selectedTeacher} onChange={e=>setSelectedTeacher(e.target.value)}>
                  <option value="">Select Teacher</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.name} ({t.uniqueId})</option>)}
                </select>
              </div>
              <div className="input-group"><label>Classroom *</label>
                <input className="input-field" placeholder="e.g. Room 5" value={classroom} onChange={e=>setClassroom(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={assignTeacher} disabled={loading}>{loading?'Assigning…':'Assign'}</button>
            </div>
            {duties.length>0 && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Current Assignments</div>
                {duties.map(d=>(
                  <div key={d._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:12 }}>{d.teacherId?.name}</div>
                      <div style={{ fontSize:10, color:'var(--gray-500)' }}>{d.teacherId?.uniqueId}</div>
                    </div>
                    <span style={{ background:'#e0e8ff', color:'#0a1f6b', borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:700 }}>📍 {d.classroom}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'#0a1f6b' }}>
                {studentTab === 'unallocated' ? 'Allocate Selected Students to Room' : 'Reallocate / Shift Selected Students to Room'}
              </div>
              <div className="input-group"><label>Classroom / Room Number *</label>
                <input className="input-field" placeholder="e.g. Room A-008" value={studentClassroom} onChange={e=>setStudentClassroom(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={assignStudentsRoom} disabled={loading || selectedStudents.length === 0}>
                {studentTab === 'unallocated' ? 'Assign' : 'Shift/Reallocate'} {selectedStudents.length} Selected Student(s)
              </button>
            </div>

            {selectedExam && students.length > 0 && (
              <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
                {/* Sub-tabs for Unallocated vs Allocated */}
                <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'1px solid var(--gray-100)', paddingBottom:10 }}>
                  <button
                    className={`btn ${studentTab === 'unallocated' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                    style={{ borderRadius:20, padding:'6px 16px', fontWeight:600 }}
                    onClick={() => handleStudentTabChange('unallocated')}
                  >
                    Unallocated ({unallocatedStudents.length})
                  </button>
                  <button
                    className={`btn ${studentTab === 'allocated' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                    style={{ borderRadius:20, padding:'6px 16px', fontWeight:600 }}
                    onClick={() => handleStudentTabChange('allocated')}
                  >
                    Allocated ({allocatedStudents.length})
                  </button>
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>
                    {studentTab === 'unallocated' ? 'Unallocated Students' : 'Allocated Students'} ({displayedStudents.length})
                  </div>
                  {displayedStudents.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={selectAllFiltered}>
                      {displayedStudents.map(s => s.id).every(id => selectedStudents.includes(id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {displayedStudents.map(s => {
                    const isChecked = selectedStudents.includes(s.id);
                    return (
                      <div key={s.id} onClick={() => handleStudentSelect(s.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 8px', borderBottom:'1px solid var(--gray-50)', cursor:'pointer', background: isChecked ? '#f0f4ff' : 'transparent', borderRadius:8 }}>
                        <input type="checkbox" checked={isChecked} readOnly style={{ pointerEvents:'none' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight:600, fontSize:12 }}>{s.name || `Student ${s.uniqueId}`}</div>
                          <div style={{ fontSize:10, color:'var(--gray-500)' }}>ID: {s.uniqueId} · Roll: <strong>{s.rollNo}</strong> · {s.schoolName}</div>
                        </div>
                        <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:700,
                          background: s.classroom === 'Unallocated' ? '#f3f4f6' : '#dbeafe',
                          color: s.classroom === 'Unallocated' ? '#4b5563' : '#1e40af' }}>
                          {s.classroom}
                        </span>
                      </div>
                    );
                  })}
                  {displayedStudents.length === 0 && (
                    <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>
                      No {studentTab} students found for this exam.
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedExam && students.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No students registered for this exam's class at your center.</div>
            )}
          </>
        )}
      </div>
    </Page>
  );
}

// ===== CENTER DETAILS (School's own view of center status) =====
export function SchoolCenterDetails() {
  const { api, currentUser, showToast } = useApp();
  const [centerInfo, setCenterInfo] = useState(null);

  useEffect(() => { api('/centers/my-center-info').then(setCenterInfo).catch(() => {}); }, [api]);

  const downloadCSVReport = () => {
    if (!centerInfo) return;
    const headers = ['School Name', 'School Code', 'Student Count', 'Center Allocation Status'];
    const rows = [
      headers.join(','),
      `"${currentUser?.schoolName || 'Own School'}", "OWN-CENTER", ${centerInfo.ownStudents}, "Host Center School"`,
      ...centerInfo.assignedSchools.map(s => [
        `"${s.name}"`,
        `"${s.schoolCode}"`,
        s.studentCount,
        `"Incoming Home School"`
      ].join(','))
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Examination_Center_Allocation_${currentUser?.schoolName || 'Center'}.csv`.replace(/\s+/g, '_'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Center Summary CSV exported! ✓', 'success');
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Center Details" icon="📍" backPath="/school" />
      <div className="page-content">
        {!centerInfo ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading…</div> : (
          <>
            {/* Header banner */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid var(--gray-100)', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>{centerInfo.isCenter ? '📍' : '🏫'}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0a1f6b' }}>{centerInfo.isCenter ? 'Active Examination Center' : 'Not an Assigned Center'}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                      {centerInfo.isCenter
                        ? `Hosting ${centerInfo.assignedSchools.length} home school(s), bringing in ${centerInfo.totalIncomingStudents} incoming candidates.`
                        : 'Your school only manages its own candidates.'}
                    </div>
                  </div>
                </div>

                {centerInfo.isCenter && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 Print Allocation Slip</button>
                    <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--gray-300)' }} onClick={downloadCSVReport}>📥 Export CSV</button>
                  </div>
                )}
              </div>
            </div>

            {/* Printable Allocation Slip */}
            <div style={{ background: '#fff', border: '2px solid #0a1f6b', borderRadius: 14, padding: 20, marginBottom: 14 }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--gray-200)', paddingBottom: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#0a1f6b', letterSpacing: 0.5 }}>EXAMINATION CENTER ALLOCATION SLIP</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', marginTop: 2 }}>{currentUser?.schoolName || 'Examination Center'}</div>
                <div style={{ fontSize: 10, color: 'var(--gray-500)', marginTop: 2 }}>Official Board Record • Generated on {new Date().toLocaleDateString()}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>Own School Students</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0a1f6b', marginTop: 2 }}>{centerInfo.ownStudents}</div>
                </div>
                <div style={{ background: '#f0f4ff', padding: 12, borderRadius: 10, border: '1px solid #c7d2fe' }}>
                  <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Incoming Home Students</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', marginTop: 2 }}>{centerInfo.totalIncomingStudents}</div>
                </div>
                <div style={{ background: '#dcfce7', padding: 12, borderRadius: 10, border: '1px solid #86efac' }}>
                  <div style={{ fontSize: 10, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Total Center Candidates</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginTop: 2 }}>{centerInfo.ownStudents + centerInfo.totalIncomingStudents}</div>
                </div>
              </div>

              <div style={{ fontWeight: 800, fontSize: 13, color: '#0a1f6b', marginBottom: 10 }}>Assigned Home Schools Breakdown</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0a1f6b', color: '#fff' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>School Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>School Code</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Candidates Sitting Exams</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--gray-100)', background: '#fff' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{currentUser?.schoolName} (Own School)</td>
                    <td style={{ padding: '8px 10px', color: 'var(--gray-500)' }}>CENTER-HOST</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{centerInfo.ownStudents}</td>
                  </tr>
                  {centerInfo.assignedSchools.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--gray-100)', background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--gray-500)' }}>{s.schoolCode}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#1d4ed8' }}>{s.studentCount}</td>
                    </tr>
                  ))}
                  {centerInfo.assignedSchools.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)' }}>No additional home schools assigned to this center yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

