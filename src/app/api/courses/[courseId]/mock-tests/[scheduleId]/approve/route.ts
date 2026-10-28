import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSecret } from '@/lib/auth/serverAuth';
import { mockTestService } from '@/services/assessments/mockTestService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    
    // Require Admin for approvals
    const adminAuth = verifyAdminSecret(req);
    if (!adminAuth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin required' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action as 'approve' | 'reject';
    const reason = body.reason as string | undefined;

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject' }, { status: 400 });
    }

    // In a real system, approverId might be parsed from admin auth token, here we'll just use 'admin'
    const approverId = 'admin';

    const result = await mockTestService.approveSchedule(scheduleId, approverId, action, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
