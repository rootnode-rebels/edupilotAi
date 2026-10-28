import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';
import { courseService } from '@/services/courses/courseService';
import { mockTestService } from '@/services/assessments/mockTestService';
import { z } from 'zod';

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)'),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  timezone: z.string(),
  topics: z.array(z.string()).default([]),
  assessmentId: z.string().optional(),
  status: z.enum(['draft', 'pending_approval']).default('draft'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    
    // Auth: Allow teachers and students. If student, only approved tests are returned.
    const userId = req.headers.get('x-user-id')?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacherAuth = await verifyTeacherAuth(userId);
    const role = teacherAuth.authorized ? 'teacher' : 'student';

    const res = await mockTestService.listCourseSchedules(courseId, role);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    
    // Auth: Teacher only
    const userId = req.headers.get('x-user-id')?.trim();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRes = await verifyTeacherAuth(userId);
    if (!authRes.authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Verify course ownership
    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success || !courseRes.data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseRes.data.teacherId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.format() }, { status: 400 });
    }

    const result = await mockTestService.createSchedule({
      ...parsed.data,
      courseId
    }, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
