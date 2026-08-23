import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AmsHeader, PageHeader, BottomNav, Toast, Page } from '../components/Shared';
import { formatClassLabel } from './SchoolPages';
import {
  cacheAssignedExams,
  getCachedAssignedExams,
  cacheExamRoster,
  getCachedExamRoster,
  saveOfflineAttendance,
  getOfflineQueue
} from '../utils/offlineStorage';

// ===== NETWORK & SYNC STATUS BADGE COMPONENT =====
function NetworkSyncBadge() {
  const { isOnline, offlineCount, isSyncing, syncOfflineNow } = useApp();

  return (
    <div style={{
      background: isOnline ? (offlineCount > 0 ? '#fffbeb' : '#f0fdf4') : '#fef2f2',
      border: `1px solid ${isOnline ? (offlineCount > 0 ? '#fde68a' : '#bbf7d0') : '#fecaca'}`,
      borderRadius: 12,
      padding: '8px 12px',
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      fontSize: 11
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13 }}>{isOnline ? (offlineCount > 0 ? '🟡' : '🟢') : '📶'}</span>
        <div>
          <span style={{ fontWeight: 800, color: isOnline ? (offlineCount > 0 ? '#92400e' : '#166534') : '#991b1b' }}>
            {isOnline ? 'Online' : 'Offline Mode (Remote Area)'}
          </span>
          {offlineCount > 0 && (
            <span style={{ color: 'var(--gray-600)', marginLeft: 6 }}>
              · <strong>{offlineCount}</strong> record(s) queued locally
            </span>
          )}
        </div>
      </div>

      {offlineCount > 0 && isOnline && (
        <button
          className="btn btn-primary btn-sm"
          style={{ padding: '4px 10px', fontSize: 11, background: '#0a1f6b', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={syncOfflineNow}
          disabled={isSyncing}
        >
          {isSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
        </button>
      )}
    </div>
  );
}

// ===== LIVE EXAM TIMER COMPONENT =====
export function LiveExamTimer({ currentExam, compact = false }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format digital clock time (HH:MM:SS AM/PM)
  const currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const currentDateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (!currentExam) {
    return (
      <div style={{
        background: '#f8fafc',
        border: '1px solid var(--gray-200)',
        borderRadius: 14,
        padding: compact ? '8px 12px' : '12px 16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🕒</span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>Current System Time ({currentDateStr})</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', letterSpacing: 0.5 }}>
              {currentTimeStr}
            </div>
          </div>
        </div>
        <div style={{
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700
        }}>
          No Active Exam Right Now
        </div>
      </div>
    );
  }

  // Parse exam date and time
  const examDateStr = currentExam.date || new Date().toLocaleDateString('en-CA');
  const examTimeStr = currentExam.time || '09:00';
  const durationMins = Number(currentExam.duration) || 180;

  // Compute start and end timestamps in local timezone
  const [startH, startM] = examTimeStr.split(':').map(Number);
  const [year, month, day] = examDateStr.split('-').map(Number);
  const examStart = new Date(year, month - 1, day, startH || 0, startM || 0, 0, 0);

  const examEnd = new Date(examStart.getTime() + durationMins * 60 * 1000);

  const nowMs = now.getTime();
  const startMs = examStart.getTime();
  const endMs = examEnd.getTime();

  const totalDurationMs = durationMins * 60 * 1000;
  const isUpcoming = nowMs < startMs;
  const isOngoing = nowMs >= startMs && nowMs <= endMs;
  const isEnded = nowMs > endMs;

  // Remaining / Elapsed Calculations
  let remainingMs = 0;
  let elapsedMs = 0;
  let percentProgress = 0;

  if (isUpcoming) {
    remainingMs = Math.max(0, startMs - nowMs);
  } else if (isOngoing) {
    remainingMs = Math.max(0, endMs - nowMs);
    elapsedMs = Math.max(0, nowMs - startMs);
    percentProgress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));
  } else {
    percentProgress = 100;
    elapsedMs = totalDurationMs;
  }

  const formatHMS = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
  };

  const isWarningTime = isOngoing && remainingMs <= 15 * 60 * 1000;
  const isCriticalTime = isOngoing && remainingMs <= 5 * 60 * 1000;

  const bgGradient = isCriticalTime
    ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
    : isWarningTime
    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
    : isOngoing
    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
    : isUpcoming
    ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
    : '#f8fafc';

  const borderColor = isCriticalTime
    ? '#ef4444'
    : isWarningTime
    ? '#f59e0b'
    : isOngoing
    ? '#22c55e'
    : isUpcoming
    ? '#3b82f6'
    : '#cbd5e1';

  return (
    <div style={{
      background: bgGradient,
      border: `2px solid ${borderColor}`,
      borderRadius: 14,
      padding: compact ? '10px 14px' : '14px 18px',
      marginBottom: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header bar of the timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOngoing && (
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isCriticalTime ? '#ef4444' : isWarningTime ? '#f59e0b' : '#22c55e',
              boxShadow: `0 0 0 3px ${isCriticalTime ? 'rgba(239,68,68,0.3)' : isWarningTime ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
            }} />
          )}
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: isCriticalTime ? '#b91c1c' : isWarningTime ? '#b45309' : isOngoing ? '#15803d' : isUpcoming ? '#1d4ed8' : '#475569'
          }}>
            {isCriticalTime ? '🚨 FINAL 5 MINS ALERT' : isWarningTime ? '⚠️ 15 MINS WARNING' : isOngoing ? '🟢 LIVE EXAM IN PROGRESS' : isUpcoming ? '🕒 EXAM STARTING SOON' : '🏁 EXAM CONCLUDED'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>
            · Room: <strong>{currentExam.classroom || 'Main Hall'}</strong>
          </span>
        </div>

        {/* Live Clock */}
        <div style={{ fontSize: 11, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Clock:</span>
          <strong style={{ fontFamily: 'monospace', fontSize: 12, color: '#0f172a' }}>{currentTimeStr}</strong>
        </div>
      </div>

      {/* Main Subject & Timer Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
            {currentExam.subject}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span>Class: <strong>{formatClassLabel(currentExam.class)}</strong></span>
            <span>· Scheduled: <strong>{examTimeStr}</strong> ({durationMins} mins)</span>
          </div>
        </div>

        {/* Countdown Pill Display */}
        <div style={{
          background: '#fff',
          border: `1.5px solid ${borderColor}`,
          borderRadius: 12,
          padding: '8px 16px',
          textAlign: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', letterSpacing: 0.5 }}>
            {isUpcoming ? 'Starts In' : isOngoing ? 'Time Remaining' : 'Status'}
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 900,
            fontFamily: 'monospace',
            letterSpacing: 1,
            color: isCriticalTime ? '#dc2626' : isWarningTime ? '#d97706' : isOngoing ? '#16a34a' : isUpcoming ? '#2563eb' : '#64748b'
          }}>
            {isOngoing || isUpcoming ? formatHMS(remainingMs) : 'Completed'}
          </div>
        </div>
      </div>

      {/* Progress Bar for Ongoing Exam */}
      {isOngoing && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 4 }}>
            <span>Elapsed: {formatHMS(elapsedMs)}</span>
            <span>{percentProgress}% Completed</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${percentProgress}%`,
              height: '100%',
              background: isCriticalTime ? '#ef4444' : isWarningTime ? '#f59e0b' : '#22c55e',
              transition: 'width 1s ease'
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== TEACHER DASHBOARD =====
export function TeacherDashboard() {
  const navigate = useNavigate();
  const { api, currentUser } = useApp();
  const [currentExam, setCurrentExam] = useState(null);

  useEffect(() => {
    const localDate = new Date().toLocaleDateString('en-CA');
    const localTime = new Date().toTimeString().slice(0, 5);
    api(`/attendance/current-exam?date=${localDate}&time=${localTime}`)
      .then(d => {
        setCurrentExam(d.currentExam);
        cacheAssignedExams(d);
      })
      .catch(() => {
        // Fallback to cache when offline
        const cached = getCachedAssignedExams();
        if (cached?.data) {
          setCurrentExam(cached.data.currentExam);
        }
      });
  }, [api]);

  return (
    <Page>
      <Toast />
      <AmsHeader title="Teacher Panel" subtitle="Mark attendance for your assigned exam block." />
      <div className="page-content">
        <NetworkSyncBadge />

        <div style={{ background:'#e0f5ff', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
          {currentUser?.schoolName && (
            <div style={{ fontSize:11, fontWeight:700, color:'#0891b2', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>
              🏫 {currentUser.schoolName}
            </div>
          )}
          <div style={{ fontWeight:700, fontSize:13, color:'#0891b2' }}>👩‍🏫 {currentUser?.name}</div>
          <div style={{ fontSize:11, color:'var(--gray-600)', marginTop:2 }}>
            ID: {currentUser?.uniqueId}
            {currentUser?.assignedClassroom && ` · 📍 Block: ${currentUser.assignedClassroom}`}
          </div>
        </div>

        {/* Live Exam Countdown Timer */}
        <LiveExamTimer currentExam={currentExam} />

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

function getDeviceInfo() {
  const ua = navigator.userAgent || '';
  const isMobile = /mobile|iphone|ipod|android.*mobile|windows.*phone/i.test(ua);
  const isTablet = /ipad|tablet|android(?!.*mobile)/i.test(ua);
  const deviceType = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return `${deviceType} • ${browser} on ${os}`;
}

export function MarkAttendance() {
  const { api, showToast, isOnline, offlineCount, isSyncing, syncOfflineNow, refreshOfflineCount } = useApp();
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
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  
  // Mandatory Location & Device Info State
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [deviceInfo] = useState(() => getDeviceInfo());

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
        const formattedCoord = `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;

        setLocation({
          latitude: lat,
          longitude: lng,
          accuracy,
          formattedCoord,
        });
        setLocationLoading(false);
        setLocationError(null);
      },
      (err) => {
        let msg = 'Please enable location permissions in your browser or device settings.';
        if (err.code === 1) msg = 'Location permission was denied. Location is mandatory to mark attendance.';
        else if (err.code === 2) msg = 'Location position unavailable. Please turn ON GPS / Location on your device.';
        else if (err.code === 3) msg = 'Location request timed out. Please retry.';
        setLocationError(msg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const loadCurrentExam = useCallback(() => {
    const localDate = new Date().toLocaleDateString('en-CA');
    const localTime = new Date().toTimeString().slice(0, 5);
    api(`/attendance/current-exam?date=${localDate}&time=${localTime}`)
      .then(d => {
        const duties = d.assignedExams || [];
        setAssignedExams(duties);
        if (d.currentExam) {
          setActiveExam(d.currentExam);
        } else {
          setActiveExam(null);
        }
        cacheAssignedExams(d);
      })
      .catch(() => {
        // Fallback to cached exams when offline
        const cached = getCachedAssignedExams();
        if (cached?.data) {
          const duties = cached.data.assignedExams || [];
          setAssignedExams(duties);
          if (cached.data.currentExam) setActiveExam(cached.data.currentExam);
          else if (duties.length > 0) setActiveExam(duties[0]);
        }
      });
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
    if (!location) {
      showToast('📍 Location is mandatory! Please grant location permissions before marking attendance.', 'error');
      requestLocation();
      return;
    }
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
    if (!location) {
      showToast('📍 Location is mandatory! Please grant location access.', 'error');
      requestLocation();
      return;
    }
    const cleanQr = typeof qr === 'string' ? qr.trim() : qr;
    setLoading(true); setStep(STEPS.SCAN_ADMIT);

    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
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
    } catch (e) {
      // Offline fallback: match with cached roster or create offline student reference
      const cachedRoster = getCachedExamRoster(activeExam.exam_id) || [];
      const match = cachedRoster.find(
        s => String(s.rollNo).trim().toLowerCase() === cleanQr.toLowerCase() ||
             String(s.uniqueId).trim().toLowerCase() === cleanQr.toLowerCase() ||
             String(s.studentId) === cleanQr
      );

      const resolvedStudent = {
        studentName: match?.name || `Student (${cleanQr})`,
        studentId: match?.uniqueId || cleanQr,
        studentIdRef: match?.studentId || cleanQr,
        class: match?.class || activeExam.class,
        rollNo: match?.rollNo || cleanQr,
        admitCardId: null,
        examIdRef: activeExam.exam_id,
        subject: activeExam.subject,
        classroom: activeExam.classroom,
        qrAdmitScanned: cleanQr,
      };

      setStudentInfo(resolvedStudent);
      setStep(STEPS.SCAN_ANSWER);
      showToast('📶 Student identified (Offline Mode)', 'info');
    }
    setLoading(false);
  };

  const handleVerifyAnswer = async (qr) => {
    if (!studentInfo) return;
    const cleanQr = typeof qr === 'string' ? qr.trim() : qr;
    if (!cleanQr) {
      showToast('Please enter or scan an answer sheet copy number', 'error');
      return;
    }

    // 1. Check duplicate in offline queue
    const queue = getOfflineQueue();
    const dupInQueue = queue.find(
      q => String(q.examIdRef) === String(studentInfo.examIdRef) &&
           String(q.answerSheetNumber).trim().toLowerCase() === cleanQr.toLowerCase() &&
           String(q.studentIdRef) !== String(studentInfo.studentIdRef)
    );
    if (dupInQueue) {
      const msg = `❌ Duplicate Copy Number! Copy "${cleanQr}" is already queued for Roll No: ${dupInQueue.rollNo || '—'}`;
      setErrMsg(msg);
      showToast(msg, 'error');
      return;
    }

    // 2. Check duplicate in local cached roster
    const cachedRoster = getCachedExamRoster(studentInfo.examIdRef) || [];
    const dupInRoster = cachedRoster.find(
      r => r.answerSheetNumber &&
           String(r.answerSheetNumber).trim().toLowerCase() === cleanQr.toLowerCase() &&
           String(r.studentId) !== String(studentInfo.studentIdRef)
    );
    if (dupInRoster) {
      const msg = `❌ Duplicate Copy Number! Copy No. "${cleanQr}" is already assigned to student (Roll No: ${dupInRoster.rollNo || '—'}).`;
      setErrMsg(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
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
        setErrMsg(res.message || 'Invalid copy number');
        showToast(res.message || 'Invalid copy number', 'error');
      }
    } catch (e) {
      const msg = e.message || 'Error verifying copy number';
      const isPureNetworkError = !navigator.onLine || msg === 'Offline' || msg === 'Failed to fetch' || msg.toLowerCase().includes('networkerror');

      if (!isPureNetworkError) {
        // Server returned a business/validation error (e.g. Duplicate Copy Number)
        setErrMsg(msg);
        showToast(msg, 'error');
      } else {
        // Legitimate offline fallback
        setErrMsg('');
        setPreview({
          studentName: studentInfo.studentName,
          studentId: studentInfo.studentId,
          studentIdRef: studentInfo.studentIdRef,
          rollNo: studentInfo.rollNo,
          subject: studentInfo.subject,
          classroom: studentInfo.classroom,
          admitCardId: null,
          examIdRef: studentInfo.examIdRef,
          qrAdmitScanned: studentInfo.qrAdmitScanned,
          qrAnswerScanned: cleanQr,
          answerSheetNumber: cleanQr,
        });
        setStep(STEPS.PREVIEW);
      }
    }
    setLoading(false);
  };

  const confirmMark = async () => {
    if (!preview) return;
    if (!location) {
      showToast('📍 Location is mandatory! Please turn on device location to complete marking attendance.', 'error');
      requestLocation();
      return;
    }
    setLoading(true);

    const payload = {
      studentIdRef: preview.studentIdRef,
      examIdRef: preview.examIdRef,
      admitCardId: preview.admitCardId,
      classroom: preview.classroom,
      qrAdmitScanned: preview.qrAdmitScanned,
      qrAnswerScanned: preview.qrAnswerScanned,
      answerSheetNumber: preview.answerSheetNumber,
      latitude: location.latitude,
      longitude: location.longitude,
      locationAddress: location.formattedCoord,
      deviceInfo: deviceInfo,
      studentName: preview.studentName,
      rollNo: preview.rollNo,
      markedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      // Direct offline save
      saveOfflineAttendance(payload);
      refreshOfflineCount();
      setIsOfflineSaved(true);
      setStep(STEPS.SUCCESS);
      showToast('💾 Saved locally! (Offline Mode - will auto-sync when online)', 'success');
      setLoading(false);
      return;
    }

    try {
      await api('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setIsOfflineSaved(false);
      setStep(STEPS.SUCCESS);
      showToast('✅ Attendance Marked & Synced!', 'success');
    } catch (e) {
      const msg = e.message || 'Attendance Marking Failed';
      const isPureNetworkError = !navigator.onLine || msg === 'Failed to fetch' || msg.toLowerCase().includes('networkerror');

      if (!isPureNetworkError) {
        // Business / Validation error from server (e.g. duplicate copy number)
        setErrMsg(msg);
        setStep(STEPS.FAIL);
        showToast(msg, 'error');
      } else {
        // Network drop or offline: save to offline queue as fallback
        saveOfflineAttendance(payload);
        refreshOfflineCount();
        setIsOfflineSaved(true);
        setStep(STEPS.SUCCESS);
        showToast('💾 Connection offline — saved to offline queue! Will auto-sync when online.', 'info');
      }
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
    setIsOfflineSaved(false);
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
        <NetworkSyncBadge />

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
                  {ex.subject} — {formatClassLabel(ex.class)} ({ex.date} {ex.time || ''}) · 📍 Block: {ex.classroom}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Exam Timer & Banner */}
        <LiveExamTimer currentExam={activeExam} />

        {/* Mandatory Location Status Banner */}
        {locationLoading ? (
          <div style={{ background: '#f8fafc', border: '1px dashed var(--gray-300)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>⏳</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)' }}>Acquiring Device Location (GPS)...</div>
              <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>Device location is mandatory for exam attendance tracking.</div>
            </div>
          </div>
        ) : locationError ? (
          <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', fontWeight: 800, fontSize: 13 }}>
              <span>📍 Location Access Required</span>
            </div>
            <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4, lineHeight: 1.4 }}>
              {locationError}
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 10, background: '#dc2626', width: '100%' }}
              onClick={requestLocation}
            >
              🔄 Allow / Turn On Location
            </button>
          </div>
        ) : location ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>Location Verified & Active</span>
              </div>
              <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                ±{location.accuracy}m GPS
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#15803d', fontFamily: 'monospace' }}>
              Coordinates: {location.formattedCoord}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-600)', borderTop: '1px dashed #bbf7d0', paddingTop: 4 }}>
              📱 Device: <strong>{deviceInfo}</strong>
            </div>
          </div>
        ) : null}

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
          disabled={!activeExam || !location || loading}>
          {loading && step === STEPS.SCAN_ADMIT ? 'Verifying...' : (!location ? '📍 Enable Location to Scan' : '📷 Start Scanning')}
        </button>

        {/* Manual entry fallback */}
        <details style={{ background:'var(--gray-50)', borderRadius:10, padding:'10px 14px' }}>
          <summary style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', cursor:'pointer' }}>⌨️ Manual QR Entry (camera unavailable)</summary>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
            <input className="input-field" placeholder="Admit Card QR value" value={manualAdmit} onChange={e=>setManualAdmit(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={()=>{ if(manualAdmit.trim()) handleVerifyAdmit(manualAdmit.trim()); }} disabled={!manualAdmit.trim()||!location||loading}>
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
            { label:'📍 Location GPS', value: location?.formattedCoord || 'Pending...' },
            { label:'📱 Invigilator Device', value: deviceInfo },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <span style={{ fontSize:12, color:'var(--gray-500)', fontWeight:600 }}>{r.label}</span>
              <span style={{ fontSize:12, fontWeight:700, color: r.highlight ? '#16a34a' : 'var(--gray-900)' }}>{r.value}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ padding:16, background:'#16a34a' }} onClick={confirmMark} disabled={loading || !location}>
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
        <div style={{ fontSize:72 }}>{isOfflineSaved ? '💾' : '✅'}</div>
        <div style={{ fontWeight:800, fontSize:20, color: isOfflineSaved ? '#0a1f6b' : '#16a34a' }}>
          {isOfflineSaved ? 'Saved to Offline Queue!' : 'Attendance Marked & Synced!'}
        </div>
        <div style={{ background: isOfflineSaved ? '#eff6ff' : '#dcfce7', border: `1px solid ${isOfflineSaved ? '#bfdbfe' : '#bbf7d0'}`, borderRadius:12, padding:'12px 20px', width:'100%' }}>
          <div style={{ fontWeight:700, fontSize:15, color: isOfflineSaved ? '#1e3a8a' : '#14532d' }}>{preview?.studentName}</div>
          <div style={{ fontSize:12, color: isOfflineSaved ? '#1d4ed8' : '#166534', marginTop:4 }}>Copy No: <strong>{preview?.answerSheetNumber}</strong></div>
          {isOfflineSaved && (
            <div style={{ fontSize:11, color:'#3b82f6', marginTop:6 }}>
              📶 This record is stored locally on this device and will automatically sync to the school and board server when internet connection returns.
            </div>
          )}
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
    }).catch(() => {
      const cached = getCachedAssignedExams();
      if (cached?.data?.assignedExams) {
        setExams(cached.data.assignedExams);
        if (cached.data.currentExam) setSelectedExamId(cached.data.currentExam.exam_id);
      }
    });
  }, [api]);

  useEffect(() => {
    if (!selectedExamId) {
      setRoster([]);
      setSelectedExam(null);
      return;
    }
    const found = exams.find(e => String(e.id || e.exam_id) === String(selectedExamId));
    setSelectedExam(found);

    api(`/attendance/roster?examId=${selectedExamId}`)
      .then(res => {
        const offlineQueue = getOfflineQueue().filter(q => String(q.examIdRef) === String(selectedExamId));
        const offlineMap = new Map(offlineQueue.map(q => [String(q.studentIdRef), q]));

        const merged = res.map(s => {
          const off = offlineMap.get(String(s.studentId));
          if (off) {
            return {
              ...s,
              status: 'Present',
              answerSheetNumber: off.answerSheetNumber,
              markedAt: off.markedAt,
              isOfflineQueued: true
            };
          }
          return s;
        });

        setRoster(merged);
        cacheExamRoster(selectedExamId, res);
      })
      .catch(() => {
        const cached = getCachedExamRoster(selectedExamId) || [];
        const offlineQueue = getOfflineQueue().filter(q => String(q.examIdRef) === String(selectedExamId));
        const offlineMap = new Map(offlineQueue.map(q => [String(q.studentIdRef), q]));

        const merged = cached.map(s => {
          const off = offlineMap.get(String(s.studentId));
          if (off) {
            return {
              ...s,
              status: 'Present',
              answerSheetNumber: off.answerSheetNumber,
              markedAt: off.markedAt,
              isOfflineQueued: true
            };
          }
          return s;
        });

        setRoster(merged);
      });
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
              {exams.map(e => <option key={e.id} value={e.id}>{e.subject} — {formatClassLabel(e.class)} ({e.date})</option>)}
            </select>
          </div>
        </div>

        {!selectedExam ? (
          <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>Please select an exam to view sheet.</div>
        ) : (
          <>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{selectedExam.subject} — {formatClassLabel(selectedExam.class)}</div>
            <div style={{ fontSize:11, color:'#166534', marginBottom:4 }}>{selectedExam.date} · 📍 Block: {selectedExam.classroom || '—'}</div>
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
              {exams.map(e => <option key={e.id} value={e.id}>{e.subject} — {formatClassLabel(e.class)} ({e.date})</option>)}
            </select>
          </div>
        </div>

        {!selectedExam ? (
          <div style={{ textAlign:'center', color:'var(--gray-400)', padding:40 }}>Please select an exam to view absent report.</div>
        ) : (
          <>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{selectedExam.subject} — {formatClassLabel(selectedExam.class)}</div>
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
              <th style={{ padding:6, textAlign:'left' }}>Subject</th><th style={{ padding:6 }}>Class</th><th style={{ padding:6 }}>Date</th><th style={{ padding:6 }}>Time</th><th style={{ padding:6 }}>Block</th>
            </tr></thead>
            <tbody>
              {exams.map(e=>(
                <tr key={e._id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                  <td style={{ padding:6 }}>{e.subject}</td><td style={{ padding:6 }}>{e.class}</td><td style={{ padding:6 }}>{e.date}</td><td style={{ padding:6 }}>{e.time||'—'}</td><td style={{ padding:6, fontWeight:700, color:'#0a1f6b' }}>{e.classroom||'—'}</td>
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
