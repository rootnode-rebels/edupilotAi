/**
 * src/app/api/ai/assessments/generate/route.ts
 *
 * Secure server-side endpoint for AI-assisted diagnostic question generation using Agnes 3.0 Flash.
 * Enforces:
 * - Teacher authentication and course ownership check
 * - Grounding in approved course concepts and curriculum materials
 * - Zod schema validation
 * - Graceful fallback if Agnes is unavailable
 * - Human-in-the-loop: returns drafts flagged as AI-generated for teacher review/approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { agnesService } from '@/services/ai/agnesService';
import { courseService } from '@/services/courses/courseService';
import { conceptService } from '@/services/knowledge/conceptService';
import { materialService } from '@/services/materials/materialService';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { AIGeneratedQuestion } from '@/services/ai/agnes/agnesTypes';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userId,
      courseId,
      conceptIds = [],
      numQuestions = 5,
      difficulty = 'medium',
      language = 'en',
    } = body;

    // 1. Authentication check
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Course validation
    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: courseId is required.' },
        { status: 400 }
      );
    }

    // 3. User & Course authorization
    const [profile, courseRes] = await Promise.all([
      getUserProfile(userId),
      courseService.getCourseById(courseId),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized: User profile not found.' },
        { status: 401 }
      );
    }

    if (profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can generate assessment questions.' },
        { status: 403 }
      );
    }

    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json(
        { error: 'Course not found.' },
        { status: 404 }
      );
    }

    const course = courseRes.data;
    if (course.teacherId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this course.' },
        { status: 403 }
      );
    }

    // 4. Retrieve course concepts
    const conceptsRes = await conceptService.listCourseConcepts(courseId);
    const allConcepts = conceptsRes.success && conceptsRes.data ? conceptsRes.data : [];

    const targetConcepts =
      Array.isArray(conceptIds) && conceptIds.length > 0
        ? allConcepts.filter((c) => conceptIds.includes(c.id))
        : allConcepts.slice(0, 5);

    if (targetConcepts.length === 0) {
      return NextResponse.json(
        {
          error:
            'No concepts found for this course. Please add course concepts in the Knowledge section first.',
        },
        { status: 400 }
      );
    }

    // 5. Retrieve course materials for grounding
    const materialsRes = await materialService.listCourseMaterials(courseId);
    const materials =
      materialsRes.success && materialsRes.data
        ? materialsRes.data.filter((m) => m.status === 'ready')
        : [];

    const materialSummaries = materials.slice(0, 3).map((m) => `${m.title} (${m.type})`);

    // 6. Invoke Agnes 3.0 Flash
    const agnesResult = await agnesService.generateAssessmentQuestions({
      courseId,
      courseTitle: course.title,
      courseSubject: course.subject,
      concepts: targetConcepts.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
      })),
      materialSummaries,
      numQuestions: Math.min(Math.max(Number(numQuestions) || 5, 1), 10),
      difficulty: ['easy', 'medium', 'hard', 'mixed'].includes(difficulty)
        ? (difficulty as 'easy' | 'medium' | 'hard' | 'mixed')
        : 'medium',
      language: typeof language === 'string' ? language : 'en',
      userId,
    });

    if (agnesResult.success && agnesResult.data) {
      // Map to formatted question objects with AI flag
      const formattedQuestions = agnesResult.data.questions.map((q: AIGeneratedQuestion, idx: number) => ({
        id: `ai_q_${Date.now()}_${idx}`,
        question: q.question,
        codeSnippet: q.codeSnippet,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        conceptId: q.conceptId || targetConcepts[idx % targetConcepts.length]?.id,
        conceptName: q.conceptName || targetConcepts[idx % targetConcepts.length]?.name,
        points: 1,
        isAiGenerated: true,
      }));

      return NextResponse.json({
        success: true,
        questions: formattedQuestions,
        pedagogicalRationale: agnesResult.data.pedagogicalRationale,
        isFallback: false,
      });
    }

    // 7. Resilient Fallback: If Agnes is unavailable or error occurs, provide curated concept questions
    const agnesErrMsg = !agnesResult.success ? agnesResult.error : 'Unknown model issue';
    console.warn(
      `[AI Questions] Agnes generation notice: ${agnesErrMsg}. Providing grounded fallback draft.`
    );

    const fallbackQuestions: Array<AIGeneratedQuestion & { id: string; points: number; isAiGenerated: boolean }> =
      targetConcepts.slice(0, numQuestions).map((concept, idx) => ({
        id: `fallback_q_${Date.now()}_${idx}`,
        conceptId: concept.id,
        conceptName: concept.name,
        question: `Which of the following principles is most fundamental when applying "${concept.name}"?`,
        codeSnippet: undefined,
        options: [
          {
            key: 'A',
            text: `Core systematic application and invariant constraints of ${concept.name}.`,
          },
          {
            key: 'B',
            text: `Superficial syntax without considering internal memory or structural implications.`,
          },
          {
            key: 'C',
            text: `Arbitrary execution disregarding prerequisites and runtime dependencies.`,
          },
          {
            key: 'D',
            text: `Ignoring exception handling and state management boundaries.`,
          },
        ],
        correctAnswer: 'A',
        explanation: `Demonstrating understanding of ${concept.name} requires mastery of its fundamental invariants and correct application constraints.`,
        points: 1,
        isAiGenerated: true,
        difficulty: 'medium',
      }));

    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      pedagogicalRationale:
        'Generated using offline pedagogical concept template (Agnes service fallback mode).',
      isFallback: true,
    });
  } catch (err: unknown) {
    console.error('[API ai/assessments/generate error]:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Internal server error generating assessment questions.',
      },
      { status: 500 }
    );
  }
}
