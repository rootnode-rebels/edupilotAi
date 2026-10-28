import type { Timestamp } from 'firebase/firestore';

export type MockTestStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface MockTestSchedule {
  id: string; // Document ID
  courseId: string;
  title: string;
  description?: string;
  scheduledDate: string; // ISO format (YYYY-MM-DD)
  startTime: string; // HH:mm format
  durationMinutes: number;
  timezone: string;
  topics: string[];
  assessmentId?: string; // Optional reference to an existing Assessment
  status: MockTestStatus;
  
  // Auditing
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
}
