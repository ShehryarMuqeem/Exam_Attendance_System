// ===== Academic Structure Reference Data =====
// This is the fixed hierarchy the whole exam-creation flow walks through:
// Year → Term → Shift (Morning/Evening) → Department → Subject
//
// Kept as static config (not DB tables) since this structure is defined by the
// Board's curriculum policy, not something that changes per-school or needs
// admin CRUD — exactly the kind of thing that should be code, not data.

const ACADEMIC_YEARS = ['2025-2026', '2024-2025', '2023-2024', '2022-2023'];

const TERMS = [
  'SSC-I',
  'SSC-I Supplementary',
  'SSC-II',
  'SSC-II Supplementary',
  'HSSC-I',
  'HSSC-I Supplementary',
  'HSSC-II',
  'HSSC-II Supplementary',
];

const SHIFTS = ['Morning', 'Evening'];

// SSC terms use SSC departments; HSSC terms use HSSC departments.
const SSC_DEPARTMENTS = ['Science', 'Computer Science', 'Humanities'];
const HSSC_DEPARTMENTS = ['Pre-Medical', 'Pre-Engineering', 'Computer Science (ICS)', 'Commerce (I.Com)', 'Humanities (F.A)', 'General Science (F.A)'];

function departmentsForTerm(term) {
  if (!term) return [];
  return term.startsWith('SSC') ? SSC_DEPARTMENTS : HSSC_DEPARTMENTS;
}

// Subject lists per department, per the Board's actual curriculum.
const SUBJECTS = {
  // ===== SSC (Matric) =====
  'Science': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Physics', 'Chemistry', 'Biology', 'Mathematics'],
  'Computer Science': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Physics', 'Chemistry', 'Computer Science', 'Mathematics'],
  'Humanities': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Civics', 'Geography', 'Mathematics/General Science', 'Home Economics'],

  // ===== HSSC (Intermediate) =====
  'Pre-Medical': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Physics', 'Chemistry', 'Biology'],
  'Pre-Engineering': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Physics', 'Chemistry', 'Mathematics'],
  'Computer Science (ICS)': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Physics/Statistics', 'Mathematics', 'Computer Science'],
  'Commerce (I.Com)': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Principles of Accounting', 'Business Mathematics/Stats', 'Principles of Economics', 'Commercial Geography/Banking', 'Office Management/Computer'],
  'Humanities (F.A)': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Civics', 'Economics/History', 'Philosophy/Psychology', 'Geography'],
  'General Science (F.A)': ['English', 'Urdu', 'Pakistan Studies', 'Islamiyat', 'Economics', 'Statistics/Civics', 'Mathematics/Psychology', 'Education'],
};

function subjectsForDepartment(department) {
  return SUBJECTS[department] || [];
}

// The only valid class values in the new structure — replaces the old free-text
// "class" field (6th, 10, etc.) entirely.
const CLASSES = [
  'SSC-I', 'SSC-II', 'HSC-I', 'HSC-II',
  'SSC-I Supplementary', 'SSC-II Supplementary',
  'HSC-I Supplementary', 'HSC-II Supplementary',
];

module.exports = {
  ACADEMIC_YEARS,
  TERMS,
  SHIFTS,
  SSC_DEPARTMENTS,
  HSSC_DEPARTMENTS,
  CLASSES,
  departmentsForTerm,
  subjectsForDepartment,
};
