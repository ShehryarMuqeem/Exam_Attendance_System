// Offline storage management for remote attendance taking and auto-sync
const QUEUE_KEY = 'attendx_offline_attendance_queue';
const EXAMS_CACHE_KEY = 'attendx_cached_exams';
const ROSTER_CACHE_PREFIX = 'attendx_cached_roster_';

/**
 * Retrieve all queued offline attendance records
 */
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline queue:', e);
    return [];
  }
}

/**
 * Save an attendance record to offline queue
 */
export function saveOfflineAttendance(record) {
  try {
    const queue = getOfflineQueue();
    const newRecord = {
      id: record.id || `off_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...record,
      markedAt: record.markedAt || new Date().toISOString(),
      queuedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    // Remove any previous pending record for the same student and exam to prevent duplication
    const filtered = queue.filter(
      r => !(String(r.studentIdRef) === String(record.studentIdRef) && String(r.examIdRef) === String(record.examIdRef))
    );

    filtered.push(newRecord);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    return newRecord;
  } catch (e) {
    console.error('Failed to save offline attendance:', e);
    return null;
  }
}

/**
 * Remove specific records from offline queue after successful sync
 */
export function removeOfflineRecords(ids) {
  try {
    const queue = getOfflineQueue();
    const idSet = new Set(ids);
    const updated = queue.filter(r => !idSet.has(r.id));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove offline records:', e);
    return [];
  }
}

/**
 * Cache assigned exams list & current exam for offline availability
 */
export function cacheAssignedExams(data) {
  try {
    if (data) {
      localStorage.setItem(EXAMS_CACHE_KEY, JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      }));
    }
  } catch (e) {
    console.error('Failed to cache exams:', e);
  }
}

/**
 * Get cached assigned exams
 */
export function getCachedAssignedExams() {
  try {
    const raw = localStorage.getItem(EXAMS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Cache student roster for an exam
 */
export function cacheExamRoster(examId, roster) {
  try {
    if (examId && Array.isArray(roster)) {
      localStorage.setItem(ROSTER_CACHE_PREFIX + examId, JSON.stringify({
        roster,
        cachedAt: new Date().toISOString()
      }));
    }
  } catch (e) {
    console.error('Failed to cache roster:', e);
  }
}

/**
 * Get cached roster for an exam
 */
export function getCachedExamRoster(examId) {
  try {
    const raw = localStorage.getItem(ROSTER_CACHE_PREFIX + examId);
    return raw ? JSON.parse(raw)?.roster : null;
  } catch (e) {
    return null;
  }
}

/**
 * Synchronize offline records with the backend API
 */
export async function syncOfflineAttendance(api) {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { total: 0, synced: 0, failed: 0 };

  try {
    const res = await api('/attendance/sync-offline', {
      method: 'POST',
      body: JSON.stringify({ records: queue })
    });

    const successfulIds = (res.results || [])
      .filter(r => r.success)
      .map(r => r.clientRecordId);

    if (successfulIds.length > 0) {
      removeOfflineRecords(successfulIds);
    }

    return {
      total: queue.length,
      synced: res.syncedCount || successfulIds.length,
      failed: res.failedCount || (queue.length - successfulIds.length),
      results: res.results
    };
  } catch (err) {
    console.warn('Sync offline request failed:', err.message);
    throw err;
  }
}
