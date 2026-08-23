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
              <div style={{ fontSize:12, color:'var(--gray-500)' }}>
                Your school is not currently assigned as an examination center for other schools.
                {centerInfo.externalCenter && (
                  <div style={{ marginTop:6, color:'#1d4ed8', fontWeight:600 }}>
                    📍 Your students sit exams at external center: <strong>{centerInfo.externalCenter.name}</strong> ({centerInfo.externalCenter.schoolCode})
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontSize:12, color:'var(--gray-600)', marginBottom:8 }}>
                  {centerInfo.isSelfCenter ? (
                    <>Your school is a <strong>Self-Center</strong> hosting its own <strong>{centerInfo.ownStudentsAtThisCenter}</strong> students{centerInfo.assignedSchools.length > 0 ? ` plus ${centerInfo.totalIncomingStudents} incoming candidates from ${centerInfo.assignedSchools.length} other school(s)` : ''} (Total: <strong>{centerInfo.totalCenterCandidates}</strong> candidates).</>
                  ) : (
                    <>Your school is hosting exams for <strong>{centerInfo.assignedSchools.length}</strong> external school(s) with <strong>{centerInfo.totalCenterCandidates}</strong> candidates sitting exams here.{centerInfo.externalCenter && <span> Your own {centerInfo.ownStudentsTotal} students sit exams at <strong>{centerInfo.externalCenter.name}</strong>.</span>}</>
                  )}
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
          <div onClick={()=>navigate('/school/attendance')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>✅</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Attendance Records</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>View marked attendance, GPS locations & devices</div></div>
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

// Helper to display class clearly as Class 9, 10, 11, or 12
export const formatClassLabel = (cls) => {
  if (!cls) return 'Class 9 (SSC-I)';
  const c = String(cls).trim().toUpperCase();
  if (c === 'SSC-I' || c === '9' || c === '9TH' || c === 'CLASS 9' || c === 'CLASS 9TH' || c === 'SSC1') return 'Class 9 (SSC-I)';
  if (c === 'SSC-II' || c === '10' || c === '10TH' || c === 'CLASS 10' || c === 'CLASS 10TH' || c === 'SSC2') return 'Class 10 (SSC-II)';
  if (c.includes('SSC-I') && (c.includes('SUPP') || c.includes('SUPPLEMENTARY'))) return 'Class 9 (SSC-I Supp.)';
  if (c.includes('SSC-II') && (c.includes('SUPP') || c.includes('SUPPLEMENTARY'))) return 'Class 10 (SSC-II Supp.)';
  if (c === 'HSSC-I' || c === 'HSC-I' || c === '11' || c === '11TH' || c === 'CLASS 11' || c === 'CLASS 11TH' || c === 'HSC1' || c === 'HSSC1' || c === '1ST YEAR' || c === 'FIRST YEAR') return 'Class 11 (HSSC-I / 1st Year)';
  if (c === 'HSSC-II' || c === 'HSC-II' || c === '12' || c === '12TH' || c === 'CLASS 12' || c === 'CLASS 12TH' || c === 'HSC2' || c === 'HSSC2' || c === '2ND YEAR' || c === 'SECOND YEAR') return 'Class 12 (HSSC-II / 2nd Year)';
  if ((c.includes('HSC-I') || c.includes('HSSC-I')) && (c.includes('SUPP') || c.includes('SUPPLEMENTARY'))) return 'Class 11 (HSSC-I Supp.)';
  if ((c.includes('HSC-II') || c.includes('HSSC-II')) && (c.includes('SUPP') || c.includes('SUPPLEMENTARY'))) return 'Class 12 (HSSC-II Supp.)';
  return cls;
};

export const normalizeClassInput = (cls) => {
  if (!cls) return 'SSC-I';
  const c = String(cls).trim().toUpperCase();
  if (c === '9' || c === '9TH' || c === 'CLASS 9' || c === 'CLASS 9TH' || c === 'SSC-I' || c === 'SSC1') return 'SSC-I';
  if (c === '10' || c === '10TH' || c === 'CLASS 10' || c === 'CLASS 10TH' || c === 'SSC-II' || c === 'SSC2') return 'SSC-II';
  if (c === '11' || c === '11TH' || c === 'CLASS 11' || c === 'CLASS 11TH' || c === 'HSC-I' || c === 'HSSC-I' || c === 'HSC1' || c === 'HSSC1' || c === '1ST YEAR' || c === 'FIRST YEAR') return 'HSSC-I';
  if (c === '12' || c === '12TH' || c === 'CLASS 12' || c === 'CLASS 12TH' || c === 'HSC-II' || c === 'HSSC-II' || c === 'HSC2' || c === 'HSSC2' || c === '2ND YEAR' || c === 'SECOND YEAR') return 'HSSC-II';
  return cls;
};

// ===== SCHOOL STUDENTS =====
export function SchoolStudents() {
  const { api, showToast } = useApp();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editForm, setEditForm] = useState({ rollNo: '', academicYear: '', class: '' });
  const [uploadClass, setUploadClass] = useState('SSC-I');
  const [uploadBatch, setUploadBatch] = useState(''); // Default empty to require explicit choice
  const [batchOptions, setBatchOptions] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    api('/academic/years')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setBatchOptions(res);
        }
      })
      .catch(() => {});
  }, [api]);

  const navigate = useNavigate();
  const load = useCallback(() => {
    let url = '/users?role=Student';
    if (yearFilter) url += `&academicYear=${encodeURIComponent(yearFilter)}`;
    api(url)
      .then(res => {
        // Sort students numerically by rollNo, then uniqueId
        const sorted = (res || []).sort((a, b) => {
          const numA = parseInt(a.rollNo);
          const numB = parseInt(b.rollNo);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (a.rollNo || a.uniqueId || '').localeCompare(b.rollNo || b.uniqueId || '');
        });
        setStudents(sorted);
      })
      .catch(e => showToast(e.message, 'error'));
  }, [api, yearFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s => {
    if (classFilter && normalizeClassInput(s.class) !== normalizeClassInput(classFilter)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.uniqueId && s.uniqueId.toLowerCase().includes(q)) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
      (s.schoolCode && s.schoolCode.toLowerCase().includes(q)) ||
      (s.class && s.class.toLowerCase().includes(q)) ||
      (s.academicYear && s.academicYear.toLowerCase().includes(q))
    );
  });

  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => {
      const row = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' || c === "'") {
          inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
          row.push(cur.trim().replace(/^["']|["']$/g, ''));
          cur = '';
        } else {
          cur += c;
        }
      }
      row.push(cur.trim().replace(/^["']|["']$/g, ''));
      return row;
    });
  };

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

    if (!uploadBatch) {
      showToast('⚠️ Please choose an Academic Batch from the dropdown before uploading student records!', 'error');
      e.target.value = '';
      return;
    }

    try {
      showToast('Processing file...', 'info');
      let rows = [];
      const fileName = (file.name || '').toLowerCase();

      if (fileName.endsWith('.csv') || file.type === 'text/csv') {
        const text = await file.text();
        rows = parseCSVText(text);
      } else {
        const XLSX = await loadXlsxLibrary();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      }

      if (!rows || rows.length === 0) {
        showToast('The uploaded file appears to be empty.', 'error');
        e.target.value = '';
        return;
      }

      const cleanStr = (val) => (val === undefined || val === null) ? '' : String(val).trim().replace(/^["']|["']$/g, '').trim();

      // Detect headers in the first row
      const headerRow = (rows[0] || []).map(c => cleanStr(c).toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      let rollNoIdx = -1;
      let uidIdx = -1;
      let srNoIdx = -1;
      let yearIdx = -1;
      let classIdx = -1;

      headerRow.forEach((col, idx) => {
        if (['rollno', 'rollnumber', 'roll', 'seatno', 'seatnumber', 'rollnum', 'role', 'roleno', 'rolenumber', 'regno', 'reg', 'registrationno', 'grno', 'gr', 'admissionno', 'admno', 'enrollmentno', 'candidateno'].includes(col)) rollNoIdx = idx;
        else if (['uniqueid', 'uid', 'studentid', 'id', 'systemid'].includes(col)) uidIdx = idx;
        else if (['srno', 'sr', 'sno', 'serial', 'serialno', 'no', 'num'].includes(col)) srNoIdx = idx;
        else if (['academicyear', 'year', 'batch', 'session', 'academicsession', 'acadyear'].includes(col)) yearIdx = idx;
        else if (['class', 'grade', 'standard', 'classname', 'gradelevel'].includes(col)) classIdx = idx;
      });

      const hasNamedHeaders = (rollNoIdx !== -1 || uidIdx !== -1 || srNoIdx !== -1);
      let startRow = hasNamedHeaders ? 1 : 0;

      if (!hasNamedHeaders && rows.length > 1) {
        const firstRowStr = (rows[0] || []).map(c => cleanStr(c).toLowerCase()).join(' ');
        if (firstRowStr.includes('roll') || firstRowStr.includes('id') || firstRowStr.includes('class') || firstRowStr.includes('batch')) {
          startRow = 1;
        }
      }

      const updates = [];

      for (let r = startRow; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        let rollNo = '';
        let uid = '';

        if (hasNamedHeaders) {
          if (rollNoIdx !== -1) rollNo = cleanStr(row[rollNoIdx]);
          if (uidIdx !== -1) uid = cleanStr(row[uidIdx]);
          // If no rollNo column found, fallback to srNo or column 1/0
          if (!rollNo && srNoIdx !== -1 && row.length > 1) {
            rollNo = cleanStr(row[1]);
          }
        } else {
          // Positional fallback for 2-column CSV (sr_no, roll_no) or 1-column (roll_no)
          const col0 = cleanStr(row[0]);
          const col1 = row.length > 1 ? cleanStr(row[1]) : '';

          if (col0.toUpperCase().startsWith('STU') || col0.toUpperCase().startsWith('ID')) {
            uid = col0;
            rollNo = col1 || col0;
          } else if (col1) {
            // Standard 2-column: sr_no (col 0), roll_no (col 1)
            rollNo = col1;
          } else {
            // 1-column: roll_no (col 0)
            rollNo = col0;
          }
        }

        if (!rollNo && !uid) continue;

        const targetBatch = uploadBatch;
        const normalizedClass = normalizeClassInput(uploadClass);

        let matched = null;
        if (uid) {
          matched = students.find(s => s.uniqueId && s.uniqueId.toLowerCase() === uid.toLowerCase());
        }

        if (matched) {
          updates.push({
            uniqueId: matched.uniqueId,
            rollNo: rollNo || matched.rollNo,
            class: normalizedClass,
            academicYear: targetBatch,
            createNew: false
          });
        } else {
          updates.push({
            uniqueId: uid || undefined,
            rollNo: rollNo || undefined,
            class: normalizedClass,
            academicYear: targetBatch,
            createNew: true
          });
        }
      }

      if (updates.length === 0) {
        showToast('No valid student roll numbers found in sheet.', 'error');
        e.target.value = '';
        return;
      }

      // Check for duplicate roll numbers within the uploaded sheet
      const seenRollMap = new Map();
      for (let i = 0; i < updates.length; i++) {
        const u = updates[i];
        if (!u.rollNo) continue;
        const rollKey = `${uploadClass}_${uploadBatch}_${u.rollNo.trim().toLowerCase()}`;
        if (seenRollMap.has(rollKey)) {
          const prevRow = seenRollMap.get(rollKey);
          showToast(`❌ Duplicate Roll Number in Sheet! Roll No. "${u.rollNo}" appears on Row ${prevRow} and Row ${i + 1}. Each student must have a unique roll number.`, 'error');
          e.target.value = '';
          return;
        }
        seenRollMap.set(rollKey, i + 1);
      }

      const res = await api('/users/bulk-update-roll', {
        method: 'POST',
        body: JSON.stringify({
          updates,
          defaultClass: uploadClass,
          defaultYear: uploadBatch
        })
      });
      showToast(res.message || `✅ Successfully imported ${updates.length} student roll numbers for ${formatClassLabel(uploadClass)}!`, 'success');
      if (uploadBatch) setYearFilter(uploadBatch);
      load();
    } catch (err) {
      showToast(err.message || 'Error processing file', 'error');
    }
    e.target.value = '';
  };

  const startEdit = (s) => {
    setEditingStudentId(s.id);
    setEditForm({ rollNo: s.rollNo || '', academicYear: s.academicYear || '', class: s.class || 'SSC-I' });
  };

  const saveEdit = async (student) => {
    try {
      await api(`/users/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...student,
          rollNo: editForm.rollNo,
          class: editForm.class,
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
    const sampleContent = "sr_no,roll_no\n1,1001\n2,1002\n3,1003\n4,1004\n5,1005\n6,1006\n7,1007\n8,1008\n9,1009\n10,1010\n";
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_student_roll_numbers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Simple 2-column template downloaded! ✓', 'success');
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Students" icon="🎓" backPath="/school" />
      <div className="page-content">
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#166534', fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            🎓 Manage student roll numbers, classes (Grade 9, 10, 11, 12 / Matric & Inter), and academic batches.
          </div>
          <button className="btn btn-primary btn-sm" style={{ padding:'7px 14px', fontSize:12 }} onClick={() => navigate('/school/students/add')}>
            + Add Student
          </button>
        </div>

        {/* Excel / CSV Import */}
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:14, boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:8 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:'#0a1f6b' }}>📥 Import Students (Excel / CSV)</div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>
                Upload a 2-column CSV file: <strong>sr_no, roll_no</strong> (or just <strong>roll_no</strong>).<br />
                Target Class, Batch, and School Code are automatically assigned from your selections below.
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ background:'#f0f4ff', color:'#0a1f6b', fontWeight:700, border:'1px solid #c7d2fe' }} onClick={downloadSampleCSV}>
              📄 Download 2-Col Template (sr_no, roll_no)
            </button>
          </div>
          
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16, marginTop:10 }}>
            <div className="input-group" style={{ margin:0 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--gray-700)' }}>
                Target Class for New Students <span className="req-star">*</span>
              </label>
              <select className="input-field" style={{ padding:8, fontSize:13 }} value={uploadClass} onChange={e=>setUploadClass(e.target.value)}>
                <option value="SSC-I">Class 9 (SSC-I / Matric Part 1)</option>
                <option value="SSC-II">Class 10 (SSC-II / Matric Part 2)</option>
                <option value="HSSC-I">Class 11 (HSSC-I / 1st Year / Inter Part 1)</option>
                <option value="HSSC-II">Class 12 (HSSC-II / 2nd Year / Inter Part 2)</option>
                <option value="SSC-I Supplementary">Class 9 Supplementary</option>
                <option value="SSC-II Supplementary">Class 10 Supplementary</option>
                <option value="HSSC-I Supplementary">Class 11 Supplementary</option>
                <option value="HSSC-II Supplementary">Class 12 Supplementary</option>
              </select>
            </div>
            <div className={`input-group ${!uploadBatch ? 'has-error' : ''}`} style={{ margin:0 }}>
              <label style={{ fontSize:11, fontWeight:700, color: !uploadBatch ? '#dc2626' : 'var(--gray-700)' }}>
                Academic Batch for Import <span className="req-star">*</span>
              </label>
              <select
                className={`input-field ${!uploadBatch ? 'input-error' : ''}`}
                style={{ padding:8, fontSize:13, fontWeight: uploadBatch ? 700 : 400 }}
                value={uploadBatch}
                onChange={e=>setUploadBatch(e.target.value)}
              >
                <option value="">-- Choose Academic Batch * --</option>
                {(batchOptions.length > 0 ? batchOptions : ['2025-2026', '2026-2027', '2027-2028']).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {!uploadBatch && <div className="field-error-msg">⚠️ Choose batch to import into</div>}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleExcelUpload}
              style={{ fontSize:12, cursor:'pointer', flex:1 }}
            />
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}><SearchBar value={search} onChange={setSearch} placeholder="Search student by roll no, unique ID, name..." /></div>
          <select className="input-field" style={{ width:180, fontWeight:600 }} value={classFilter} onChange={e=>setClassFilter(e.target.value)}>
            <option value="">All Classes / Grades</option>
            <option value="SSC-I">Class 9 (SSC-I)</option>
            <option value="SSC-II">Class 10 (SSC-II)</option>
            <option value="HSSC-I">Class 11 (HSSC-I / 1st Year)</option>
            <option value="HSSC-II">Class 12 (HSSC-II / 2nd Year)</option>
            <option value="SSC-I Supplementary">Class 9 Supplementary</option>
            <option value="SSC-II Supplementary">Class 10 Supplementary</option>
            <option value="HSSC-I Supplementary">Class 11 Supplementary</option>
            <option value="HSSC-II Supplementary">Class 12 Supplementary</option>
          </select>
          <select className="input-field" style={{ width:160, fontWeight:600 }} value={yearFilter} onChange={e=>setYearFilter(e.target.value)}>
            <option value="">All Batches</option>
            {(batchOptions.length > 0 ? batchOptions : ['2025-2026', '2026-2027', '2027-2028']).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:10, fontWeight:600, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
          <span>{filtered.length} student{filtered.length !== 1 ? 's' : ''} listed</span>
          <div style={{ display:'flex', gap:10 }}>
            {classFilter && <span style={{ color:'#16a34a' }}>Class: <strong>{formatClassLabel(classFilter)}</strong></span>}
            {yearFilter && <span style={{ color:'#2563eb' }}>Batch: <strong>{yearFilter}</strong></span>}
          </div>
        </div>

        <div className="wide-grid">
          {filtered.map(s => {
            const isEditing = editingStudentId === s.id;
            const globalIndex = students.indexOf(s) + 1;
            const schoolCodeStr = s.schoolCode || (s.schoolId ? `SCH-${String(s.schoolId).padStart(3, '0')}` : 'SCH');
            return (
              <div key={s.id} className="center-card" style={{ background: '#fff', padding: '16px 18px', border: isEditing ? '2px solid #2563eb' : '1px solid var(--gray-200)', borderRadius: 14, boxShadow: 'var(--shadow)' }}>
                {isEditing ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={{ fontWeight:800, fontSize:14, color: '#0a1f6b' }}>
                      ✏️ Edit Student (Roll No: {s.rollNo || s.uniqueId})
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div className="input-group" style={{ margin:0 }}>
                        <label style={{ fontSize:11 }}>Roll Number *</label>
                        <input className="input-field" value={editForm.rollNo} onChange={e=>setEditForm(f=>({...f, rollNo:e.target.value}))} />
                      </div>
                      <div className="input-group" style={{ margin:0 }}>
                        <label style={{ fontSize:11 }}>Class *</label>
                        <select className="input-field" value={editForm.class} onChange={e=>setEditForm(f=>({...f, class:e.target.value}))}>
                          <option value="SSC-I">Class 9 (SSC-I)</option>
                          <option value="SSC-II">Class 10 (SSC-II)</option>
                          <option value="HSSC-I">Class 11 (HSSC-I / 1st Year)</option>
                          <option value="HSSC-II">Class 12 (HSSC-II / 2nd Year)</option>
                          <option value="SSC-I Supplementary">Class 9 Supplementary</option>
                          <option value="SSC-II Supplementary">Class 10 Supplementary</option>
                          <option value="HSSC-I Supplementary">Class 11 Supplementary</option>
                          <option value="HSSC-II Supplementary">Class 12 Supplementary</option>
                        </select>
                      </div>
                    </div>
                    <div className="input-group" style={{ margin:0 }}>
                      <label style={{ fontSize:11 }}>Academic Batch *</label>
                      <select className="input-field" value={editForm.academicYear} onChange={e=>setEditForm(f=>({...f, academicYear:e.target.value}))}>
                        <option value="">-- Choose Batch --</option>
                        {(batchOptions.length > 0 ? batchOptions : ['2025-2026', '2026-2027', '2027-2028']).map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:6 }}>
                      <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={() => saveEdit(s)}>Save Changes</button>
                      <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => setEditingStudentId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8, borderBottom:'1px solid var(--gray-100)', paddingBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ background:'#e0e8ff', color:'#0a1f6b', padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:800 }}>#{globalIndex}</span>
                        <span style={{
                          background: '#f0fdf4', color: '#166534',
                          border: '1px solid #bbf7d0',
                          padding: '3px 8px', borderRadius: 6,
                          fontSize: 12, fontWeight: 800, fontFamily: 'monospace'
                        }}>
                          🏫 {schoolCodeStr}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', fontFamily: 'monospace' }}>
                          {s.uniqueId}
                        </span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{
                          background: '#eff6ff', color: '#1e40af',
                          border: '1.5px solid #bfdbfe',
                          padding: '4px 10px', borderRadius: 8,
                          fontSize: 13, fontWeight: 800,
                          fontFamily: 'monospace'
                        }}>
                          🎯 Roll No: {s.rollNo || '—'}
                        </span>
                        {statusBadge(s.status)}
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:8, fontSize:11, color:'var(--gray-600)', background:'#f8fafc', padding:10, borderRadius:8, border:'1px solid var(--gray-100)' }}>
                      <div>
                        <span style={{ color:'var(--gray-400)' }}>School Code: </span>
                        <strong style={{ color:'#0a1f6b', fontFamily:'monospace' }}>{schoolCodeStr}</strong>
                      </div>
                      <div>
                        <span style={{ color:'var(--gray-400)' }}>Roll No: </span>
                        <strong style={{ color:'#1e40af', fontFamily:'monospace', fontSize:12 }}>{s.rollNo || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ color:'var(--gray-400)' }}>Class: </span>
                        <strong style={{ color:'#059669', fontWeight: 800 }}>{formatClassLabel(s.class)}</strong>
                      </div>
                      <div>
                        <span style={{ color:'var(--gray-400)' }}>Batch: </span>
                        <strong style={{ color:'#2563eb' }}>{s.academicYear || '—'}</strong>
                      </div>
                    </div>

                    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding:'5px 12px', fontSize:11 }} onClick={() => startEdit(s)}>✏️ Edit</button>
                      <button className="btn btn-red btn-sm" style={{ padding:'5px 12px', fontSize:11 }} onClick={() => setConfirmDelete(s.id)}>🗑 Remove</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No students found matching your criteria.</div>}
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
  const [importedTeachersModal, setImportedTeachersModal] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [resetModalTeacher, setResetModalTeacher] = useState(null);
  const [customResetPassword, setCustomResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = useCallback(()=>api('/users?role=Teacher').then(setTeachers).catch(e=>showToast(e.message,'error')),[api,showToast]);
  useEffect(()=>{ load(); },[load]);

  const filtered = teachers.filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase())||t.uniqueId.toLowerCase().includes(search.toLowerCase())||(t.username && t.username.toLowerCase().includes(search.toLowerCase())));

  const handleDelete = async (id) => {
    try { await api(`/users/${id}`, { method:'DELETE' }); showToast('Teacher removed','success'); load(); } catch(e) { showToast(e.message,'error'); }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, label = 'Password') => {
    navigator.clipboard.writeText(text);
    showToast(`✅ ${label} copied to clipboard!`, 'success');
  };

  const handleResetPassword = async () => {
    if (!resetModalTeacher) return;
    setResetting(true);
    try {
      const res = await api(`/users/${resetModalTeacher.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ customPassword: customResetPassword })
      });
      showToast(`✅ Password reset! New password: ${res.newPassword}`, 'success');
      setResetModalTeacher(null);
      setCustomResetPassword('');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setResetting(false);
  };

  const parseTeacherCSVText = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => {
      const row = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' || c === "'") {
          inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
          row.push(cur.trim().replace(/^["']|["']$/g, ''));
          cur = '';
        } else {
          cur += c;
        }
      }
      row.push(cur.trim().replace(/^["']|["']$/g, ''));
      return row;
    });
  };

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

  const handleTeacherExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showToast('Processing file...', 'info');
      let rows = [];
      const fileName = (file.name || '').toLowerCase();

      if (fileName.endsWith('.csv') || file.type === 'text/csv') {
        const text = await file.text();
        rows = parseTeacherCSVText(text);
      } else {
        const XLSX = await loadXlsxLibrary();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      }

      if (!rows || rows.length === 0) {
        showToast('The uploaded file appears to be empty.', 'error');
        e.target.value = '';
        return;
      }

      const cleanStr = (val) => (val === undefined || val === null) ? '' : String(val).trim().replace(/^["']|["']$/g, '').trim();

      // Detect headers in the first row
      const headerRow = (rows[0] || []).map(c => cleanStr(c).toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      let nameIdx = -1;
      let phoneIdx = -1;
      let emailIdx = -1;
      let srNoIdx = -1;

      headerRow.forEach((col, idx) => {
        if (['name', 'teachername', 'fullname', 'teacher', 'instructor', 'faculty'].includes(col)) nameIdx = idx;
        else if (['phone', 'contact', 'mobile', 'cell', 'phoneno', 'contactno', 'cellno'].includes(col)) phoneIdx = idx;
        else if (['email', 'emailaddress', 'mail'].includes(col)) emailIdx = idx;
        else if (['srno', 'sr', 'sno', 'serial', 'no', 'num'].includes(col)) srNoIdx = idx;
      });

      const hasNamedHeaders = (nameIdx !== -1 || phoneIdx !== -1 || emailIdx !== -1);
      let startRow = hasNamedHeaders ? 1 : 0;

      if (!hasNamedHeaders && rows.length > 1) {
        const firstRowStr = (rows[0] || []).map(c => cleanStr(c).toLowerCase()).join(' ');
        if (firstRowStr.includes('name') || firstRowStr.includes('phone') || firstRowStr.includes('contact') || firstRowStr.includes('email')) {
          startRow = 1;
        }
      }

      const teacherList = [];

      for (let r = startRow; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        let name = '';
        let phone = '';
        let email = '';

        if (hasNamedHeaders) {
          if (nameIdx !== -1) name = cleanStr(row[nameIdx]);
          if (phoneIdx !== -1) phone = cleanStr(row[phoneIdx]);
          if (emailIdx !== -1) email = cleanStr(row[emailIdx]);
        } else {
          // Positional fallback:
          // 1 col: name
          // 2 cols: sr_no, name OR name, phone
          // 3 cols: sr_no, name, phone OR name, phone, email
          // 4 cols: sr_no, name, phone, email
          const col0 = cleanStr(row[0]);
          const col1 = row.length > 1 ? cleanStr(row[1]) : '';
          const col2 = row.length > 2 ? cleanStr(row[2]) : '';
          const col3 = row.length > 3 ? cleanStr(row[3]) : '';

          if (row.length === 1) {
            name = col0;
          } else if (row.length === 2) {
            if (/^\d+$/.test(col0) && col0.length <= 4) {
              name = col1;
            } else {
              name = col0;
              phone = col1;
            }
          } else if (row.length === 3) {
            if (/^\d+$/.test(col0) && col0.length <= 4) {
              name = col1;
              phone = col2;
            } else {
              name = col0;
              phone = col1;
              email = col2;
            }
          } else {
            name = col1;
            phone = col2;
            email = col3;
          }
        }

        if (!name) continue;

        teacherList.push({ name, phone, email });
      }

      if (teacherList.length === 0) {
        showToast('No valid teacher names found in sheet.', 'error');
        e.target.value = '';
        return;
      }

      const res = await api('/users/bulk-import-teachers', {
        method: 'POST',
        body: JSON.stringify({ teachers: teacherList })
      });

      showToast(res.message || `✅ Successfully imported ${teacherList.length} teachers!`, 'success');
      if (Array.isArray(res.teachers) && res.teachers.length > 0) {
        setImportedTeachersModal(res.teachers);
      }
      load();
    } catch (err) {
      showToast(err.message || 'Error processing file', 'error');
    }
    e.target.value = '';
  };

  const downloadTeacherSampleCSV = () => {
    const sampleContent = "sr_no,name,phone,email\n1,Sir Tariq Mahmood,03001234567,tariq@school.edu\n2,Mam Ayesha Khan,03219876543,ayesha@school.edu\n3,Sir Usman Shah,03335554433,usman@school.edu\n4,Mam Fatima Noor,03451122334,fatima@school.edu\n";
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_teachers_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Teacher CSV template downloaded! ✓', 'success');
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Teachers" icon="👩‍🏫" backPath="/school" />
      <div className="page-content">
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#166534', fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            👩‍🏫 Manage teachers and staff. View/copy credentials, reset passwords, or upload in bulk.
          </div>
          <button className="btn btn-primary btn-sm" style={{ padding:'7px 14px', fontSize:12 }} onClick={()=>navigate('/school/teachers/add')}>
            + Add Teacher
          </button>
        </div>

        {/* Excel / CSV Import */}
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:14, boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:8 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:'#0a1f6b' }}>📥 Import Teachers (Excel / CSV)</div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>
                Upload a CSV or Excel file with columns: <strong>name, phone, email</strong> (or <strong>sr_no, name, phone, email</strong>).<br />
                Usernames and initial passwords will be automatically generated for all imported teachers.
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ background:'#f0f4ff', color:'#0a1f6b', fontWeight:700, border:'1px solid #c7d2fe' }} onClick={downloadTeacherSampleCSV}>
              📄 Download Sample CSV
            </button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleTeacherExcelUpload}
              style={{ fontSize:12, cursor:'pointer', flex:1 }}
            />
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:10, fontWeight:600 }}>
          {filtered.length} teacher{filtered.length !== 1 ? 's' : ''} listed
        </div>

        <div className="wide-grid">
          {filtered.map(t=>{
            const isPassVisible = !!visiblePasswords[t.id];
            const displayPassword = t.plainPassword || 'teach1234';

            return (
              <div key={t.id} className="center-card" style={{ background:'#fff', padding:'16px 18px', borderRadius:14, border:'1px solid var(--gray-200)', boxShadow:'var(--shadow)', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px solid var(--gray-100)', paddingBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:'#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
                      <span>ID: <strong style={{ color:'#0a1f6b', fontFamily:'monospace' }}>{t.uniqueId}</strong></span>
                      <span>Username: <strong style={{ color:'#16a34a', fontFamily:'monospace' }}>{t.username}</strong></span>
                    </div>
                  </div>
                  <div>{statusBadge(t.status)}</div>
                </div>

                {/* Password Display & Copy Box */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'8px 12px', border:'1px solid var(--gray-200)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, color:'var(--gray-500)', fontWeight:600 }}>🔑 Password:</span>
                    <strong style={{
                      fontFamily:'monospace',
                      fontSize:13,
                      color: isPassVisible ? '#b45309' : 'var(--gray-400)',
                      letterSpacing: isPassVisible ? 0.5 : 2
                    }}>
                      {isPassVisible ? displayPassword : '••••••••'}
                    </strong>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding:'3px 8px', fontSize:11, background:'#fff', border:'1px solid var(--gray-200)' }}
                      onClick={()=>togglePasswordVisibility(t.id)}
                      title={isPassVisible ? "Hide password" : "Show password"}
                    >
                      {isPassVisible ? '🙈 Hide' : '👁️ Show'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding:'3px 8px', fontSize:11, background:'#fff', border:'1px solid var(--gray-200)' }}
                      onClick={()=>copyToClipboard(displayPassword, `${t.name}'s Password`)}
                      title="Copy Password"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                {(t.phone || t.email || t.assignedClassroom) && (
                  <div style={{ fontSize:11, color:'var(--gray-600)', display:'flex', flexDirection:'column', gap:2 }}>
                    {t.phone && <div>📞 Phone: <strong>{t.phone}</strong></div>}
                    {t.email && <div>✉️ Email: <strong>{t.email}</strong></div>}
                    {t.assignedClassroom && <div style={{ color:'#1d4ed8', fontWeight:700 }}>🏛️ Duty Room: {t.assignedClassroom}</div>}
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:4, borderTop:'1px solid var(--gray-100)' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding:'5px 12px', fontSize:11, color:'#1d4ed8', fontWeight:700, border:'1px solid #bfdbfe', background:'#eff6ff' }}
                    onClick={()=>{ setResetModalTeacher(t); setCustomResetPassword(''); }}
                  >
                    🔑 Reset Password
                  </button>
                  <button
                    className="btn btn-red btn-sm"
                    style={{ padding:'5px 12px', fontSize:11 }}
                    onClick={()=>setConfirmDelete(t.id)}
                  >
                    🗑 Remove
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>No teachers found.</div>}
        </div>
      </div>

      {/* Modal for Resetting Password */}
      {resetModalTeacher && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:22, maxWidth:420, width:'100%', boxShadow:'0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:15, color:'#0a1f6b' }}>🔑 Reset Teacher Password</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setResetModalTeacher(null)}>✕</button>
            </div>
            <div style={{ fontSize:12, color:'var(--gray-600)', marginBottom:14 }}>
              Resetting password for <strong>{resetModalTeacher.name}</strong> (@{resetModalTeacher.username})
            </div>
            <div className="input-group">
              <label style={{ fontSize:11, fontWeight:700 }}>New Password (Optional)</label>
              <input
                className="input-field"
                placeholder="Leave blank to auto-generate"
                value={customResetPassword}
                onChange={e=>setCustomResetPassword(e.target.value)}
              />
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setResetModalTeacher(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handleResetPassword} disabled={resetting}>
                {resetting ? 'Saving…' : 'Save & Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal showing imported teachers credentials */}
      {importedTeachersModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, maxWidth:600, width:'100%', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--gray-100)', paddingBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:15, color:'#166534' }}>
                🎉 Teachers Imported Successfully ({importedTeachersModal.length})
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setImportedTeachersModal(null)}>✕</button>
            </div>
            <div style={{ fontSize:12, color:'var(--gray-600)', margin:'10px 0' }}>
              Credentials have been auto-generated for the imported teachers:
            </div>
            <div style={{ flex:1, overflowY:'auto', border:'1px solid var(--gray-100)', borderRadius:10 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'1px solid var(--gray-200)' }}>
                    <th style={{ padding:8, textAlign:'left' }}>Teacher</th>
                    <th style={{ padding:8, textAlign:'left' }}>ID</th>
                    <th style={{ padding:8, textAlign:'left' }}>Username</th>
                    <th style={{ padding:8, textAlign:'left' }}>Default Password</th>
                  </tr>
                </thead>
                <tbody>
                  {importedTeachersModal.map(t => (
                    <tr key={t.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                      <td style={{ padding:8, fontWeight:700 }}>{t.name}</td>
                      <td style={{ padding:8, fontFamily:'monospace', color:'#0a1f6b' }}>{t.uniqueId}</td>
                      <td style={{ padding:8, fontFamily:'monospace', color:'#16a34a' }}>{t.username}</td>
                      <td style={{ padding:8, fontFamily:'monospace', fontWeight:700, color:'#b45309' }}>{t.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
              <button className="btn btn-primary" onClick={()=>setImportedTeachersModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} onConfirm={()=>handleDelete(confirmDelete)} title="Remove Teacher" message="This will permanently remove this teacher." />
    </Page>
  );
}

export function AddSchoolTeacher() {
  const navigate = useNavigate();
  const { api, showToast, currentUser } = useApp();
  const [form, setForm] = useState({ name:'', email:'', phone:'', username:'', password:'' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const set = (k,v) => {
    setForm(f=>({...f,[k]:v}));
    if (errors[k]) setErrors(e=>({...e, [k]: null}));
  };

  const save = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full Name is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('⚠️ Please enter the teacher full name', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api('/users', { method:'POST', body: JSON.stringify({ ...form, role:'Teacher' }) });
      if (res.generatedUsername) {
        setGenerated({
          name: form.name,
          uniqueId: res.uniqueId,
          username: res.generatedUsername,
          password: res.generatedPassword,
        });
        showToast('✅ Teacher added successfully!', 'success');
      } else {
        showToast('✅ Teacher added successfully!', 'success');
        setTimeout(()=>navigate('/school/teachers'), 700);
      }
    } catch(e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Add Teacher" icon="👩‍🏫" backPath="/school/teachers" />
      <div className="page-content">
        {generated ? (
          <div style={{ background:'#fff', borderRadius:16, border:'2px solid #16a34a', padding:24, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:40, textAlign:'center', marginBottom:8 }}>🎉</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'#14532d', textAlign:'center', margin:0 }}>Teacher Registered Successfully!</h2>
            <p style={{ fontSize:12, color:'var(--gray-500)', textAlign:'center', marginTop:4, marginBottom:20 }}>
              Credentials for <strong>{generated.name}</strong>
            </p>
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:16, marginBottom:20, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Unique ID:</span>
                <strong style={{ color:'#0a1f6b', fontFamily:'monospace', fontSize:14 }}>{generated.uniqueId}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Username:</span>
                <strong style={{ color:'#16a34a', fontFamily:'monospace', fontSize:14 }}>{generated.username}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Default Password:</span>
                <strong style={{ color:'#16a34a', fontFamily:'monospace', fontSize:14 }}>{generated.password}</strong>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline" style={{ flex:1 }} onClick={() => {
                setGenerated(null);
                setForm({ name:'', email:'', phone:'', username:'', password:'' });
              }}>+ Add Another Teacher</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={() => navigate('/school/teachers')}>Done</button>
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', boxShadow:'var(--shadow)' }}>
            <div className={`input-group ${errors.name ? 'has-error' : ''}`}>
              <label>Full Name <span className="req-star">*</span></label>
              <input
                className={`input-field ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. Sir Tariq Mahmood"
                value={form.name}
                onChange={e=>set('name',e.target.value)}
              />
              {errors.name && <div className="field-error-msg">⚠️ {errors.name}</div>}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="input-group">
                <label>Phone / Contact (Optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. 0300 1234567"
                  value={form.phone}
                  onChange={e=>set('phone',e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Email (Optional)</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="e.g. teacher@school.edu"
                  value={form.email}
                  onChange={e=>set('email',e.target.value)}
                />
              </div>
            </div>

            <div style={{ background:'#f8fafc', padding:12, borderRadius:8, border:'1px solid var(--gray-200)', marginTop:8, fontSize:11, color:'var(--gray-600)' }}>
              ℹ️ <strong>Auto-Credentials:</strong> Teacher logins are formatted as <code>[school_code]@[teacher_name]</code> (e.g. <code>sch009@sharyar</code> or <code>sch010@tariq</code>) to prevent name conflicts across different schools.
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
              <div className="input-group">
                <label>Custom Username (Optional)</label>
                <input
                  className="input-field"
                  placeholder={currentUser?.schoolCode ? `e.g. ${currentUser.schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@tariq` : 'e.g. sch009@tariq'}
                  value={form.username}
                  onChange={e=>set('username',e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Custom Password (Optional)</label>
                <input
                  className="input-field"
                  placeholder="Auto-generated if blank"
                  value={form.password}
                  onChange={e=>set('password',e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop:16, width:'100%', padding:12, fontWeight:700 }} onClick={save} disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Adding Teacher…</> : '+ Register Teacher'}
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}

export function SchoolAssignDuty() {
  const { api, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' or 'students'
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState(['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block A', 'Block B', 'Block C']);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherBlock, setTeacherBlock] = useState('Block 1');
  const [customTeacherBlock, setCustomTeacherBlock] = useState('');
  const [duties, setDuties] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentBlock, setStudentBlock] = useState('Block 1');
  const [customStudentBlock, setCustomStudentBlock] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [studentTab, setStudentTab] = useState('unallocated'); // 'unallocated' or 'allocated'

  useEffect(() => {
    api('/exams').then(setExams).catch(()=>{}); 
    api('/users?role=Teacher').then(setTeachers).catch(()=>{});
    api('/exams/blocks').then(res => {
      if (Array.isArray(res) && res.length > 0) {
        setAvailableBlocks(res);
      }
    }).catch(()=>{});
  }, [api]);

  useEffect(() => {
    if (!selectedExam) { setDuties([]); setStudents([]); return; }
    if (activeTab === 'teachers') {
      api(`/exams/${selectedExam}/duties`).then(res => {
        setDuties(res);
        // Merge duties blocks into available blocks
        const dutyBlocks = res.map(d => d.classroom || d.block).filter(Boolean);
        if (dutyBlocks.length > 0) {
          setAvailableBlocks(prev => Array.from(new Set([...prev, ...dutyBlocks])));
        }
      }).catch(()=>{});
    } else {
      api(`/exams/${selectedExam}/roster`).then(res => {
        setStudents(res);
        // Also fetch duties to display assigned invigilators in block dropdown
        api(`/exams/${selectedExam}/duties`).then(setDuties).catch(()=>{});
      }).catch(()=>{});
    }
  }, [api, selectedExam, activeTab]);

  const loadStudents = () => {
    if (selectedExam) {
      api(`/exams/${selectedExam}/roster`).then(setStudents).catch(()=>{});
    }
  };

  const assignTeacher = async () => {
    const finalBlock = teacherBlock === '__custom__' ? customTeacherBlock.trim() : teacherBlock.trim();
    if (!selectedExam || !selectedTeacher || !finalBlock) {
      showToast('Please select Exam, Teacher, and Block', 'error');
      return;
    }
    setLoading(true);
    try {
      await api(`/exams/${selectedExam}/assign-duty`, {
        method: 'POST',
        body: JSON.stringify({ teacherId: selectedTeacher, block: finalBlock, classroom: finalBlock })
      });
      showToast(`Duty assigned to ${finalBlock}! ✓`, 'success');
      // Refresh available blocks
      if (!availableBlocks.includes(finalBlock)) {
        setAvailableBlocks(prev => [...prev, finalBlock]);
      }
      api(`/exams/${selectedExam}/duties`).then(setDuties);
      setSelectedTeacher('');
      if (teacherBlock === '__custom__') {
        setTeacherBlock(finalBlock);
        setCustomTeacherBlock('');
      }
    } catch(e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  const assignStudentsToBlock = async () => {
    const finalBlock = studentBlock === '__custom__' ? customStudentBlock.trim() : studentBlock.trim();
    if (!selectedExam || !finalBlock || selectedStudents.length === 0) {
      showToast('Please choose a Block and select at least one student', 'error');
      return;
    }
    setLoading(true);
    try {
      await api(`/exams/${selectedExam}/assign-students-room`, {
        method: 'POST',
        body: JSON.stringify({ block: finalBlock, classroom: finalBlock, studentIds: selectedStudents })
      });
      showToast(`✅ Successfully allocated ${selectedStudents.length} student(s) to ${finalBlock}!`, 'success');
      if (!availableBlocks.includes(finalBlock)) {
        setAvailableBlocks(prev => [...prev, finalBlock]);
      }
      setSelectedStudents([]);
      if (studentBlock === '__custom__') {
        setStudentBlock(finalBlock);
        setCustomStudentBlock('');
      }
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

  // Student filtering
  const unallocatedStudents = students.filter(s => s.classroom === 'Unallocated');
  const allocatedStudents = students.filter(s => s.classroom !== 'Unallocated');
  
  let displayedStudents = studentTab === 'unallocated' ? unallocatedStudents : allocatedStudents;
  if (studentTab === 'allocated' && blockFilter !== 'ALL') {
    displayedStudents = displayedStudents.filter(s => s.classroom === blockFilter);
  }
  if (searchStudent.trim()) {
    const q = searchStudent.toLowerCase();
    displayedStudents = displayedStudents.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.rollNo || '').toLowerCase().includes(q) ||
      (s.uniqueId || '').toLowerCase().includes(q) ||
      (s.schoolName || '').toLowerCase().includes(q)
    );
  }

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

  // Distinct allocated blocks for filtering tab
  const allocatedBlocks = Array.from(new Set(allocatedStudents.map(s => s.classroom).filter(Boolean)));

  return (
    <Page>
      <Toast />
      <PageHeader title="Block Allocations" icon="🏢" backPath="/school" />
      <div className="page-content">
        <div className="att-tabs" style={{ marginBottom: 16 }}>
          <button className={`att-tab ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}>
            👩‍🏫 Assign Teachers to Blocks
          </button>
          <button className={`att-tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            🎓 Allocate Students to Blocks
          </button>
        </div>

        {/* Exam Picker */}
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:14 }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label style={{ fontWeight:700, color:'#0a1f6b' }}>Select Exam (held at your center) *</label>
            <select className="input-field" value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setSelectedStudents([]); }}>
              <option value="">-- Choose Exam Schedule --</option>
              {exams.map(e => <option key={e._id} value={e._id}>{e.subject} — Class {e.class} · 📅 {e.date} {e.time ? `(${e.time})` : ''}</option>)}
            </select>
          </div>
        </div>

        {activeTab === 'teachers' ? (
          <>
            {/* Teacher Duty Assignment */}
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid var(--gray-100)' }}>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:12, color:'#0a1f6b' }}>
                🏢 Assign Teacher to Exam Block
              </div>
              
              <div className="input-group">
                <label>Teacher (your school staff) *</label>
                <select className="input-field" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.uniqueId})</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>Select Exam Block *</label>
                <select className="input-field" value={teacherBlock} onChange={e => setTeacherBlock(e.target.value)}>
                  {availableBlocks.map(b => (
                    <option key={b} value={b}>📍 {b}</option>
                  ))}
                  <option value="__custom__">➕ + Add New Custom Block...</option>
                </select>
              </div>

              {teacherBlock === '__custom__' && (
                <div className="input-group" style={{ marginTop: 8 }}>
                  <label>New Block Name *</label>
                  <input 
                    className="input-field" 
                    placeholder="e.g. Block D or Main Auditorium" 
                    value={customTeacherBlock} 
                    onChange={e => setCustomTeacherBlock(e.target.value)} 
                    autoFocus
                  />
                </div>
              )}

              <button className="btn btn-primary" style={{ marginTop:10 }} onClick={assignTeacher} disabled={loading || !selectedExam || !selectedTeacher}>
                {loading ? 'Assigning…' : '✓ Assign Teacher to Block'}
              </button>
            </div>

            {/* Current Duties */}
            {duties.length > 0 && (
              <div style={{ marginTop:18, background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
                <div style={{ fontWeight:800, fontSize:13, color:'#0a1f6b', marginBottom:12 }}>
                  📋 Current Block In-Charges ({duties.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {duties.map(d => (
                    <div key={d._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{d.teacherId?.name}</div>
                        <div style={{ fontSize:11, color:'var(--gray-500)' }}>ID: {d.teacherId?.uniqueId}</div>
                      </div>
                      <span style={{ background:'#dbeafe', color:'#1e40af', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:800, border:'1px solid #bfdbfe' }}>
                        📍 {d.classroom || d.block}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Student Seating Allocation by Block */}
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid var(--gray-100)', marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:6, color:'#0a1f6b' }}>
                🏢 Allocate Students to Block
              </div>
              <p style={{ fontSize:11, color:'var(--gray-500)', margin:'0 0 14px' }}>
                Choose an exam block from the dropdown, select students below, and click Allocate.
              </p>

              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'flex-end' }}>
                <div className="input-group" style={{ margin:0 }}>
                  <label>Target Exam Block *</label>
                  <select className="input-field" value={studentBlock} onChange={e => setStudentBlock(e.target.value)}>
                    {availableBlocks.map(b => {
                      const duty = duties.find(d => (d.classroom || d.block) === b);
                      return (
                        <option key={b} value={b}>
                          📍 {b} {duty ? `— (Invigilator: ${duty.teacherId?.name})` : ''}
                        </option>
                      );
                    })}
                    <option value="__custom__">➕ + Add New Custom Block...</option>
                  </select>
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={assignStudentsToBlock} 
                  disabled={loading || selectedStudents.length === 0 || !selectedExam}
                  style={{ whiteSpace:'nowrap', height:42 }}
                >
                  {loading ? 'Allocating…' : `Allocate ${selectedStudents.length} Selected Student(s)`}
                </button>
              </div>

              {studentBlock === '__custom__' && (
                <div className="input-group" style={{ marginTop: 10 }}>
                  <label>New Block Name *</label>
                  <input 
                    className="input-field" 
                    placeholder="e.g. Block 6 or Hall A" 
                    value={customStudentBlock} 
                    onChange={e => setCustomStudentBlock(e.target.value)} 
                    autoFocus
                  />
                </div>
              )}
            </div>

            {selectedExam && students.length > 0 && (
              <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)' }}>
                
                {/* Search and Tabs */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      className={`btn ${studentTab === 'unallocated' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                      style={{ borderRadius:20, padding:'6px 16px', fontWeight:700 }}
                      onClick={() => handleStudentTabChange('unallocated')}
                    >
                      Unallocated ({unallocatedStudents.length})
                    </button>
                    <button
                      className={`btn ${studentTab === 'allocated' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                      style={{ borderRadius:20, padding:'6px 16px', fontWeight:700 }}
                      onClick={() => handleStudentTabChange('allocated')}
                    >
                      Allocated ({allocatedStudents.length})
                    </button>
                  </div>

                  {studentTab === 'allocated' && allocatedBlocks.length > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:11, color:'var(--gray-500)', fontWeight:600 }}>Filter Block:</span>
                      <select 
                        className="input-field" 
                        style={{ padding:'4px 8px', fontSize:11, width:'auto', height:32 }}
                        value={blockFilter}
                        onChange={e => setBlockFilter(e.target.value)}
                      >
                        <option value="ALL">All Blocks</option>
                        {allocatedBlocks.map(b => <option key={b} value={b}>📍 {b}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Search Bar & Select All */}
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                  <input 
                    className="input-field" 
                    style={{ flex:1, fontSize:12, padding:'8px 12px' }}
                    placeholder="🔍 Search student by Roll No, Name, or School..."
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                  />
                  {displayedStudents.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={selectAllFiltered} style={{ whiteSpace:'nowrap', border:'1px solid #cbd5e1' }}>
                      {displayedStudents.map(s => s.id).every(id => selectedStudents.includes(id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Student List */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:'500px', overflowY:'auto' }}>
                  {displayedStudents.map(s => {
                    const isChecked = selectedStudents.includes(s.id);
                    const isUnallocated = s.classroom === 'Unallocated';
                    return (
                      <div 
                        key={s.id} 
                        onClick={() => handleStudentSelect(s.id)} 
                        style={{ 
                          display:'flex', 
                          alignItems:'center', 
                          gap:12, 
                          padding:'10px 12px', 
                          border:'1px solid',
                          borderColor: isChecked ? '#93c5fd' : '#f1f5f9',
                          cursor:'pointer', 
                          background: isChecked ? '#eff6ff' : '#fff', 
                          borderRadius:10,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input type="checkbox" checked={isChecked} readOnly style={{ pointerEvents:'none' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight:700, fontSize:12, color:'#0f172a' }}>{s.name || `Student ${s.uniqueId}`}</div>
                          <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>
                            Roll: <strong style={{ color:'#0a1f6b' }}>{s.rollNo}</strong> · ID: {s.uniqueId} · {s.schoolName}
                          </div>
                        </div>
                        <span style={{ 
                          fontSize:11, 
                          padding:'4px 10px', 
                          borderRadius:20, 
                          fontWeight:800,
                          background: isUnallocated ? '#f3f4f6' : '#dbeafe',
                          color: isUnallocated ? '#64748b' : '#1e40af',
                          border: isUnallocated ? '1px solid #e2e8f0' : '1px solid #bfdbfe'
                        }}>
                          {isUnallocated ? '⏳ Unallocated' : `📍 ${s.classroom}`}
                        </span>
                      </div>
                    );
                  })}
                  {displayedStudents.length === 0 && (
                    <div style={{ textAlign:'center', color:'var(--gray-400)', padding:36 }}>
                      No {studentTab} students found matching your criteria.
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedExam && students.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40, background:'#fff', borderRadius:14, border:'1px solid var(--gray-100)' }}>
                No students registered for this exam's class at your center.
              </div>
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
    const headers = ['School Name', 'School Code', 'Candidate Count', 'Center Allocation Status'];
    const rows = [
      headers.join(','),
      ...(centerInfo.isSelfCenter ? [`"${currentUser?.schoolName || 'Own School'}", "SELF-HOST", ${centerInfo.ownStudentsAtThisCenter}, "Own School (Self-Center)"`] : []),
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
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0a1f6b' }}>
                      {centerInfo.isCenter ? 'Active Examination Center' : 'Not an Assigned Center'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                      {centerInfo.isCenter
                        ? `Hosting ${centerInfo.assignedSchools.length} home school(s), with ${centerInfo.totalCenterCandidates} total candidates sitting exams here.`
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
                <div style={{ background: '#f0f4ff', padding: 12, borderRadius: 10, border: '1px solid #c7d2fe' }}>
                  <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Incoming Candidates</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', marginTop: 2 }}>{centerInfo.totalIncomingStudents}</div>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', marginTop: 2 }}>From {centerInfo.assignedSchools.length} assigned school(s)</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>Own School (Self-Center)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0a1f6b', marginTop: 2 }}>{centerInfo.ownStudentsAtThisCenter}</div>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', marginTop: 2 }}>
                    {centerInfo.isSelfCenter ? 'Sitting on campus' : 'Sitting at external center'}
                  </div>
                </div>
                <div style={{ background: '#dcfce7', padding: 12, borderRadius: 10, border: '1px solid #86efac' }}>
                  <div style={{ fontSize: 10, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Total Center Candidates</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginTop: 2 }}>{centerInfo.totalCenterCandidates}</div>
                  <div style={{ fontSize: 10, color: '#166534', marginTop: 2 }}>Candidates sitting in your building</div>
                </div>
              </div>

              {centerInfo.externalCenter && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 11, color: '#1e40af' }}>
                  ℹ️ <strong>Your Own Students:</strong> Your school's <strong>{centerInfo.ownStudentsTotal} enrolled students</strong> take their examinations at: <strong>📍 {centerInfo.externalCenter.name} ({centerInfo.externalCenter.schoolCode})</strong>.
                </div>
              )}

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
                  {centerInfo.isSelfCenter && (
                    <tr style={{ borderBottom: '1px solid var(--gray-100)', background: '#fff' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{currentUser?.schoolName} (Own School - Self Center)</td>
                      <td style={{ padding: '8px 10px', color: 'var(--gray-500)' }}>SELF-HOST</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{centerInfo.ownStudentsAtThisCenter}</td>
                    </tr>
                  )}
                  {centerInfo.assignedSchools.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--gray-100)', background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--gray-500)' }}>{s.schoolCode}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#1d4ed8' }}>{s.studentCount}</td>
                    </tr>
                  ))}
                  {centerInfo.assignedSchools.length === 0 && !centerInfo.isSelfCenter && (
                    <tr>
                      <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)' }}>No home schools currently assigned to sit exams at this center.</td>
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

export function AddSchoolStudent() {
  const navigate = useNavigate();
  const { api, showToast, user } = useApp();
  const [form, setForm] = useState({ class: 'SSC-I', academicYear: '', rollNo: '', section: '' });
  const [batchOptions, setBatchOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generated, setGenerated] = useState(null);
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  useEffect(() => {
    api('/academic/years')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setBatchOptions(res);
        }
      })
      .catch(() => {});
  }, [api]);

  const save = async () => {
    const errs = {};
    if (!form.rollNo.trim()) errs.rollNo = 'Roll number is required';
    if (!form.class) errs.class = 'Class is required';
    if (!form.academicYear) errs.academicYear = 'Please select an academic batch';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('⚠️ Please fill in all required fields and choose an Academic Batch', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          name: `Student ${form.rollNo.trim()}`,
          role: 'Student'
        })
      });
      if (res.generatedUsername) {
        setGenerated({
          uniqueId: res.uniqueId,
          rollNo: form.rollNo,
          class: form.class,
          batch: form.academicYear,
          schoolCode: user?.schoolCode || `SCH-${user?.school_id || '010'}`,
          username: res.generatedUsername,
          password: res.generatedPassword,
        });
        showToast('Student registered successfully! ✓', 'success');
      } else {
        showToast('Student registered! ✓', 'success');
        setTimeout(() => navigate('/school/students'), 800);
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Add Student" icon="🎓" backPath="/school/students" />
      <div className="page-content">
        {generated ? (
          <div style={{ background:'#fff', borderRadius:16, border:'2px solid #16a34a', padding:24, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:40, textAlign:'center', marginBottom:8 }}>🎉</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'#14532d', textAlign:'center', margin:0 }}>Student Registered Successfully!</h2>
            <p style={{ fontSize:12, color:'var(--gray-500)', textAlign:'center', marginTop:4, marginBottom:20 }}>
              Roll No: <strong>{generated.rollNo}</strong> · Class: <strong>{formatClassLabel(generated.class)}</strong>
            </p>
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:16, marginBottom:20, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Unique ID:</span>
                <strong style={{ color:'#0a1f6b', fontFamily:'monospace', fontSize:14 }}>{generated.uniqueId}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Roll No:</span>
                <strong style={{ color:'#1e40af', fontFamily:'monospace', fontSize:14 }}>{generated.rollNo}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Class:</span>
                <strong style={{ color:'#059669', fontSize:14 }}>{formatClassLabel(generated.class)}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Username:</span>
                <strong style={{ color:'#16a34a', fontFamily:'monospace', fontSize:14 }}>{generated.username}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--gray-500)' }}>Default Password:</span>
                <strong style={{ color:'#16a34a', fontFamily:'monospace', fontSize:14 }}>{generated.password}</strong>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline" style={{ flex:1 }} onClick={() => {
                setGenerated(null);
                setForm({ class: form.class, academicYear: '', rollNo: '', section: '' });
              }}>+ Add Another Student</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={() => navigate('/school/students')}>Done</button>
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', boxShadow:'var(--shadow)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className={`input-group ${errors.rollNo ? 'has-error' : ''}`}>
                <label>Roll Number <span className="req-star">*</span></label>
                <input
                  className={`input-field ${errors.rollNo ? 'input-error' : ''}`}
                  placeholder="e.g. 1001"
                  value={form.rollNo}
                  onChange={e => set('rollNo', e.target.value)}
                />
                {errors.rollNo && <div className="field-error-msg">⚠️ {errors.rollNo}</div>}
              </div>

              <div className={`input-group ${errors.class ? 'has-error' : ''}`}>
                <label>Class <span className="req-star">*</span></label>
                <select
                  className={`input-field ${errors.class ? 'input-error' : ''}`}
                  value={form.class}
                  onChange={e => set('class', e.target.value)}
                >
                  <option value="SSC-I">Class 9 (SSC-I / Matric Part 1)</option>
                  <option value="SSC-II">Class 10 (SSC-II / Matric Part 2)</option>
                  <option value="HSSC-I">Class 11 (HSSC-I / 1st Year / Inter Part 1)</option>
                  <option value="HSSC-II">Class 12 (HSSC-II / 2nd Year / Inter Part 2)</option>
                  <option value="SSC-I Supplementary">Class 9 Supplementary</option>
                  <option value="SSC-II Supplementary">Class 10 Supplementary</option>
                  <option value="HSSC-I Supplementary">Class 11 Supplementary</option>
                  <option value="HSSC-II Supplementary">Class 12 Supplementary</option>
                </select>
                {errors.class && <div className="field-error-msg">⚠️ {errors.class}</div>}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className={`input-group ${errors.academicYear ? 'has-error' : ''}`}>
                <label>Academic Batch <span className="req-star">*</span></label>
                <select
                  className={`input-field ${errors.academicYear ? 'input-error' : ''}`}
                  value={form.academicYear}
                  onChange={e => set('academicYear', e.target.value)}
                >
                  <option value="">-- Choose Academic Batch * --</option>
                  {(batchOptions.length > 0 ? batchOptions : ['2025-2026', '2026-2027', '2027-2028']).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {errors.academicYear && <div className="field-error-msg">⚠️ {errors.academicYear}</div>}
              </div>

              <div className="input-group">
                <label>Section (Optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. A"
                  value={form.section}
                  onChange={e => set('section', e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop:16, width:'100%', padding:12, fontWeight:700, fontSize:14 }}
              onClick={save}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                  <span className="btn-spinner" /> Registering Student…
                </span>
              ) : 'Register Student'}
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}
