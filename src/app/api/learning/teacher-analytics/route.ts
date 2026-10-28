import { NextRequest, NextResponse } from 'next/server';
import { courseService } from '@/services/courses/courseService';
import { conceptService } from '@/services/knowledge/conceptService';
import { assessmentService } from '@/services/assessments/assessmentService';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { AssessmentAttempt, Assessment, Concept, CourseMember } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId');
    const authUserId = req.headers.get('x-user-id')?.trim() || req.nextUrl.searchParams.get('userId')?.trim();

    if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!courseId) return NextResponse.json({ error: 'courseId is required' }, { status: 400 });

    const callerProfile = await getUserProfile(authUserId);
    if (!callerProfile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success || !courseRes.data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseRes.data.teacherId !== authUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [membersRes, conceptsRes, attemptsRes, assessmentsRes] = await Promise.all([
      courseService.listCourseMembers(courseId),
      conceptService.listCourseConcepts(courseId),
      assessmentService.listCourseAttempts(courseId),
      assessmentService.listCourseAssessments(courseId),
    ]);

    const members: CourseMember[] = membersRes.success && membersRes.data ? membersRes.data : [];
    const concepts: Concept[] = conceptsRes.success && conceptsRes.data ? conceptsRes.data : [];
    const attempts: AssessmentAttempt[] = attemptsRes.success && attemptsRes.data ? attemptsRes.data : [];
    const assessments: Assessment[] = assessmentsRes.success && assessmentsRes.data ? assessmentsRes.data : [];

    // Filter to published/completed assessments
    const completedAttempts = attempts.filter((a) => a.status === 'completed');

    // Get latest attempt per student per assessment
    const latestAttemptsByStudentAndAssessment = new Map<string, Map<string, AssessmentAttempt>>();
    for (const att of completedAttempts) {
      let studentMap = latestAttemptsByStudentAndAssessment.get(att.studentId);
      if (!studentMap) {
        studentMap = new Map();
        latestAttemptsByStudentAndAssessment.set(att.studentId, studentMap);
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

    // --- FEATURE 1: Performance Trends ---
    // Calculate average score per assessment across latest attempts
    const validAssessments = assessments
      .filter(a => a.status === 'published' || a.status === 'closed')
      .sort((a, b) => (a.createdAt.toMillis?.() || 0) - (b.createdAt.toMillis?.() || 0));

    const performanceTrends = validAssessments.map(ass => {
      let totalScore = 0;
      let participantCount = 0;
      
      for (const studentMap of latestAttemptsByStudentAndAssessment.values()) {
        const attempt = studentMap.get(ass.id);
        if (attempt && attempt.percentage !== undefined) {
          totalScore += attempt.percentage;
          participantCount++;
        }
      }

      return {
        assessmentId: ass.id,
        assessmentTitle: ass.title,
        date: ass.createdAt.toDate ? ass.createdAt.toDate().toISOString() : new Date().toISOString(),
        averageScore: participantCount > 0 ? Math.round(totalScore / participantCount) : 0,
        participantCount,
        maxScore: 100, // Normalized to percentage
      };
    }).filter(t => t.participantCount > 0);

    // --- FEATURE 2 & 3: Topic Performance & Mastery Heatmap ---
    const conceptNameMap = new Map<string, string>();
    for (const c of concepts) {
      conceptNameMap.set(c.id, c.name);
    }
    conceptNameMap.set('uncategorized', 'Uncategorized Questions');

    const topicStatsMap = new Map<string, {
      conceptId: string;
      conceptName: string;
      totalQuestions: number;
      correctAnswers: number;
      studentsAttempted: Set<string>;
      studentsStruggling: Set<string>;
    }>();

    // Map: studentId -> topicId -> { correct: number, total: number }
    const studentTopicPerformance = new Map<string, Map<string, { correct: number; total: number }>>();

    for (const [studentId, studentMap] of latestAttemptsByStudentAndAssessment.entries()) {
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
          if (!studentTopicPerformance.has(studentId)) {
            studentTopicPerformance.set(studentId, new Map());
          }
          
          const tStats = topicStatsMap.get(cId)!;
          tStats.totalQuestions += data.total;
          tStats.correctAnswers += data.correct;
          tStats.studentsAttempted.add(studentId);

          const sPerfMap = studentTopicPerformance.get(studentId)!;
          const sPerf = sPerfMap.get(cId) || { correct: 0, total: 0 };
          sPerf.total += data.total;
          sPerf.correct += data.correct;
          sPerfMap.set(cId, sPerf);
        }
      }
    }

    // Populate struggling students
    for (const [studentId, sPerfMap] of studentTopicPerformance.entries()) {
      for (const [cId, sPerf] of sPerfMap.entries()) {
        if (sPerf.total > 0) {
          const accuracy = (sPerf.correct / sPerf.total) * 100;
          if (accuracy < 60) {
            topicStatsMap.get(cId)?.studentsStruggling.add(studentId);
          }
        }
      }
    }

    const topicPerformance = Array.from(topicStatsMap.values())
      .filter(t => t.totalQuestions > 0)
      .map(t => {
      const accuracy = Math.round((t.correctAnswers / t.totalQuestions) * 100);
      return {
        conceptId: t.conceptId,
        conceptName: t.conceptName,
        totalQuestions: t.totalQuestions,
        correctAnswers: t.correctAnswers,
        incorrectAnswers: t.totalQuestions - t.correctAnswers,
        accuracy,
        hasData: true,
        strugglingStudentCount: t.studentsStruggling.size,
        evaluatedStudentCount: t.studentsAttempted.size,
      };
    });

    // Sort: topics with data first by ascending accuracy (worst first)
    topicPerformance.sort((a, b) => a.accuracy - b.accuracy);

    // --- FEATURE 3: Mastery Heatmap Data ---
    // Fetch profiles for students
    const memberProfiles = await Promise.all(
      members.map(async (m) => {
        const prof = await getUserProfile(m.studentId);
        return {
          studentId: m.studentId,
          name: prof?.displayName || prof?.email?.split('@')[0] || `Student (${m.studentId.slice(0, 6)})`,
        };
      })
    );
    
    const heatmapData = memberProfiles.map(member => {
      const sPerfMap = studentTopicPerformance.get(member.studentId) || new Map();
      const topicMasteries = topicPerformance.map(topic => {
        const perf = sPerfMap.get(topic.conceptId);
        let status = 'insufficient_data';
        let accuracy = 0;
        
        if (perf && perf.total > 0) {
          accuracy = Math.round((perf.correct / perf.total) * 100);
          if (accuracy >= 80) status = 'mastered';
          else if (accuracy >= 50) status = 'developing';
          else status = 'needs_support';
        }

        return {
          conceptId: topic.conceptId,
          status,
          accuracy,
          total: perf?.total || 0,
          correct: perf?.correct || 0,
        };
      });

      return {
        studentId: member.studentId,
        studentName: member.name,
        topicMasteries,
      };
    });

    // --- FEATURE 4: Students Requiring Attention ---
    const studentsRequiringAttention = memberProfiles.map(member => {
      const sPerfMap = studentTopicPerformance.get(member.studentId) || new Map();
      let weakTopics = [];
      let totalQuestions = 0;
      let correctAnswers = 0;

      for (const [cId, perf] of sPerfMap.entries()) {
        totalQuestions += perf.total;
        correctAnswers += perf.correct;
        const accuracy = Math.round((perf.correct / perf.total) * 100);
        if (accuracy < 50 && perf.total > 1) { // Needs at least 2 questions to be a "weak topic"
          weakTopics.push({
            conceptId: cId,
            conceptName: conceptNameMap.get(cId) || 'Unknown',
            accuracy
          });
        }
      }

      // Check for declining trend (last 2 assessments)
      const studentAssAttempts = validAssessments.map(ass => {
        return latestAttemptsByStudentAndAssessment.get(member.studentId)?.get(ass.id);
      }).filter(a => a !== undefined) as AssessmentAttempt[];

      let latestScore = null;
      let previousScore = null;
      let declining = false;

      if (studentAssAttempts.length >= 1) {
        latestScore = studentAssAttempts[studentAssAttempts.length - 1].percentage || 0;
      }
      if (studentAssAttempts.length >= 2) {
        previousScore = studentAssAttempts[studentAssAttempts.length - 2].percentage || 0;
        if (latestScore !== null && (previousScore - latestScore > 15)) { // 15% drop is a declining trend
          declining = true;
        }
      }

      const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      const reasons = [];
      if (declining) reasons.push("Significant drop in recent assessment scores.");
      if (weakTopics.length > 0) reasons.push(`Struggling with ${weakTopics.length} specific topics.`);
      if (overallAccuracy > 0 && overallAccuracy < 50) reasons.push("Overall accuracy across course is below 50%.");

      return {
        studentId: member.studentId,
        studentName: member.name,
        latestScore,
        previousScore,
        weakTopics,
        reasons,
        totalAttempts: studentAssAttempts.length,
        overallAccuracy,
      };
    }).filter(s => s.reasons.length > 0).sort((a, b) => a.overallAccuracy - b.overallAccuracy);

    return NextResponse.json({
      success: true,
      data: {
        performanceTrends,
        topicPerformance,
        heatmapData,
        studentsRequiringAttention,
      }
    });

  } catch (err: unknown) {
    console.error('Error in GET /api/learning/teacher-analytics:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
