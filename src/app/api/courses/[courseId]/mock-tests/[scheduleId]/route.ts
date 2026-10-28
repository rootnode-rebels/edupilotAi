import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';
import { courseService } from '@/services/courses/courseService';
import { mockTestService } from '@/services/assessments/mockTestService';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().min(1).optional(),
  timezone: z.string().optional(),
  topics: z.array(z.string()).optional(),
  assessmentId: z.string().optional(),
  status: z.enum(['draft', 'pending_approval', 'cancelled']).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    
    // Auth: Allow teachers and students.
    const userId = req.headers.get('x-user-id')?.trim();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await mockTestService.getSchedule(scheduleId);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 404 });
    }

    const teacherAuth = await verifyTeacherAuth(userId);
    if (!teacherAuth.authorized && res.data!.status !== 'approved') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; scheduleId: string }> }
) {
  try {
    const { courseId, scheduleId } = await params;
    
    const userId = req.headers.get('x-user-id')?.trim();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRes = await verifyTeacherAuth(userId);
    if (!authRes.authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success || !courseRes.data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseRes.data.teacherId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.format() }, { status: 400 });
    }

    const result = await mockTestService.updateSchedule(scheduleId, parsed.data, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; scheduleId: string }> }
) {
  try {
    const { courseId, scheduleId } = await params;
    
    const userId = req.headers.get('x-user-id')?.trim();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRes = await verifyTeacherAuth(userId);
    if (!authRes.authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success || !courseRes.data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseRes.data.teacherId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const result = await mockTestService.cancelSchedule(scheduleId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
