import { Student, InternshipLog, Teacher, Establishment } from './types';

// Mock Initial Data
const INITIAL_STUDENTS: Student[] = [];

const INITIAL_TEACHERS: Teacher[] = [];

const INITIAL_ESTABLISHMENTS: Establishment[] = [];

// Initial mock signature (a simple hand-drawn SVG represented as base64 or custom string/drawing path for visual mockup)
const SAMPLE_SIGNATURE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='40'><path d='M10 20 C 20 10, 40 30, 50 15 C 60 5, 80 25, 95 20' stroke='blue' stroke-width='2' fill='none'/></svg>";

const INITIAL_LOGS: InternshipLog[] = [];

// Helper to Safely load from localStorage or initialize with mocks
export function initDB() {
  const existingStudents = localStorage.getItem('intern_students');
  let forceOverWrite = false;
  if (existingStudents) {
    try {
      const parsed: Student[] = JSON.parse(existingStudents);
      if (parsed.length > 0 && parsed.some(s => s.student_id.length !== 11)) {
        forceOverWrite = true;
      }
    } catch (e) {
      forceOverWrite = true;
    }
  }

  if (!localStorage.getItem('intern_students') || forceOverWrite) {
    localStorage.setItem('intern_students', JSON.stringify(INITIAL_STUDENTS));
  }
  if (!localStorage.getItem('intern_teachers')) {
    localStorage.setItem('intern_teachers', JSON.stringify(INITIAL_TEACHERS));
  }
  if (!localStorage.getItem('intern_establishments')) {
    localStorage.setItem('intern_establishments', JSON.stringify(INITIAL_ESTABLISHMENTS));
  }
  if (!localStorage.getItem('intern_logs') || forceOverWrite) {
    localStorage.setItem('intern_logs', JSON.stringify(INITIAL_LOGS));
  }

  // Force clean up of the three deleted student IDs requested by the user
  const rawStudents = localStorage.getItem('intern_students');
  if (rawStudents) {
    try {
      const students: Student[] = JSON.parse(rawStudents);
      const filtered = students.filter(s => 
        s.student_id !== "65011234001" && 
        s.student_id !== "65011456001" && 
        s.student_id !== "65011987001"
      );
      if (filtered.length !== students.length) {
        localStorage.setItem('intern_students', JSON.stringify(filtered));
      }
    } catch (e) {}
  }

  const rawLogs = localStorage.getItem('intern_logs');
  if (rawLogs) {
    try {
      const logs: InternshipLog[] = JSON.parse(rawLogs);
      const filtered = logs.filter(l => 
        l.student_id !== "65011234001" && 
        l.student_id !== "65011456001" && 
        l.student_id !== "65011987001"
      );
      if (filtered.length !== logs.length) {
        localStorage.setItem('intern_logs', JSON.stringify(filtered));
      }
    } catch (e) {}
  }

  // Force clean up of the deleted teacher IDs requested by the user
  const rawTeachers = localStorage.getItem('intern_teachers');
  if (rawTeachers) {
    try {
      const teachers: Teacher[] = JSON.parse(rawTeachers);
      const filtered = teachers.filter(t => 
        t.teacher_id !== "T001" && 
        t.teacher_id !== "T002"
      );
      if (filtered.length !== teachers.length) {
        localStorage.setItem('intern_teachers', JSON.stringify(filtered));
      }
    } catch (e) {}
  }

  // Force clean up of the deleted mock establishment IDs requested by the user
  const rawEsts = localStorage.getItem('intern_establishments');
  if (rawEsts) {
    try {
      const ests: Establishment[] = JSON.parse(rawEsts);
      const filtered = ests.filter(e => 
        e.id !== "EST001" && 
        e.id !== "EST002" && 
        e.id !== "EST003"
      );
      if (filtered.length !== ests.length) {
        localStorage.setItem('intern_establishments', JSON.stringify(filtered));
      }
    } catch (e) {}
  }

}

// Students Operations
export function getStudents(): Student[] {
  initDB();
  const raw = localStorage.getItem('intern_students');
  return raw ? JSON.parse(raw) : [];
}

export function saveStudents(students: Student[]) {
  localStorage.setItem('intern_students', JSON.stringify(students));
}

export function addStudent(student: Student): boolean {
  const students = getStudents();
  if (students.some(s => s.student_id === student.student_id)) {
    return false; // Student ID exists
  }
  students.push(student);
  saveStudents(students);
  return true;
}

export function updateStudent(student: Student) {
  let students = getStudents();
  students = students.map(s => s.student_id === student.student_id ? student : s);
  saveStudents(students);
}

export function deleteStudent(studentId: string) {
  let students = getStudents();
  students = students.filter(s => s.student_id !== studentId);
  saveStudents(students);

  // Cascading deletion of student's logs
  let logs = getLogs();
  logs = logs.filter(l => l.student_id !== studentId);
  saveLogs(logs);
}

