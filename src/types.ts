/**
 * Types for the Internship Log System
 */

export interface Student {
  student_id: string; // VARCHAR
  full_name: string; // VARCHAR
  department: string; // VARCHAR
  major: string; // VARCHAR
  mentor_name?: string; // Teacher or Advisor Name
  establishment_id?: string; // Selected workplace ID
}

export interface InternshipLog {
  log_id: number; // INT
  student_id: string; // VARCHAR
  work_date: string; // DATE (YYYY-MM-DD)
  start_time: string; // TIME (HH:MM)
  end_time: string; // TIME (HH:MM)
  work_detail: string; // TEXT
  total_hours: number; // DECIMAL
  supervisor_signature: string; // TEXT (base64 drawing or uploaded image)
  note: string; // TEXT (optional)
  created_at: string; // DATETIME

  // Added elements for Supervisor Review Workflow
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  feedback?: string;
}

export interface Teacher {
  teacher_id: string;
  full_name: string;
  department: string;
  signature?: string; // Optional teacher/supervisor saved signature
  password?: string; // Teacher/supervisor custom password
}

export interface Establishment {
  id: string;
  name: string;
  address: string;
  contact_person: string;
  phone: string;
}

export type UserRole = 'student' | 'teacher' | 'admin';
