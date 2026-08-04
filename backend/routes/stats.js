const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

// GET dashboard stats for Board Admin
router.get('/dashboard', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const [schools, teachers, students, exams, attendance, presentCount] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM schools"),
      pool.query("SELECT COUNT(*) FROM users WHERE role='Teacher'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role='Student'"),
      pool.query("SELECT COUNT(*) FROM exams"),
      pool.query("SELECT COUNT(*) FROM attendance"),
      pool.query("SELECT COUNT(*) FROM attendance WHERE status='Present'"),
    ]);

    // Attendance per exam
    const { rows: examStats } = await pool.query(`
      SELECT e.subject, e.date, e.class,
        (SELECT COUNT(*) FROM attendance a WHERE a.exam_id=e.id AND a.status='Present') as present,
        (SELECT COUNT(*) FROM users u 
         WHERE u.role='Student' AND u.class=e.class
           AND (u.school_id = e.center_id OR u.school_id IN (
             SELECT home_school_id FROM center_assignments WHERE center_school_id = e.center_id
           ))
        ) as total_students
      FROM exams e
      ORDER BY e.date DESC
      LIMIT 10`
    );

    // School-wise student count
    const { rows: schoolStats } = await pool.query(`
      SELECT s.name as school_name, s.school_id,
        COUNT(u.id) FILTER (WHERE u.role='Student') as students,
        COUNT(u.id) FILTER (WHERE u.role='Teacher') as teachers
      FROM schools s
      LEFT JOIN users u ON u.school_id=s.id
      GROUP BY s.id, s.name, s.school_id
      ORDER BY students DESC`
    );

    // Daily attendance trend (last 7 days)
    const { rows: dailyTrend } = await pool.query(`
      SELECT DATE(marked_at) as date, COUNT(*) as count
      FROM attendance
      WHERE marked_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(marked_at)
      ORDER BY date ASC`
    );

    const totalAttendance = parseInt(attendance.rows[0].count);
    const totalPresent = parseInt(presentCount.rows[0].count);

    res.json({
      overview: {
        schools: parseInt(schools.rows[0].count),
        teachers: parseInt(teachers.rows[0].count),
        students: parseInt(students.rows[0].count),
        exams: parseInt(exams.rows[0].count),
        totalAttendance,
        totalPresent,
        attendanceRate: totalAttendance > 0 ? Math.round((totalPresent / totalAttendance) * 100) : 0,
      },
      examStats: examStats.map(e => ({
        subject: e.subject,
        date: e.date,
        class: e.class,
        present: parseInt(e.present) || 0,
        total: parseInt(e.total_students) || 0,
        rate: e.total_students > 0 ? Math.round((e.present / e.total_students) * 100) : 0,
      })),
      schoolStats: schoolStats.map(s => ({
        name: s.school_name,
        schoolId: s.school_id,
        students: parseInt(s.students) || 0,
        teachers: parseInt(s.teachers) || 0,
      })),
      dailyTrend: dailyTrend.map(d => ({
        date: d.date,
        count: parseInt(d.count),
      })),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