// Teachers Operations
export function getTeachers(): Teacher[] {
  initDB();
  const raw = localStorage.getItem('intern_teachers');
  return raw ? JSON.parse(raw) : [];
}

export function saveTeachers(teachers: Teacher[]) {
  localStorage.setItem('intern_teachers', JSON.stringify(teachers));
}

export function addTeacher(teacher: Teacher): boolean {
  const teachers = getTeachers();
  if (teachers.some(t => t.teacher_id === teacher.teacher_id)) {
    return false;
  }
  teachers.push(teacher);
  saveTeachers(teachers);
  return true;
}

export function updateTeacher(teacher: Teacher) {
  let teachers = getTeachers();
  teachers = teachers.map(t => t.teacher_id === teacher.teacher_id ? teacher : t);
  saveTeachers(teachers);
}

export function deleteTeacher(teacherId: string) {
  let teachers = getTeachers();
  teachers = teachers.filter(t => t.teacher_id !== teacherId);
  saveTeachers(teachers);
}

// Establishments Operations
export function getEstablishments(): Establishment[] {
  initDB();
  const raw = localStorage.getItem('intern_establishments');
  return raw ? JSON.parse(raw) : [];
}

export function saveEstablishments(establishments: Establishment[]) {
  localStorage.setItem('intern_establishments', JSON.stringify(establishments));
}

export function addEstablishment(est: Establishment): boolean {
  const ests = getEstablishments();
  if (ests.some(e => e.id === est.id)) {
    return false;
  }
  ests.push(est);
  saveEstablishments(ests);
  return true;
}

export function updateEstablishment(est: Establishment) {
  let ests = getEstablishments();
  ests = ests.map(e => e.id === est.id ? est : e);
  saveEstablishments(ests);
}

export function deleteEstablishment(id: string) {
  let ests = getEstablishments();
  ests = ests.filter(e => e.id !== id);
  saveEstablishments(ests);
}

// Logs Operations
export function getLogs(): InternshipLog[] {
  initDB();
  const raw = localStorage.getItem('intern_logs');
  return raw ? JSON.parse(raw) : [];
}

export function saveLogs(logs: InternshipLog[]) {
  localStorage.setItem('intern_logs', JSON.stringify(logs));
}

export function addLog(log: Omit<InternshipLog, 'log_id' | 'created_at' | 'status'> & { log_id?: number; created_at?: string }): { success: boolean, message?: string } {
  const logs = getLogs();

  // Validate duplicate date for the same student
  const isDuplicate = logs.some(l => l.student_id === log.student_id && l.work_date === log.work_date);
  if (isDuplicate) {
    return { success: false, message: "ไม่สามารถบันทึกข้อมูลซ้ำในวันเดียวกันได้" };
  }

  const nextId = logs.length > 0 ? Math.max(...logs.map(l => l.log_id)) + 1 : 1;
  const newLog: InternshipLog = {
    ...log,
    log_id: nextId,
    created_at: new Date().toISOString(),
    status: 'pending'
  };

  logs.push(newLog);
  saveLogs(logs);
  return { success: true };
}

export function updateLog(updatedLog: InternshipLog): { success: boolean, message?: string } {
  const logs = getLogs();
  
  // Validate duplicate date if date has changed and conflicts with another log
  const original = logs.find(l => l.log_id === updatedLog.log_id);
  if (!original) {
    return { success: false, message: "ไม่พบข้อมูลบันทึกที่ลบหรือแก้ไข" };
  }

  if (original.work_date !== updatedLog.work_date) {
    const isDuplicate = logs.some(l => l.student_id === updatedLog.student_id && l.work_date === updatedLog.work_date && l.log_id !== updatedLog.log_id);
    if (isDuplicate) {
      return { success: false, message: "ไม่สามารถปรับเปลี่ยนวันที่เป็นวันเดิมที่มีข้อมูลบันทึกอยู่แล้วได้" };
    }
  }

  const newLogs = logs.map(l => l.log_id === updatedLog.log_id ? updatedLog : l);
  saveLogs(newLogs);
  return { success: true };
}

export function deleteLog(logId: number) {
  let logs = getLogs();
  logs = logs.filter(l => l.log_id !== logId);
  saveLogs(logs);
}

/**
 * Calculates hour difference between HH:MM strings.
 * E.g. "08:30" to "17:30" => 9.0 hours.
 * Must count minutes properly.
 */
export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) return 0;

  let diffMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  if (diffMinutes < 0) {
    // Over midnight next day (or invalid inputs)
    return 0;
  }

  const diffHours = diffMinutes / 60;
  // Round to 2 decimal places
  return Math.round(diffHours * 100) / 100;
}
