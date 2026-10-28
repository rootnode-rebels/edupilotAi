"use client";

import { useState, useEffect } from "react";
import {
  Users,
  AlertTriangle,
  BrainCircuit,
  BarChart3,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { StudentGapSummary, AIRecommendation } from "@/types";

interface TeacherAdaptiveInsightsProps {
  courseId: string;
}

export function TeacherAdaptiveInsights({ courseId }: TeacherAdaptiveInsightsProps) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<{
    totalEnrolled: number;
    studentsWithAttempts: number;
    studentsNeedingDiagnostic: number;
    studentSummaries: StudentGapSummary[];
    conceptDifficulties: Array<{
      conceptId: string;
      conceptName: string;
      accuracy: number;
      failureRate: number;
      totalQuestions: number;
      correctAnswers: number;
      strugglingStudentCount: number;
      evaluatedStudentCount: number;
    }>;
    recommendations: AIRecommendation[];
  } | null>(null);

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchInsights() {
      if (!courseId) return;
      if (authLoading) return;
      if (!user?.uid) {
        setLoading(false);
        setError("Please sign in as a teacher to view course adaptive insights.");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/learning/teacher-insights?courseId=${courseId}&userId=${user.uid}`, {
          headers: {
            "x-user-id": user.uid,
          },
        });

        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          throw new Error(data.error || "Failed to load adaptive insights.");
        }

        setInsights(data.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load insights.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchInsights();

    return () => {
      ignore = true;
    };
  }, [courseId, user?.uid, authLoading]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
        </div>
        <div className="h-64 bg-white rounded-3xl border border-slate-200" />
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="bg-white rounded-3xl border border-red-200 p-8 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
        <h4 className="text-base font-bold text-slate-800">Unable to Load Adaptive Insights</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  const {
    totalEnrolled,
    studentsWithAttempts,
    studentsNeedingDiagnostic,
    studentSummaries,
    conceptDifficulties,
  } = insights;

  const strugglingStudentsCount = studentSummaries.filter((s) => s.activeGapCount > 0).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ─── Metric Overview Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Enrolled */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Enrolled Students
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
              {totalEnrolled}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {studentsWithAttempts} evaluated
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Learning Gaps */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Gaps Diagnosed
            </span>
            <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
              {strugglingStudentsCount}
            </span>
            <span className="text-[11px] text-amber-700/80 mt-0.5 block">
              Students needing intervention
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Needing Baseline Assessment */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Needs Baseline
            </span>
            <span className="text-2xl font-extrabold text-slate-700 mt-1 block">
              {studentsNeedingDiagnostic}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              0 assessment attempts
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Evaluated Mastery */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Evidence Engine
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
              Active
            </span>
            <span className="text-[11px] text-emerald-700/80 mt-0.5 block">
              100% Deterministic Code
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <BrainCircuit className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── Concept Struggle & Bottleneck Analysis ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Class Concept Difficulty &amp; Bottlenecks
            </h3>
          </div>
          <span className="text-xs text-slate-400">Ranked by failure rate</span>
        </div>

        {conceptDifficulties.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No quiz data yet. Topics will appear here when students complete assessments.
          </div>
        ) : (
          <div className="space-y-10">
            {/* Horizontal Bar Chart for Topic Accuracy */}
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-6">Topic Accuracy Overview</h4>
              <div className="space-y-4">
                {conceptDifficulties.map(item => (
                  <div key={`chart-${item.conceptId}`} className="group relative flex items-center gap-4">
                    <div className="w-1/3 text-right text-xs font-semibold text-slate-800 truncate pr-2">
                      {item.conceptName}
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden flex">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${item.accuracy}%` }}
                      />
                      <div 
                        className="h-full bg-rose-400 transition-all duration-500" 
                        style={{ width: `${item.failureRate}%` }}
                      />
                    </div>
                    <div className="w-12 text-xs font-mono text-slate-500">
                      {item.accuracy}%
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg border border-slate-700">
                      <div className="font-bold mb-1 truncate">{item.conceptName}</div>
                      <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
                        <span className="text-slate-300">Accuracy:</span>
                        <span className="font-mono text-emerald-400">{item.accuracy}%</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
                        <span className="text-slate-300">Failure Rate:</span>
                        <span className="font-mono text-rose-400">{item.failureRate}%</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
                        <span className="text-slate-300">Correct / Graded:</span>
                        <span className="font-mono">{item.correctAnswers} / {item.totalQuestions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Sample Size:</span>
                        <span className="font-mono">{item.evaluatedStudentCount} students</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-8">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" /> Accuracy (Correct)
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-rose-400" /> Failure Rate (Incorrect)
                </div>
              </div>
            </div>

            {/* Ranked Difficulty List */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 border-t border-slate-100 pt-6">Ranked Difficulty List</h4>
              <div className="space-y-3">
                {conceptDifficulties.map((item) => (
                  <div
                    key={item.conceptId}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.conceptName}</span>
                        {item.failureRate >= 60 ? (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Needs Attention
                          </span>
                        ) : item.failureRate >= 30 ? (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Moderate
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Performing Well
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-700">
                          {item.strugglingStudentCount} / {item.evaluatedStudentCount} struggling
                        </span>
                        <span className="text-xs text-slate-400 font-mono ml-2">
                          ({item.failureRate}% failure)
                        </span>
                      </div>
                    </div>

                    {/* Accuracy Visual Bar */}
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.accuracy < 40
                            ? "bg-rose-500"
                            : item.accuracy < 70
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Enrolled Students Gap Roster ──────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Student Adaptive Mastery Roster ({studentSummaries.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Inspect concept-level evidence</span>
        </div>

        {studentSummaries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No students enrolled in this course yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {studentSummaries.map((student) => (
              <div key={student.studentId} className="py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-50 to-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                      {student.studentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {student.studentName}
                        </span>
                        {student.needsDiagnostic ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                            Unassessed
                          </span>
                        ) : student.activeGapCount > 0 || student.predictedGapCount > 0 ? (
                          <div className="flex gap-1">
                            {student.activeGapCount > 0 && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                {student.activeGapCount} {student.activeGapCount === 1 ? "Gap" : "Gaps"}
                              </span>
                            )}
                            {student.predictedGapCount > 0 && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                {student.predictedGapCount} Predicted
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                            On Track
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 capitalize">
                          Confidence: {student.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{student.studentEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-base font-extrabold text-slate-900 font-mono">
                        {student.needsDiagnostic ? "—" : `${student.overallMastery}%`}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Mastery Score</span>
                    </div>

                    {(student.strugglingConcepts.length > 0 || student.predictedConcepts?.length > 0) && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStudentId(
                            expandedStudentId === student.studentId ? null : student.studentId
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
                      >
                        <span>{expandedStudentId === student.studentId ? "Hide" : "Inspect"}</span>
                        {expandedStudentId === student.studentId ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Struggling Concepts Evidence */}
                {expandedStudentId === student.studentId && (
                  <div className="space-y-3 mt-3 animate-in fade-in duration-150">
                    {student.strugglingConcepts.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                          Specific Concept Difficulties &amp; Evidence:
                        </span>
                        <div className="space-y-2">
                          {student.strugglingConcepts.map((sc) => (
                            <div key={sc.conceptId} className="bg-white/90 p-3 rounded-xl border border-amber-200/80 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{sc.conceptName}</span>
                                <span className="font-mono text-amber-700 font-semibold">{sc.score}%</span>
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[11px]">
                                {sc.evidence.map((ev, i) => (
                                  <li key={i}>{ev}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {student.predictedConcepts?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-900 block">
                          Predicted Upcoming Difficulties (Early Warning):
                        </span>
                        <div className="space-y-2">
                          {student.predictedConcepts.map((pc) => (
                            <div key={pc.conceptId} className="bg-white/90 p-3 rounded-xl border border-purple-200/80 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{pc.conceptName}</span>
                                <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold uppercase">
                                  {pc.riskLevel} Risk
                                </span>
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[11px]">
                                {pc.evidence.map((ev, i) => (
                                  <li key={i}>{ev}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
