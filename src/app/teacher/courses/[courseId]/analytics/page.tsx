import { Metadata } from 'next';
import { TeacherAnalyticsClient } from '@/components/teacher/analytics/TeacherAnalyticsClient';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Course Analytics | EduPilot AI',
  description: 'Advanced Teacher Analytics for EduPilot AI Courses',
};

export const instant = false;

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  if (!courseId) {
    notFound();
  }

  return <TeacherAnalyticsClient courseId={courseId} />;
}
