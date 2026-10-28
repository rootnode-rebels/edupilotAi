"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { conceptService } from "@/services/knowledge/conceptService";
import { materialService } from "@/services/materials/materialService";
import type { Course, Concept, Material } from "@/types";
import {
  BrainCircuit,
  Sparkles,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
  MessageSquare,
  FileText,
  Lightbulb,
  ListTodo,
  TrendingUp,
  Award,
  BookMarked,
  ArrowLeft,
  ArrowDown
} from "lucide-react";
import { NoEnrolledCourses } from "@/components/student/NoEnrolledCourses";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isQuickAction?: boolean;
  isOutOfScope?: boolean;
  explanationData?: {
    summary?: string;
    explanation?: string;
    stepByStep?: string[];
    example?: string;
    keyTakeaways?: string[];
    relatedConcepts?: string[];
    sourceReferences?: Array<{
      materialTitle?: string;
      pageNumber?: number;
      relevanceNote?: string;
    }>;
  };
}

export default function StudentAiTutorPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const paramCourseId = searchParams.get("courseId");
  const paramConceptId = searchParams.get("conceptId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");

  const [isExplaining, setIsExplaining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studentQuestion, setStudentQuestion] = useState<string>('');
  const [explanationLevel, setExplanationLevel] = useState<string>('intermediate');
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 150);
  };

  // 1. Load enrolled courses
  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await courseService.listStudentCourses(user.uid, profile?.studentId);
        if (ignore) return;

        if (res.success && res.data) {
          setCourses(res.data);
          if (res.data.length > 0) {
            const foundParam = paramCourseId ? res.data.find((c) => c.id === paramCourseId) : null;
            setSelectedCourse(foundParam || res.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, [user?.uid, profile?.studentId, paramCourseId]);

  const [readiness, setReadiness] = useState<any>(null);

  // 2. Load concepts, materials, and readiness for selected course
  useEffect(() => {
    let ignore = false;

    async function loadCourseContent() {
      if (!selectedCourse?.id) return;

      try {
        const [conRes, matRes, readRes] = await Promise.all([
          conceptService.listCourseConcepts(selectedCourse.id),
          materialService.listCourseMaterials(selectedCourse.id),
          fetch(`/api/courses/${selectedCourse.id}/readiness?studentId=${user?.uid || ''}`).then(r => r.json())
        ]);

        if (ignore) return;

        if (conRes.success && conRes.data) {
          setConcepts(conRes.data);
          if (conRes.data.length > 0) {
            const match = paramConceptId ? conRes.data.find((c) => c.id === paramConceptId) : null;
            setSelectedConceptId(match ? match.id : conRes.data[0].id);
          } else {
            setSelectedConceptId("");
          }
        } else {
          setConcepts([]);
          setSelectedConceptId("");
        }

        if (matRes.success && matRes.data) {
          setMaterials(matRes.data.filter((m) => m.status !== "archived" && m.status !== "failed"));
        } else {
          setMaterials([]);
        }

        if (readRes.success && readRes.data) {
          setReadiness(readRes.data);
        }
      } catch (err) {
        console.error("Failed to load course content for AI tutor:", err);
      }
    }

    loadCourseContent();

    return () => {
      ignore = true;
    };
  }, [selectedCourse?.id, paramConceptId, user?.uid]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isExplaining]);

  const handleAskQuestion = async (overrideQuestion?: string) => {
    if (!selectedCourse || !selectedConceptId || !user?.uid) return;

    const concept = concepts.find((c) => c.id === selectedConceptId);
    if (!concept) return;

    const questionText = (overrideQuestion || studentQuestion).trim();
    if (!questionText) return;

    // Add user message to chat
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: questionText,
      isQuickAction: !!overrideQuestion
    };
    
    setChatHistory(prev => [...prev, newUserMsg]);
    setStudentQuestion(''); // Clear input if it wasn't a quick action
    setIsExplaining(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/agnes/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          conceptId: concept.id,
          question: questionText,
          level: explanationLevel,
          userId: user.uid
        }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        const newAssistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          explanationData: data.data
        };
        setChatHistory(prev => [...prev, newAssistantMsg]);
      } else if (res.ok && data.status === 'out_of_scope') {
        const newAssistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          isOutOfScope: true,
          explanationData: {
            summary: "Out of Scope",
            explanation: data.message
          }
        };
        setChatHistory(prev => [...prev, newAssistantMsg]);
      } else {
        setErrorMessage(data.error || "Could not generate concept explanation. Please try again.");
        // Remove the user message if it failed completely to avoid confusion? 
        // Or keep it and show error inline. Let's show error inline.
      }
    } catch {
      setErrorMessage("Network error while trying to fetch explanation. Please try again.");
    } finally {
      setIsExplaining(false);
    }
  };

  const QUICK_ACTIONS = [
    { label: "Explain from scratch", icon: Sparkles },
    { label: "Give me an analogy", icon: Lightbulb },
    { label: "Summarize key points", icon: ListTodo },
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-8">
        <div className="h-8 w-48 bg-slate-200/80 rounded-2xl" />
        <div className="h-44 w-full bg-slate-200/80 rounded-3xl" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <NoEnrolledCourses
          title="AI Tutoring Unavailable"
          description="You are not enrolled in any courses yet. Enroll in a course through your instructor to access AI tutoring."
        />
      </div>
    );
  }

  const isReadyForGrounding = readiness?.isReady || false;

  return (
    <div className="h-full w-full bg-[#F4F6FB] animate-in fade-in duration-300 flex flex-col">
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 flex flex-col gap-4">
        {/* Header & Course Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-xs border border-[#DCCBFF]/40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/60 shadow-sm mr-2"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-[#6842FF] to-[#5135F5] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6842FF]/20">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  RAG-Powered AI Tutor
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Grounded
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Ask questions and explore verified course curriculum.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                id="course-select"
                value={selectedCourse?.id || ""}
                onChange={(e) => {
                  const found = courses.find((c) => c.id === e.target.value);
                  if (found) setSelectedCourse(found);
                }}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold py-2.5 pl-4 pr-10 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6842FF] cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none rotate-90" />
            </div>
          </div>
        </div>

        {!isReadyForGrounding ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-8 shadow-xs space-y-6 max-w-2xl mx-auto mt-12">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">
                AI Tutor Awaiting Course Setup
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {readiness?.tutor.message || 'Waiting for course content...'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5 text-xs text-slate-600">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Readiness Checklist:
              </h4>
              <div className={`flex items-center gap-2 ${readiness?.enrollment.status === 'enrolled' ? 'text-emerald-700' : 'text-slate-400'}`}>
                {readiness?.enrollment.status === 'enrolled' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">○</span>
                )}
                <span>{readiness?.enrollment.message || `Student Enrolled in ${selectedCourse?.title}`}</span>
              </div>
              
              <div className={`flex items-center gap-2 ${readiness?.materials.status === 'processed' ? 'text-emerald-700' : 'text-slate-400'}`}>
                {readiness?.materials.status === 'processed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">○</span>
                )}
                <span>Learning Materials: {readiness?.materials.message || 'Checking...'} ({readiness?.materials.count || 0} found)</span>
              </div>

              <div className={`flex items-center gap-2 ${readiness?.concepts.status === 'approved' ? 'text-emerald-700' : 'text-slate-400'}`}>
                {readiness?.concepts.status === 'approved' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">○</span>
                )}
                <span>Concepts: {readiness?.concepts.message || 'Checking...'} ({readiness?.concepts.approvedCount || 0} approved)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0">
            {/* LEFT PANEL — LEARNING SETUP */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-white rounded-3xl p-5 border border-[#DCCBFF]/40 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <BookOpen className="w-5 h-5 text-[#6842FF]" />
                  <h3 className="text-sm font-bold text-slate-900">Learning Setup</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Current Topic
                    </label>
                    <div className="relative">
                      <select
                        value={selectedConceptId}
                        onChange={(e) => setSelectedConceptId(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold py-3 pl-3 pr-8 rounded-xl hover:border-[#6842FF]/30 focus:outline-none focus:ring-2 focus:ring-[#6842FF] cursor-pointer transition-all"
                      >
                        {concepts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Explanation Level
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'beginner', label: 'Beginner', desc: 'Simple analogies' },
                        { id: 'intermediate', label: 'Intermediate', desc: 'Standard details' },
                        { id: 'advanced', label: 'Advanced', desc: 'Deep technical dive' }
                      ].map(level => (
                        <button
                          key={level.id}
                          onClick={() => setExplanationLevel(level.id)}
                          className={`text-left p-3 rounded-xl border text-sm transition-all ${
                            explanationLevel === level.id 
                            ? 'bg-[#6842FF]/5 border-[#6842FF] text-[#6842FF] ring-1 ring-[#6842FF]/20' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-[#6842FF]/40'
                          }`}
                        >
                          <div className="font-semibold">{level.label}</div>
                          <div className={`text-[10px] mt-0.5 ${explanationLevel === level.id ? 'text-[#6842FF]/80' : 'text-slate-400'}`}>
                            {level.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#DCCBFF]/40 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Sparkles className="w-5 h-5 text-[#6842FF]" />
                  <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
                </div>
                <div className="space-y-2">
                  {QUICK_ACTIONS.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskQuestion(action.label)}
                      disabled={isExplaining || !selectedConceptId}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium hover:bg-[#6842FF]/5 hover:text-[#6842FF] hover:border-[#6842FF]/30 transition-all disabled:opacity-50"
                    >
                      <action.icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER PANEL — AI CONVERSATION */}
            <div className="lg:col-span-6 flex flex-col bg-white rounded-[32px] border border-[#DCCBFF]/60 shadow-xl shadow-[#6842FF]/5 overflow-hidden relative h-full">
              {/* Chat Header */}
              <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 absolute top-0 w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6842FF] to-[#5135F5] flex items-center justify-center shadow-md">
                    <BrainCircuit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Agnes AI</h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active & Ready
                    </div>
                  </div>
                </div>
                {selectedConceptId && (
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                    <BookMarked className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 max-w-[150px] truncate">
                      {concepts.find(c => c.id === selectedConceptId)?.name || 'Topic'}
                    </span>
                  </div>
                )}
              </div>

              {/* Chat History */}
              <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 pt-24 pb-32 space-y-6 custom-scrollbar bg-gradient-to-b from-white to-slate-50/50"
              >
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-4">
                    <div className="w-16 h-16 rounded-3xl bg-[#6842FF]/10 text-[#6842FF] flex items-center justify-center">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">How can I help you learn?</h3>
                    <p className="text-sm text-slate-500 max-w-sm">
                      Select a topic on the left and ask me any question. My answers will be grounded directly in your teacher's uploaded PDFs.
                    </p>
                  </div>
                ) : (
                  chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'user' ? (
                        <div className="max-w-[85%] bg-gradient-to-br from-[#6842FF] to-[#5135F5] text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md">
                          <p className="text-sm font-medium">{msg.content}</p>
                        </div>
                      ) : (
                        <div className="max-w-[95%] bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
                          {msg.isOutOfScope ? (
                            <div className="p-5 space-y-3 bg-amber-50/50">
                              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                {msg.explanationData?.summary}
                              </h4>
                              <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">
                                {msg.explanationData?.explanation}
                              </p>
                            </div>
                          ) : msg.explanationData ? (
                            <div className="divide-y divide-slate-100">
                              {/* Main Explanation */}
                              <div className="p-5 space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <BrainCircuit className="w-4 h-4 text-[#6842FF]" />
                                  {msg.explanationData.summary}
                                </h4>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                  {msg.explanationData.explanation}
                                </p>
                              </div>

                              {/* Step by step */}
                              {msg.explanationData.stepByStep && msg.explanationData.stepByStep.length > 0 && (
                                <div className="p-5 bg-slate-50/50 space-y-3">
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Step-by-Step Breakdown</h5>
                                  <ol className="space-y-3 list-decimal list-inside text-sm text-slate-700">
                                    {msg.explanationData.stepByStep.map((step, idx) => (
                                      <li key={idx} className="pl-2 leading-relaxed">
                                        <span className="ml-1">{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {/* Example */}
                              {msg.explanationData.example && (
                                <div className="p-5 space-y-3">
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#6842FF]">Real-world Example</h5>
                                  <div className="bg-[#6842FF]/5 p-4 rounded-xl border border-[#6842FF]/10 text-sm text-slate-700">
                                    {msg.explanationData.example}
                                  </div>
                                </div>
                              )}

                              {/* Key Takeaways */}
                              {msg.explanationData.keyTakeaways && msg.explanationData.keyTakeaways.length > 0 && (
                                <div className="p-5 space-y-3">
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Takeaways</h5>
                                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {msg.explanationData.keyTakeaways.map((item, idx) => (
                                      <li key={idx} className="flex items-start gap-2 bg-white border border-slate-100 p-3 rounded-lg shadow-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-xs text-slate-600">{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Sources */}
                              {msg.explanationData.sourceReferences && msg.explanationData.sourceReferences.length > 0 && (
                                <div className="p-4 bg-slate-50 border-t border-slate-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                      Grounded Sources
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {msg.explanationData.sourceReferences.map((ref, idx) => (
                                      <div key={idx} className="inline-flex flex-col bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] shadow-xs">
                                        <span className="font-bold text-slate-700">{ref.materialTitle || "Document"}</span>
                                        <span className="text-slate-500">Page {ref.pageNumber || 'N/A'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 text-sm text-red-600">Failed to load response data.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                
                {isExplaining && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#6842FF] animate-spin" />
                      <span className="text-sm font-medium text-slate-600">Retrieving sources and analyzing...</span>
                    </div>
                  </div>
                )}
                
                {errorMessage && (
                  <div className="flex justify-center">
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-medium shadow-sm max-w-sm text-center">
                      {errorMessage}
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {showScrollButton && (
                <button
                  onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-10 h-10 bg-white border border-slate-200 text-[#6842FF] flex items-center justify-center rounded-full shadow-md hover:bg-slate-50 hover:-translate-y-0.5 transition-all animate-in fade-in slide-in-from-bottom-4"
                  title="Scroll to bottom"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              )}

              {/* Chat Input */}
              <div className="absolute bottom-0 w-full p-4 bg-white/90 backdrop-blur-md border-t border-slate-100">
                <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-inner focus-within:ring-2 focus-within:ring-[#6842FF]/50 focus-within:border-[#6842FF] transition-all">
                  <textarea
                    value={studentQuestion}
                    onChange={(e) => setStudentQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAskQuestion();
                      }
                    }}
                    placeholder="Ask a question about the topic..."
                    className="w-full max-h-32 min-h-[44px] bg-transparent border-none text-slate-800 text-sm font-medium p-3 resize-none focus:outline-none custom-scrollbar"
                    rows={1}
                  />
                  <button
                    onClick={() => handleAskQuestion()}
                    disabled={isExplaining || !studentQuestion.trim()}
                    className="w-11 h-11 shrink-0 bg-[#6842FF] hover:bg-[#5135F5] text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:hover:bg-[#6842FF] transition-colors shadow-md"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL — COURSE MATERIALS & STATS */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full overflow-y-auto pl-2 custom-scrollbar">
              <div className="bg-white rounded-3xl p-5 border border-[#DCCBFF]/40 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#6842FF]" />
                    <h3 className="text-sm font-bold text-slate-900">Course Materials</h3>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {materials.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {materials.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">No materials uploaded yet.</p>
                  ) : (
                    materials.slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#6842FF]/30 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-[#6842FF]/10 text-[#6842FF] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate">{m.title}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{m.type.toUpperCase()} • {Math.round(m.fileSize / 1024)} KB</p>
                        </div>
                      </div>
                    ))
                  )}
                  {materials.length > 5 && (
                    <button className="w-full text-xs font-semibold text-[#6842FF] hover:text-[#5135F5] py-2">
                      View all materials →
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#6842FF] to-[#5135F5] rounded-3xl p-5 shadow-lg shadow-[#6842FF]/20 text-white space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-white/90" />
                    <h3 className="text-sm font-bold">Learning Progress</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-white/80">Concepts Mastered</span>
                        <span>{readiness?.concepts?.approvedCount || 0}/{concepts.length}</span>
                      </div>
                      <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                          style={{ width: `${concepts.length > 0 ? ((readiness?.concepts?.approvedCount || 0) / concepts.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 border border-white/10">
                      <Award className="w-8 h-8 text-amber-300 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Keep going!</p>
                        <p className="text-[10px] text-white/70 mt-0.5">You're making great progress in {selectedCourse?.title}.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}} />
    </div>
  );
}