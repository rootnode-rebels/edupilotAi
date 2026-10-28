/**
 * src/app/api/learning/teacher-insights/route.ts
 *
 * GET /api/learning/teacher-insights?courseId=...
 *
 * Provides teacher-scoped class-level adaptive learning analytics:
 * - Aggregated student mastery profiles.
 * - Identified learning gaps and prerequisite bottlenecks.
 * - Students with insufficient evidence (needs diagnostic assessment).
 * - System/AI intervention recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { courseService } from '@/services/courses/courseService';
import { conceptService } from '@/services/knowledge/conceptService';
import { assessmentService } from '@/services/assessments/assessmentService';
import { aiService } from '@/services/ai/aiService';
import { getUserProfile } from '@/lib/firebase/firestore';
import { estimateStudentCourseMastery } from '@/services/learning/masteryEstimator';
import { diagnoseLearningGaps } from '@/services/learning/learningGapEngine';
import { predictLearningGaps } from '@/services/learning/predictionEngine';
import type { StudentGapSummary, AssessmentAttempt, Concept, CourseMember } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId');

    const authUserId =
      req.headers.get('x-user-id')?.trim() ||
      req.nextUrl.searchParams.get('userId')?.trim();

    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'courseId query parameter is required' }, { status: 400 });
    }

    // 1. Authorize Teacher
    const callerProfile = await getUserProfile(authUserId);
    if (!callerProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (courseRes.data.teacherId !== authUserId) {
      return NextResponse.json({ error: 'Forbidden: You are not authorized to view insights for this course' }, { status: 403 });
    }

    // 2. Fetch Course Data
    const [membersRes, conceptsRes, attemptsRes, recommendationsRes] = await Promise.all([
      courseService.listCourseMembers(courseId),
      conceptService.listCourseConcepts(courseId),
      assessmentService.listCourseAttempts(courseId),
      aiService.listCourseRecommendations(courseId),
    ]);

    const members: CourseMember[] = membersRes.success && membersRes.data ? membersRes.data : [];
    const concepts: Concept[] = conceptsRes.success && conceptsRes.data ? conceptsRes.data : [];
    const attempts: AssessmentAttempt[] = attemptsRes.success && attemptsRes.data ? attemptsRes.data : [];
    const recommendations = recommendationsRes.success && recommendationsRes.data ? recommendationsRes.data : [];

    const completedAttempts = attempts.filter((a) => a.status === 'completed');

    // Group completed attempts by studentId
    const attemptsByStudent = new Map<string, AssessmentAttempt[]>();
    for (const att of completedAttempts) {
      const list = attemptsByStudent.get(att.studentId) || [];
      list.push(att);
      attemptsByStudent.set(att.studentId, list);
    }

    // Fetch user profiles for members in parallel
    const memberProfiles = await Promise.all(
      members.map(async (m) => {
        const prof = await getUserProfile(m.studentId);
        return {
          studentId: m.studentId,
          name: prof?.displayName || prof?.email?.split('@')[0] || `Student (${m.studentId.slice(0, 6)})`,
          email: prof?.email || '',
        };
      })
    );
    const profileMap = new Map(memberProfiles.map((p) => [p.studentId, p]));

    // 3. Analyze each enrolled student
    const studentSummaries: StudentGapSummary[] = [];
    for (const member of members) {
      const studentId = member.studentId;
      const studentAttempts = attemptsByStudent.get(studentId) || [];

      // Calculate mastery
      const profile = estimateStudentCourseMastery(studentId, courseId, concepts, studentAttempts);
      const gapDiag = diagnoseLearningGaps(concepts, profile, []);
      const predictionDiag = predictLearningGaps(concepts, profile);

      // Check if student needs baseline assessment
      const needsDiagnostic = studentAttempts.length === 0;

      // Extract struggling concepts
      const strugglingConcepts: StudentGapSummary['strugglingConcepts'] = [];
      for (const gap of gapDiag.activeGaps) {
        strugglingConcepts.push({
          conceptId: gap.conceptId,
          conceptName: gap.conceptName,
          score: gap.currentMastery,
          riskLevel: gap.riskLevel,
          evidence: gap.evidence,
        });
      }

      // Extract predicted gaps
      const predictedConcepts: StudentGapSummary['predictedConcepts'] = [];
      for (const gap of predictionDiag.predictedGaps) {
        predictedConcepts.push({
          conceptId: gap.conceptId,
          conceptName: gap.conceptName,
          riskLevel: gap.riskLevel,
          evidence: gap.evidence,
          rootPrerequisiteConceptName: gap.rootPrerequisiteConceptName,
        });
      }

      // Confidence level for student overall
      let overallConfidence: StudentGapSummary['confidence'] = 'insufficient';
      if (profile.evaluatedConcepts >= Math.min(3, concepts.length)) {
        overallConfidence = 'moderate';
      } else if (profile.evaluatedConcepts > 0) {
        overallConfidence = 'low';
      }

      const studentInfo = profileMap.get(studentId);

      studentSummaries.push({
        studentId,
        studentName: studentInfo?.name || `Student (${studentId.slice(0, 6)})`,
        studentEmail: studentInfo?.email || '',
        overallMastery: profile.overallMastery,
        confidence: overallConfidence,
        activeGapCount: gapDiag.activeGaps.length,
        resolvedGapCount: gapDiag.resolvedGapCount,
        predictedGapCount: predictionDiag.predictedGaps.length,
        strugglingConcepts,
        predictedConcepts,
        needsDiagnostic,
        lastAttemptAt: studentAttempts.length > 0 ? studentAttempts[0].submittedAt : undefined,
      });
    }

    // 4. Calculate real concept difficulty rankings based on actual quiz attempts
    const latestAttemptsByStudentAndAssesment = new Map<string, Map<string, AssessmentAttempt>>();
    for (const att of completedAttempts) {
      let studentMap = latestAttemptsByStudentAndAssesment.get(att.studentId);
      if (!studentMap) {
        studentMap = new Map();
        latestAttemptsByStudentAndAssesment.set(att.studentId, studentMap);
      }
      const existingAtt = studentMap.get(att.assessmentId);
      if (!existingAtt) {
        studentMap.set(att.assessmentId, att);
      } else {
        const existingTime = existingAtt.submittedAt?.toMillis ? existingAtt.submittedAt.toMillis() : 0;
        const newTime = att.submittedAt?.toMillis ? att.submittedAt.toMillis() : 0;
        if (newTime > existingTime) {
          studentMap.set(att.assessmentId, att);
        }
      }
    }

    const conceptNameMap = new Map<string, string>();
    for (const c of concepts) {
      conceptNameMap.set(c.id, c.name);
    }
    conceptNameMap.set('uncategorized', 'Uncategorized Questions');

    interface TopicStats {
      conceptId: string;
      conceptName: string;
      totalQuestions: number;
      correctAnswers: number;
      studentsAttempted: Set<string>;
      studentsStruggling: Set<string>;
    }
    const topicStatsMap = new Map<string, TopicStats>();
    const studentTopicPerformance = new Map<string, Map<string, { correct: number; total: number }>>();

    for (const [studentId, studentMap] of latestAttemptsByStudentAndAssesment.entries()) {
      for (const attempt of studentMap.values()) {
        const attemptTopics = new Map<string, { name: string; total: number; correct: number }>();
        
        if (attempt.results && attempt.results.length > 0) {
          for (const res of attempt.results) {
            if (res.selectedOptionIndex === null || res.selectedOptionIndex === undefined) continue;
            const cId = res.conceptId || 'uncategorized';
            const cName = res.conceptName || conceptNameMap.get(cId) || 'Uncategorized Questions';
            
            const existing = attemptTopics.get(cId) || { name: cName, total: 0, correct: 0 };
            existing.total += 1;
            if (res.isCorrect) existing.correct += 1;
            attemptTopics.set(cId, existing);
          }
        } else if (attempt.conceptBreakdown && attempt.conceptBreakdown.length > 0) {
          for (const cb of attempt.conceptBreakdown) {
            if (cb.questionsCount > 0) {
              const cId = cb.conceptId || 'uncategorized';
              const cName = cb.conceptName || conceptNameMap.get(cId) || 'Uncategorized Questions';
              
              const existing = attemptTopics.get(cId) || { name: cName, total: 0, correct: 0 };
              existing.total += cb.questionsCount;
              existing.correct += cb.correctCount;
              attemptTopics.set(cId, existing);
            }
          }
        }

        for (const [cId, data] of attemptTopics.entries()) {
          if (!topicStatsMap.has(cId)) {
            topicStatsMap.set(cId, {
              conceptId: cId,
              conceptName: data.name,
              totalQuestions: 0,
              correctAnswers: 0,
              studentsAttempted: new Set(),
              studentsStruggling: new Set(),
            });
          }
          if (!studentTopicPerformance.has(cId)) {
            studentTopicPerformance.set(cId, new Map());
          }
          
          const tStats = topicStatsMap.get(cId)!;
          tStats.totalQuestions += data.total;
          tStats.correctAnswers += data.correct;
          tStats.studentsAttempted.add(studentId);

          const sPerfMap = studentTopicPerformance.get(cId)!;
          const sPerf = sPerfMap.get(studentId) || { correct: 0, total: 0 };
          sPerf.total += data.total;
          sPerf.correct += data.correct;
          sPerfMap.set(studentId, sPerf);
        }
      }
    }

    for (const [cId, sPerfMap] of studentTopicPerformance.entries()) {
      const tStats = topicStatsMap.get(cId)!;
      for (const [studentId, sPerf] of sPerfMap.entries()) {
        if (sPerf.total > 0) {
          const accuracy = (sPerf.correct / sPerf.total) * 100;
          if (accuracy < 60) {
            tStats.studentsStruggling.add(studentId);
          }
        }
      }
    }

    const conceptDifficulties = Array.from(topicStatsMap.values())
      .filter((t) => t.totalQuestions > 0)
      .map((t) => {
        const accuracy = Math.round((t.correctAnswers / t.totalQuestions) * 100);
        const failureRate = 100 - accuracy;
        return {
          conceptId: t.conceptId,
          conceptName: t.conceptName,
          accuracy,
          failureRate,
          totalQuestions: t.totalQuestions,
          correctAnswers: t.correctAnswers,
          strugglingStudentCount: t.studentsStruggling.size,
          evaluatedStudentCount: t.studentsAttempted.size,
        };
      })
      .sort((a, b) => b.failureRate - a.failureRate);

    return NextResponse.json({
      success: true,
      data: {
        totalEnrolled: members.length,
        studentsWithAttempts: attemptsByStudent.size,
        studentsNeedingDiagnostic: members.filter((m) => !attemptsByStudent.has(m.studentId)).length,
        studentSummaries,
        conceptDifficulties,
        recommendations,
      },
    });
  } catch (err: unknown) {
    console.error('Error in GET /api/learning/teacher-insights:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
