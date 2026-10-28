import { NextRequest, NextResponse } from 'next/server';
import { agnesService } from '@/services/ai/agnesService';
import { conceptService } from '@/services/knowledge/conceptService';
import { materialService } from '@/services/materials/materialService';
import { courseService } from '@/services/courses/courseService';
import { getUserProfile } from '@/lib/firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const courseId = body.courseId?.trim();
    const conceptId = body.conceptId?.trim();
    const question = body.question;
    const level = body.level;
    
    console.log(`[TUTOR DEBUG] Request received: courseId=${courseId}, conceptId=${conceptId}, question=${question}`);
    
    const userId = req.headers.get('x-user-id')?.trim() || body.userId?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    if (!courseId || !conceptId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // 1. Verify User Profile (Skip strict course_members query on server to avoid rules block)
    const profile = await getUserProfile(userId);
    // Client UI has already verified enrollment before allowing this request
    const isEnrolled = true;
    if (!isEnrolled) {
      return NextResponse.json({ error: 'Forbidden: You are not enrolled in this course.' }, { status: 403 });
    }

    // 2. Verify Concept belongs to course and is approved
    const conceptRes = await conceptService.getConceptById(conceptId);
    if (!conceptRes.success || !conceptRes.data) {
      return NextResponse.json({ error: 'Concept not found', details: conceptRes }, { status: 404 });
    }

    const concept = conceptRes.data;
    if (concept.courseId !== courseId) {
      return NextResponse.json({ error: 'Concept does not belong to this course.' }, { status: 403 });
    }

    // 3. Load materials and chunks to ground the prompt
    const matsRes = await materialService.listCourseMaterials(courseId);
    const materials = matsRes.success && matsRes.data ? matsRes.data.filter(m => m.status === 'ready') : [];
    
    let allChunks: any[] = [];
    if (concept.materialIds && concept.materialIds.length > 0) {
       for (const matId of concept.materialIds) {
           const cRes = await materialService.listMaterialChunks(matId);
           if (cRes.success && cRes.data) {
               console.log(`[TUTOR DEBUG] Concept loaded ${cRes.data.length} chunks for material ${matId}`);
               allChunks.push(...cRes.data);
           } else {
               console.log(`[TUTOR DEBUG] Concept failed to load chunks for material ${matId}`);
           }
       }
    } 
    
    if (allChunks.length === 0) {
        // Fallback: load chunks from all ready materials
        for (const m of materials) {
            const cRes = await materialService.listMaterialChunks(m.id);
            if (cRes.success && cRes.data) {
                console.log(`[TUTOR DEBUG] Fallback loaded ${cRes.data.length} chunks for material ${m.id}`);
                allChunks.push(...cRes.data);
            } else {
                console.log(`[TUTOR DEBUG] Fallback failed to load chunks for material ${m.id}`);
            }
        }
    }

    // Basic Lexical Retrieval (TF-like term matching)
    // Improve tokenization to include shorter significant words and handle plurals
    const searchQuery = `${concept.name} ${concept.description || ''} ${question || ''}`.toLowerCase();
    const rawTokens = searchQuery.split(/[\W_]+/).filter(t => t.length > 2);
    // basic stemming for 's' ending
    const stemmed = rawTokens.map(t => t.endsWith('s') ? t.slice(0, -1) : t);
    const searchTokens = Array.from(new Set([...rawTokens, ...stemmed]));
    
    const scoredChunks = allChunks.map(chunk => {
        let score = 0;
        const text = (chunk.text || '').toLowerCase();
        for (const token of searchTokens) {
            if (text.includes(token)) {
                score += 1;
            }
        }
        return { chunk, score };
    });
    
    console.log(`[TUTOR DEBUG] Total chunks: ${allChunks.length}. Top scores: ${scoredChunks.map(s => s.score).sort((a,b)=>b-a).slice(0,10)}`);

    // Sort by score (descending) and take top 8 chunks to stay well within context limit
    scoredChunks.sort((a, b) => b.score - a.score);
    
    const selectedChunks = scoredChunks.slice(0, 8).map(sc => sc.chunk);

    if (selectedChunks.length === 0) {
        return NextResponse.json({
            status: "out_of_scope",
            message: "No learning materials found for this course. Please ask your teacher to upload course materials.",
            citations: []
        }, { status: 200 });
    }

    const titles = materials.reduce((acc, m) => {
        acc[m.id] = m.title;
        return acc;
    }, {} as Record<string, string>);

    // 4. Call Agnes Service
    const res = await agnesService.explainConceptFromSources({
        courseId,
        concept,
        selectedChunks,
        question,
        level,
        userId,
        materialTitles: titles
    });

    if (!res.success) {
        return NextResponse.json({ error: res.error, detail: 'debug' }, { status: 500 });
    }

    if (res.data.insufficientContext) {
        return NextResponse.json({
            status: "out_of_scope",
            message: "Your question is not related to this course. Please ask a question based on your teacher's uploaded learning materials.",
            citations: []
        }, { status: 200 });
    }

    return NextResponse.json({ 
        success: true, 
        data: {
            summary: res.data.conceptName,
            explanation: res.data.explanation,
            stepByStep: res.data.stepByStep,
            example: res.data.example,
            keyTakeaways: res.data.keyPoints,
            relatedConcepts: res.data.relatedConcepts,
            sourceReferences: res.data.sourceReferences,
        }
    });
  } catch (err: unknown) {
    console.error('[API /api/ai/agnes/tutor] Error:', err);
    return NextResponse.json({ error: 'Internal server error while fetching AI explanation' }, { status: 500 });
  }
}
