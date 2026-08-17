import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AmsHeader, PageHeader, BottomNav, Toast, Page } from '../components/Shared';

// ===== TEACHER DASHBOARD =====
export function TeacherDashboard() {
  const navigate = useNavigate();
  const { api, currentUser } = useApp();
  const [currentExam, setCurrentExam] = useState(null);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    const localDate = new Date().toLocaleDateString('en-CA');
    const localTime = new Date().toTimeString().slice(0, 5);
    api(`/attendance/current-exam?date=${localDate}&time=${localTime}`).then(d => setCurrentExam(d.currentExam)).catch(() => {});
  }, [api]);

  return (
    <Page>
      <Toast />
      <AmsHeader title="Teacher Panel" subtitle="Mark attendance for your assigned classroom." />
      <div className="page-content">
        <div style={{ background:'#e0f5ff', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
          {currentUser?.schoolName && (
            <div style={{ fontSize:11, fontWeight:700, color:'#0891b2', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>
              🏫 {currentUser.schoolName}
            </div>
          )}
          <div style={{ fontWeight:700, fontSize:13, color:'#0891b2' }}>👩‍🏫 {currentUser?.name}</div>
          <div style={{ fontSize:11, color:'var(--gray-600)', marginTop:2 }}>
            ID: {currentUser?.uniqueId}
            {currentUser?.assignedClassroom && ` · Room: ${currentUser.assignedClassroom}`}
          </div>
        </div>

        {currentExam ? (
          <div style={{ background:'#dcfce7', border:'2px solid #16a34a', borderRadius:12, padding:'12px 16px', marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#166534', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Active Exam Right Now</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#14532d', marginTop:2 }}>{currentExam.subject}</div>
            <div style={{ fontSize:11, color:'#166534', marginTop:2 }}>{currentExam.date} · {currentExam.time} · {currentExam.class}</div>
          </div>
        ) : (
          <div style={{ background:'#fef3c7', border:'2px solid #d97706', borderRadius:12, padding:'12px 16px', marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:12, color:'#92400e', fontWeight:700 }}>⚠️ No active exam right now</div>
          </div>
        )}

        <div className="wide-grid">
          <div onClick={()=>navigate('/teacher/mark-attendance')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>📝</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Mark Attendance</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>Scan admit card & record copy number</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
          <div onClick={()=>navigate('/teacher/report')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>📊</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Class Attendance Sheet</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>View and export attendance report</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
          <div onClick={()=>navigate('/teacher/absent')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>❌</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Absent Report</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>List of absent students</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
          <div onClick={()=>navigate('/teacher/duty-slip')} style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:26 }}>📋</div>
            <div><div style={{ fontWeight:700, fontSize:13 }}>Duty Slip</div><div style={{ fontSize:11, color:'var(--gray-500)' }}>Print your exam duty assignment</div></div>
            <div style={{ marginLeft:'auto', color:'var(--gray-300)', fontSize:18 }}>›</div>
          </div>
        </div>
      </div>
    </Page>
  );
}

// ===== MARK ATTENDANCE — 2-step QR scan =====
// Step 1: Scan Admit Card QR → verify student + teacher assignment
// Step 2: Scan Answer Sheet QR → record as copy number (no match check)
// Step 3: Confirm → attendance marked Present + copy number saved

const STEPS = { IDLE:'IDLE', SCAN_ADMIT:'SCAN_ADMIT', SCAN_ANSWER:'SCAN_ANSWER', PREVIEW:'PREVIEW', SUCCESS:'SUCCESS', ERROR:'ERROR' };

export function MarkAttendance() {
  const { api, showToast } = useApp();
  const [step, setStep] = useState(STEPS.IDLE);
  const [activeExam, setActiveExam] = useState(null);
  const [assignedExams, setAssignedExams] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualAdmit, setManualAdmit] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const loadCurrentExam = useCallback(() => {
    const localDate = new Date().toLocaleDateString('en-CA');
    const localTime = new Date().toTimeString().slice(0, 5);
    api(`/attendance/current-exam?date=${localDate}&time=${localTime}`).then(d => {
      const duties = d.assignedExams || [];
      setAssignedExams(duties);
      if (d.currentExam) {
        setActiveExam(d.currentExam);
      } else {
        setActiveExam(null);
      }
    }).catch(() => {});
  }, [api]);

  useEffect(() => {
    loadCurrentExam();
  }, [loadCurrentExam]);

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    setScanning(false);
  };

  const startCamera = async (target) => {
    if (!activeExam) { showToast('Please select an active assigned exam first', 'error'); return; }
    setScanTarget(target);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      if (!window.jsQR) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopCamera();
          if (target === 'admit') handleVerifyAdmit(code.data);
          else handleVerifyAnswer(code.data);
        }
      }, 300);
    } catch (e) { showToast('Camera error: ' + e.message, 'error'); setScanning(false); }
  };

  const handleVerifyAdmit = async (qr) => {
    if (!activeExam) { showToast('No active exam selected', 'error'); return; }
    const cleanQr = typeof qr === 'string' ? qr.trim() : qr;
    setLoading(true); setStep(STEPS.SCAN_ADMIT);
    try {
      const res = await api('/attendance/verify-admit-qr', {
        method: 'POST',
        body: JSON.stringify({ qrAdmitScanned: cleanQr, examId: activeExam.exam_id })
      });
      if (res.valid) {
        setStudentInfo(res.studentInfo);
        setStep(STEPS.SCAN_ANSWER);
        showToast('✅ Student verified! Now scan Answer Sheet QR', 'success');
      } else {
        setErrMsg(res.message);
        setStep(STEPS.ERROR);
      }
    } catch (e) { setErrMsg(e.message); setStep(STEPS.ERROR); }
    setLoading(false);
  };

  const handleVerifyAnswer = async (qr) => {
    if (!studentInfo) return;
    const cleanQr = typeof qr === 'string' ? qr.trim() : qr;
    if (!cleanQr) {
      showToast('Please enter or scan an answer sheet copy number', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/attendance/verify-answer-qr', {
        method: 'POST',
        body: JSON.stringify({
          qrAnswerScanned: cleanQr,
          admitCardId: studentInfo.admitCardId,
          studentIdRef: studentInfo.studentIdRef,
          examIdRef: studentInfo.examIdRef,
        })
      });
      if (res.valid) {
        setErrMsg('');
        setPreview(res.preview);
        setStep(STEPS.PREVIEW);
      } else {
        setErrMsg(res.message);
        showToast(res.message, 'error');
      }
    } catch (e) {
      setErrMsg(e.message);
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  const confirmMark = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      await api('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          studentIdRef: preview.studentIdRef,
          examIdRef: preview.examIdRef,
          admitCardId: preview.admitCardId,
          classroom: preview.classroom,
          qrAdmitScanned: preview.qrAdmitScanned,
          qrAnswerScanned: preview.qrAnswerScanned,
          answerSheetNumber: preview.answerSheetNumber,
        })
      });
      setStep(STEPS.SUCCESS);
      showToast('✅ Attendance Marked!', 'success');
    } catch (e) {
      setErrMsg(e.message); setStep(STEPS.ERROR);
    }
    setLoading(false);
  };

  const reset = () => {
    stopCamera();
    setStep(STEPS.IDLE);
    setStudentInfo(null);
    setPreview(null);
    setErrMsg('');
    setManualAdmit('');
    setManualAnswer('');
  };

  // Camera UI (shown when scanning)
  const CameraView = ({ onClose }) => (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#fff', fontWeight:700, fontSize:13, marginBottom:12 }}>
        {scanTarget === 'admit' ? '📋 Scan ADMIT CARD QR' : '📄 Scan ANSWER SHEET QR'}
      </div>
      <div style={{ position:'relative', width:'min(320px,90vw)', height:'min(320px,90vw)', borderRadius:16, overflow:'hidden', border:'3px solid #4ade80' }}>
        <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted />
        <canvas ref={canvasRef} style={{ display:'none' }} />
        {/* Corner markers */}
        {['tl','tr','bl','br'].map(c => (
          <div key={c} style={{ position:'absolute', width:24, height:24, border:'3px solid #4ade80',
            top: c.startsWith('t') ? 8 : 'auto', bottom: c.startsWith('b') ? 8 : 'auto',
            left: c.endsWith('l') ? 8 : 'auto', right: c.endsWith('r') ? 8 : 'auto',
            borderBottom: c.startsWith('t') ? 'none':'', borderTop: c.startsWith('b') ? 'none':'',
            borderRight: c.endsWith('l') ? 'none':'', borderLeft: c.endsWith('r') ? 'none':'',
          }} />
        ))}
      </div>
      <div style={{ color:'rgba(255,255,255,.7)', fontSize:11, marginTop:12, textAlign:'center' }}>
        Point camera at QR code
      </div>
      <div style={{ marginTop:16, display:'flex', gap:10 }}>
        <button onClick={() => { stopCamera(); onClose(); }}
          style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff', borderRadius:10, padding:'10px 22px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── IDLE & SCAN_ADMIT ──
  if (step === STEPS.IDLE || step === STEPS.SCAN_ADMIT) return (
    <Page>
      <Toast />
      <PageHeader title="Mark Attendance" icon="📲" backPath="/teacher" />
      <div className="page-content" style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Exam selector if assigned exams exist */}
        {assignedExams.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--gray-200)' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-600)', display: 'block', marginBottom: 4 }}>
              📌 Assigned Exam Duties:
            </label>
            <select
              className="input-field"
              value={activeExam?.exam_id || ''}
              onChange={e => {
                const found = assignedExams.find(ex => String(ex.exam_id) === e.target.value);
                setActiveExam(found || null);
              }}
            >
              <option value="">-- {activeExam ? 'Switch Exam' : 'Select an Assigned Exam'} --</option>
              {assignedExams.map(ex => (
                <option key={ex.exam_id} value={ex.exam_id}>
                  {ex.subject} — {ex.class} ({ex.date} {ex.time || ''}) · Room {ex.classroom}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active exam banner */}
        {activeExam ? (() => {
          const localDate = new Date().toLocaleDateString('en-CA');
          const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
          let isOngoing = false;
          let isPast = false;

          if (activeExam.exam_status === 'Locked') {
            return (
              <div style={{ background:'#fef2f2', border:'2px solid #ef4444', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#991b1b', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>🔒 Exam Locked</div>
                <div style={{ fontSize:17, fontWeight:800, color:'#7f1d1d', marginTop:2 }}>{activeExam.subject} — {activeExam.class}</div>
                <div style={{ fontSize:12, color:'#991b1b', marginTop:4, fontWeight:600 }}>
                  📅 {activeExam.date} {activeExam.time ? `· ⏰ ${activeExam.time}` : ''} · 🏫 Room: {activeExam.classroom}
                </div>
                <div style={{ fontSize:11, color:'#b91c1c', marginTop:2 }}>Attendance marking is locked by the Board Admin.</div>
              </div>
            );
          }

          if (activeExam.date < localDate) {
            isPast = true;
          } else if (activeExam.date > localDate) {
            isPast = false;
          } else {
            if (!activeExam.time) {
              isOngoing = true;
            } else {
              const [h, m] = activeExam.time.split(':').map(Number);
              const start = h * 60 + m;
              const end = start + (Number(activeExam.duration) || 180);
              if (nowMins > end + 30) isPast = true;
              else if (nowMins >= start - 30) isOngoing = true;
            }
          }

          if (isOngoing) {
            return (
              <div style={{ background:'#dcfce7', border:'2px solid #16a34a', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#166534', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Active Exam Duty Right Now</div>
                <div style={{ fontSize:17, fontWeight:800, color:'#14532d', marginTop:2 }}>{activeExam.subject} — {activeExam.class}</div>
                <div style={{ fontSize:12, color:'#166534', marginTop:4, fontWeight:600 }}>
                  📅 {activeExam.date} {activeExam.time ? `· ⏰ ${activeExam.time}` : ''} · 🏫 Room: {activeExam.classroom}
                </div>
                {activeExam.center_name && (
                  <div style={{ fontSize:11, color:'#15803d', marginTop:2 }}>📍 Center: {activeExam.center_name}</div>
                )}
              </div>
            );
          } else if (isPast) {
            return (
              <div style={{ background:'#fef2f2', border:'2px solid #ef4444', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#991b1b', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Exam Date/Time Ended</div>
                <div style={{ fontSize:17, fontWeight:800, color:'#7f1d1d', marginTop:2 }}>{activeExam.subject} — {activeExam.class}</div>
                <div style={{ fontSize:12, color:'#991b1b', marginTop:4, fontWeight:600 }}>
                  📅 {activeExam.date} {activeExam.time ? `· ⏰ ${activeExam.time}` : ''} · 🏫 Room: {activeExam.classroom}
                </div>
                <div style={{ fontSize:11, color:'#b91c1c', marginTop:2 }}>⚠️ This exam's date/time has passed.</div>
              </div>
            );
          } else {
            return (
              <div style={{ background:'#eff6ff', border:'2px solid #3b82f6', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#1e40af', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Upcoming Scheduled Exam</div>
                <div style={{ fontSize:17, fontWeight:800, color:'#1e3a8a', marginTop:2 }}>{activeExam.subject} — {activeExam.class}</div>
                <div style={{ fontSize:12, color:'#1e40af', marginTop:4, fontWeight:600 }}>
                  📅 {activeExam.date} {activeExam.time ? `· ⏰ ${activeExam.time}` : ''} · 🏫 Room: {activeExam.classroom}
                </div>
                <div style={{ fontSize:11, color:'#2563eb', marginTop:2 }}>⏳ Exam is scheduled for a future time.</div>
              </div>
            );
          }
        })() : (
          <div style={{ background:'#fef3c7', border:'2px solid #d97706', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:13, color:'#92400e', fontWeight:800 }}>⚠️ No Active Exam Right Now</div>
            <div style={{ fontSize:11, color:'#92400e', marginTop:4 }}>
              {assignedExams.length > 0
                ? 'You have assigned exam duties, but none are active at this current date & time.'
                : 'No exam duties have been assigned to your account.'}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{ background:'#f0f4ff', borderRadius:12, padding:16 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0a1f6b', marginBottom:10 }}>2-Step Process</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { num:'1', color:'#0a1f6b', text:'Scan Admit Card QR', sub:'Student identity verification' },
              { num:'2', color:'#16a34a', text:'Scan Answer Sheet QR', sub:'Copy number recorded (any QR)' },
            ].map(s => (
              <div key={s.num} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:s.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>{s.num}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-800)' }}>{s.text}</div>
                  <div style={{ fontSize:10, color:'var(--gray-500)' }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Scan */}
        <button className="btn btn-primary" style={{ padding:16, fontSize:15 }}
          onClick={() => { setStep(STEPS.SCAN_ADMIT); startCamera('admit'); }}
          disabled={!activeExam || loading}>
          {loading && step === STEPS.SCAN_ADMIT ? 'Verifying...' : '📷 Start Scanning'}
        </button>

        {/* Manual entry fallback */}
        <details style={{ background:'var(--gray-50)', borderRadius:10, padding:'10px 14px' }}>
          <summary style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', cursor:'pointer' }}>⌨️ Manual QR Entry (camera unavailable)</summary>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
            <input className="input-field" placeholder="Admit Card QR value" value={manualAdmit} onChange={e=>setManualAdmit(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={()=>{ if(manualAdmit.trim()) handleVerifyAdmit(manualAdmit.trim()); }} disabled={!manualAdmit.trim()||loading}>
              Verify Admit Card
            </button>
          </div>
        </details>
      </div>
      {scanning && <CameraView onClose={()=>setStep(STEPS.IDLE)} />}
    </Page>
  );

  // ── SCAN ANSWER (after admit verified) ──
  if (step === STEPS.SCAN_ANSWER) return (
    <Page>
      <Toast />
      <PageHeader title="Scan Answer Sheet" icon="📄" onBack={reset} />
      <div className="page-content" style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Student confirmed */}
        <div style={{ background:'#dcfce7', borderRadius:12, padding:'12px 16px', border:'2px solid #16a34a' }}>
          <div style={{ fontSize:10, color:'#166534', fontWeight:700, textTransform:'uppercase' }}>✅ Student Verified</div>
          <div style={{ fontSize:16, fontWeight:800, color:'#14532d', marginTop:4 }}>{studentInfo?.studentName}</div>
          <div style={{ fontSize:11, color:'#166534' }}>ID: {studentInfo?.studentId} · Roll: {studentInfo?.rollNo}</div>
          <div style={{ fontSize:11, color:'#166534' }}>{studentInfo?.subject} · {studentInfo?.classroom}</div>
        </div>

        {errMsg && (
          <div style={{ background:'#fef2f2', border:'2px solid #dc2626', borderRadius:12, padding:'12px 16px', color:'#b91c1c' }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>⚠️ Copy Number Error</div>
            <div style={{ fontSize:12, lineHeight:1.4 }}>{errMsg}</div>
          </div>
        )}

        <div style={{ background:'#e0e8ff', borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0a1f6b' }}>Now scan the Answer Sheet QR</div>
          <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:4 }}>Any QR code on the answer sheet — it will be recorded as the copy number</div>
        </div>

        <button className="btn btn-primary" style={{ padding:16 }} onClick={() => { setErrMsg(''); startCamera('answer'); }} disabled={loading}>
          📷 Scan Answer Sheet QR
        </button>

        <details open={!!errMsg} style={{ background:'var(--gray-50)', borderRadius:10, padding:'10px 14px' }}>
          <summary style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', cursor:'pointer' }}>⌨️ Manual Entry</summary>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
            <input
              className="input-field"
              placeholder="Answer Sheet QR / Copy Number"
              value={manualAnswer}
              onChange={e => { setErrMsg(''); setManualAnswer(e.target.value); }}
              autoFocus={!!errMsg}
            />
            <button className="btn btn-primary btn-sm" onClick={() => { if(manualAnswer.trim()) handleVerifyAnswer(manualAnswer.trim()); }} disabled={!manualAnswer.trim()||loading}>
              Confirm Answer Sheet
            </button>
          </div>
        </details>

        <button className="btn btn-ghost" onClick={reset}>← Start Over</button>
      </div>
      {scanning && <CameraView onClose={()=>setScanning(false)} />}
    </Page>
  );

  // ── PREVIEW (confirm before marking) ──
  if (step === STEPS.PREVIEW) return (
    <Page>
      <Toast />
      <PageHeader title="Confirm Attendance" icon="✅" onBack={reset} />
      <div className="page-content" style={{ display:'flex', flexDirection:'column', gap:14 }}>

        <div style={{ background:'#fff', borderRadius:14, border:'2px solid #0a1f6b', padding:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', marginBottom:12 }}>Confirm & Mark Present</div>
          {[
            { label:'Student', value: preview?.studentName },
            { label:'ID', value: preview?.studentId },
            { label:'Roll No', value: preview?.rollNo },
            { label:'Subject', value: preview?.subject },
            { label:'Classroom', value: preview?.classroom },
            { label:'Answer Sheet No.', value: preview?.answerSheetNumber, highlight: true },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <span style={{ fontSize:12, color:'var(--gray-500)', fontWeight:600 }}>{r.label}</span>
              <span style={{ fontSize:12, fontWeight:700, color: r.highlight ? '#16a34a' : 'var(--gray-900)' }}>{r.value}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ padding:16, background:'#16a34a' }} onClick={confirmMark} disabled={loading}>
          {loading ? 'Marking…' : '✅ Confirm — Mark Present'}
        </button>
        <button className="btn btn-ghost" onClick={reset}>Cancel</button>
      </div>
    </Page>
  );

  // ── SUCCESS ──
  if (step === STEPS.SUCCESS) return (
    <Page>
      <PageHeader title="Success!" icon="✅" onBack={reset} />
      <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:16, textAlign:'center' }}>
        <div style={{ fontSize:72 }}>✅</div>
        <div style={{ fontWeight:800, fontSize:20, color:'#16a34a' }}>Attendance Marked!</div>
        <div style={{ background:'#dcfce7', borderRadius:12, padding:'12px 20px', width:'100%' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'#14532d' }}>{preview?.studentName}</div>
          <div style={{ fontSize:12, color:'#166534', marginTop:4 }}>Copy No: <strong>{preview?.answerSheetNumber}</strong></div>
        </div>
        <button className="btn btn-primary" style={{ width:'100%', padding:14 }} onClick={reset}>
          📷 Next Student
        </button>
      </div>
    </Page>
  );

  // ── ERROR ──
  if (step === STEPS.ERROR) return (
    <Page>
      <PageHeader title="Error" icon="❌" onBack={reset} />
      <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:16, textAlign:'center' }}>
        <div style={{ fontSize:60 }}>❌</div>
        <div style={{ background:'#fef2f2', border:'2px solid #dc2626', borderRadius:12, padding:'16px 20px', width:'100%' }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#dc2626', marginBottom:6 }}>Attendance Marking Failed</div>
          <div style={{ fontSize:12, color:'#dc2626' }}>{errMsg}</div>
        </div>
        {studentInfo ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%' }}>
            <button className="btn btn-primary" style={{ width:'100%', padding:14 }} onClick={() => { setErrMsg(''); setStep(STEPS.SCAN_ANSWER); }}>
              📄 Enter / Scan Copy Number Again
            </button>
            <button className="btn btn-ghost" style={{ width:'100%' }} onClick={reset}>
              ← Start Over
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ width:'100%', padding:14 }} onClick={reset}>Try Again</button>
        )}
      </div>
    </Page>
  );

  return null;
}

// ===== ATTENDANCE REPORT (class sheet) =====
export function AttendanceReport() {
  const { api } = useApp();
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    api('/exams').then(res => {
      setExams(res);
      const localDate = new Date().toLocaleDateString('en-CA');
      const localTime = new Date().toTimeString().slice(0, 5);
      api(`/attendance/current-exam?date=${localDate}&time=${localTime}`).then(d => {
        if (d.currentExam) {
          setSelectedExamId(d.currentExam.exam_id);
        } else if (res.length > 0) {
          setSelectedExamId(res[0].id);
        }
      }).catch(() => {
        if (res.length > 0) setSelectedExamId(res[0].id);
      });
    }).catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!selectedExamId) {
      setRoster([]);
      setSelectedExam(null);
      return;
    }
    const found = exams.find(e => String(e.id) === String(selectedExamId));
    setSelectedExam(found);

    api(`/attendance/roster?examId=${selectedExamId}`)
      .then(setRoster)
      .catch(() => setRoster([]));
  }, [api, selectedExamId, exams]);

  const printSheet = () => window.print();
  const presentCount = roster.filter(s => s.status === 'Present').length;

  const downloadCSV = () => {
    if (roster.length === 0) return;
    const headers = ['Sr', 'Roll No', 'Status', 'Copy No.', 'Time'];
    const csvRows = [
      headers.join(','),
      ...roster.map(s => {
        const markedTime = s.markedAt 
          ? new Date(s.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/,/g, '') 
          : '—';
        return [
          s.srNo,
          `"${s.rollNo}"`,
          `"${s.status}"`,
          `"${s.answerSheetNumber || '—'}"`,
          `"${markedTime}"`
        ].join(',');
      })
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `${selectedExam?.subject || 'Exam'}_${selectedExam?.class || ''}_Attendance_Sheet.csv`.replace(/\s+/g, '_');
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Page>
      <Toast />
      <PageHeader title="Attendance Sheet" icon="📊" backPath="/teacher" />
      <div className="page-content">
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:14 }}>
          <div className="input-group" style={{ margin:0 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--gray-600)' }}>Select Exam</label>
            <select className="input-field" style={{ marginTop:4 }} value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
              <option value="">-- Select Exam --</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.subject} — {e.class} ({e.date})</option>)}
            </select>
          </div>
        </div>

        {!selectedExam ? (
          <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>Please select an exam to view sheet.</div>
        ) : (
          <>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{selectedExam.subject} — {selectedExam.class}</div>
            <div style={{ fontSize:11, color:'#166534', marginBottom:4 }}>{selectedExam.date} · Room: {selectedExam.classroom || '—'}</div>
            <div style={{ fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:14 }}>
              Present: {presentCount} / {roster.length}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button className="btn btn-primary btn-sm" onClick={printSheet}>🖨 Print Sheet</button>
              <button className="btn btn-ghost btn-sm" onClick={downloadCSV} style={{ border: '1px solid var(--gray-300)' }}>📥 Download CSV</button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#0a1f6b', color:'#fff' }}>
                    <th style={{ padding:'8px 10px', textAlign:'left' }}>Sr</th>
                    <th style={{ padding:'8px 10px', textAlign:'left' }}>Roll No</th>
                    <th style={{ padding:'8px 10px', textAlign:'left' }}>Status</th>
                    <th style={{ padding:'8px 10px', textAlign:'left' }}>Copy No.</th>
                    <th style={{ padding:'8px 10px', textAlign:'left' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s, i) => (
                    <tr key={s.studentId} style={{ borderBottom:'1px solid var(--gray-100)', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding:'7px 10px' }}>{s.srNo}</td>
                      <td style={{ padding:'7px 10px' }}>{s.rollNo}</td>
                      <td style={{ padding:'7px 10px', fontWeight:700, color: s.status==='Present' ? '#16a34a' : s.status==='Absent' ? '#dc2626' : '#9ca3af' }}>
                        {s.status}
                      </td>
                      <td style={{ padding:'7px 10px', color:'#0a1f6b', fontWeight:600 }}>
                        {s.answerSheetNumber || '—'}
                      </td>
                      <td style={{ padding:'7px 10px', color:'var(--gray-600)', fontWeight:500 }}>
                        {s.markedAt ? new Date(s.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                      </td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr><td colSpan={5} style={{ padding:30, textAlign:'center', color:'var(--gray-400)' }}>No attendance records yet</td></tr>
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

// ===== ABSENT REPORT =====
export function AbsentReport() {
  const { api } = useApp();
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [absentList, setAbsentList] = useState([]);

  useEffect(() => {
    api('/exams').then(res => {
      setExams(res);
      const localDate = new Date().toLocaleDateString('en-CA');
      const localTime = new Date().toTimeString().slice(0, 5);
      api(`/attendance/current-exam?date=${localDate}&time=${localTime}`).then(d => {
        if (d.currentExam) {
          setSelectedExamId(d.currentExam.exam_id);
        } else if (res.length > 0) {
          setSelectedExamId(res[0].id);
        }
      }).catch(() => {
        if (res.length > 0) setSelectedExamId(res[0].id);
      });
    }).catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!selectedExamId) {
      setAbsentList([]);
      setSelectedExam(null);
      return;
    }
    const found = exams.find(e => String(e.id) === String(selectedExamId));
    setSelectedExam(found);

    api(`/attendance/absent-list?examId=${selectedExamId}`)
      .then(setAbsentList)
      .catch(() => setAbsentList([]));
  }, [api, selectedExamId, exams]);

  return (
    <Page>
      <Toast />
      <PageHeader title="Absent Report" icon="❌" backPath="/teacher" />
      <div className="page-content">
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid var(--gray-100)', marginBottom:14 }}>
          <div className="input-group" style={{ margin:0 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--gray-600)' }}>Select Exam</label>
            <select className="input-field" style={{ marginTop:4 }} value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
              <option value="">-- Select Exam --</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.subject} — {e.class} ({e.date})</option>)}
            </select>
          </div>
        </div>

        {!selectedExam ? (
          <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>Please select an exam to view absent report.</div>
        ) : (
          <>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{selectedExam.subject} — {selectedExam.class}</div>
            <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:14 }}>{absentList.length} students absent</div>
            <div className="wide-grid">
              {absentList.map(s=>(
                <div key={s.uniqueId} style={{ background:'#fff', borderRadius:12, padding:'10px 14px', border:'1px solid var(--gray-100)' }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{s.name}</div>
                  <div style={{ fontSize:10, color:'var(--gray-500)' }}>Roll: {s.rollNo} · {s.uniqueId}</div>
                </div>
              ))}
              {absentList.length===0 && <div style={{ textAlign:'center', color:'var(--gray-400)', padding:30 }}>No absentees recorded yet.</div>}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

// ===== DUTY SLIP =====
export function DutySlip() {
  const { api, currentUser } = useApp();
  const [exams, setExams] = useState([]);

  useEffect(() => { api('/exams').then(setExams).catch(()=>{}); }, [api]);

  return (
    <Page>
      <Toast />
      <PageHeader title="Duty Slip" icon="📋" backPath="/teacher" />
      <div className="page-content">
        <div style={{ background:'#fff', border:'2px solid #0a1f6b', borderRadius:14, padding:18, marginBottom:14 }}>
          <div style={{ textAlign:'center', fontWeight:800, fontSize:15, color:'#0a1f6b', marginBottom:4 }}>EXAMINATION DUTY SLIP</div>
          <div style={{ textAlign:'center', fontSize:11, color:'var(--gray-500)', marginBottom:14 }}>{currentUser?.schoolName}</div>
          <div style={{ fontSize:12, marginBottom:6 }}><strong>Teacher:</strong> {currentUser?.name}</div>
          <div style={{ fontSize:12, marginBottom:14 }}><strong>ID:</strong> {currentUser?.uniqueId}</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead><tr style={{ background:'#0a1f6b', color:'#fff' }}>
              <th style={{ padding:6, textAlign:'left' }}>Subject</th><th style={{ padding:6 }}>Class</th><th style={{ padding:6 }}>Date</th><th style={{ padding:6 }}>Time</th><th style={{ padding:6 }}>Room</th>
            </tr></thead>
            <tbody>
              {exams.map(e=>(
                <tr key={e._id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                  <td style={{ padding:6 }}>{e.subject}</td><td style={{ padding:6 }}>{e.class}</td><td style={{ padding:6 }}>{e.date}</td><td style={{ padding:6 }}>{e.time||'—'}</td><td style={{ padding:6 }}>{e.classroom||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary" onClick={()=>window.print()}>🖨 Print Duty Slip</button>
      </div>
    </Page>
  );
}
