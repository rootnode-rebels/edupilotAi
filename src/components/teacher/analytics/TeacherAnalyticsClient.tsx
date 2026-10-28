"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, TrendingUp, BarChart3, Grid, Users, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { courseService } from "@/services/courses/courseService";
import type { Course } from "@/types";

interface TeacherAnalyticsClientProps {
  courseId: string;
}

export function TeacherAnalyticsClient({ courseId }: TeacherAnalyticsClientProps) {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"trends" | "topics" | "heatmap" | "attention">("trends");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchAnalytics() {
      if (!courseId || authLoading) return;
      if (!user?.uid) {
        setError("Please sign in as a teacher.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const courseRes = await courseService.getCourseById(courseId);
        if (!courseRes.success || !courseRes.data) throw new Error("Course not found");
        if (courseRes.data.teacherId !== user.uid) {
          setIsAccessDenied(true);
          return;
        }
        setCourse(courseRes.data);

        const res = await fetch(`/api/learning/teacher-analytics?courseId=${courseId}&userId=${user.uid}`, {
          headers: { "x-user-id": user.uid },
        });
        const json = await res.json();
        if (ignore) return;
        if (!res.ok) throw new Error(json.error || "Failed to load analytics");
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchAnalytics();
    return () => { ignore = true; };
  }, [courseId, user?.uid, authLoading]);

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-sm text-gray-500 mt-2">
              You do not have permission to view analytics for this course.
            </p>
            <div className="mt-6">
              <Link href="/teacher/courses" className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700">
                Back to Courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav courseId={course.id} courseTitle={course.title} />
        <CourseWorkspaceNav course={course} />
        <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 w-full pt-8">
          <div className="bg-white rounded-3xl border border-red-200 p-8 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">Unable to Load Analytics</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Retry</button>
          </div>
        </main>
      </div>
    );
  }

  const { performanceTrends, topicPerformance, heatmapData, studentsRequiringAttention } = data;

  const tabs = [
    { id: "trends", label: "Performance Trends", icon: TrendingUp },
    { id: "topics", label: "Topic Performance", icon: BarChart3 },
    { id: "heatmap", label: "Mastery Heatmap", icon: Grid },
    { id: "attention", label: "Requiring Attention", icon: AlertCircle },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav courseId={course.id} courseTitle={course.title} />
      <CourseWorkspaceNav course={course} />
      <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 w-full pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Advanced Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deep, evidence-based insights derived directly from student assessments and interactions.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs">
        
        {/* --- TAB 1: TRENDS --- */}
        {activeTab === "trends" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Student Performance Trends</h3>
              <p className="text-xs text-slate-500 mt-1">Class average scores across completed assessments over time.</p>
            </div>
            
            {performanceTrends.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No completed assessments found to generate trends.
              </div>
            ) : (
              <div className="pt-8 h-80 flex items-end gap-4">
                {performanceTrends.map((pt: any, i: number) => (
                  <div key={pt.assessmentId} className="flex-1 flex flex-col items-center group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs rounded-lg p-3 whitespace-nowrap pointer-events-none z-10 shadow-lg">
                      <div className="font-bold mb-1">{pt.assessmentTitle}</div>
                      <div>Average Score: <span className="font-mono text-emerald-400">{pt.averageScore}%</span></div>
                      <div>Participants: <span className="font-mono">{pt.participantCount}</span></div>
                    </div>
                    
                    {/* Bar */}
                    <div className="w-full bg-slate-100 rounded-t-md relative flex items-end justify-center h-[200px]">
                      <div 
                        className="w-full bg-indigo-500 rounded-t-md transition-all duration-1000"
                        style={{ height: `${pt.averageScore}%` }}
                      />
                      <span className="absolute bottom-2 text-white font-bold text-xs font-mono drop-shadow-md">
                        {pt.averageScore}%
                      </span>
                    </div>
                    {/* Label */}
                    <div className="mt-3 text-[10px] font-semibold text-slate-600 text-center uppercase tracking-wider truncate w-full px-1">
                      {pt.assessmentTitle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: TOPICS --- */}
        {activeTab === "topics" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Topic-wise Performance</h3>
              <p className="text-xs text-slate-500 mt-1">Aggregate accuracy across all course assessments.</p>
            </div>

            {topicPerformance.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No topic performance data yet. Analytics will appear after students complete assessments.
              </div>
            ) : (
            <div className="space-y-4 pt-4">
                {topicPerformance.map((item: any) => (
                  <div key={item.conceptId} className="group relative flex items-center gap-4">
                    <div className="w-1/3 text-right text-xs font-semibold text-slate-800 truncate pr-2" title={item.conceptName}>
                      {item.conceptName}
                    </div>
                    {item.totalQuestions === 0 ? (
                      <div className="flex-1 h-6 bg-slate-100 rounded-md flex items-center px-3">
                        <span className="text-[10px] text-slate-400 italic">No assessment data yet</span>
                      </div>
                    ) : (
                      <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden flex">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${item.accuracy}%` }} />
                        <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${100 - item.accuracy}%` }} />
                      </div>
                    )}
                    <div className="w-12 text-xs font-mono text-slate-500">
                      {item.totalQuestions > 0 ? `${item.accuracy}%` : '—'}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      <div className="font-bold mb-1 truncate">{item.conceptName}</div>
                      {item.totalQuestions === 0 ? (
                        <div className="text-slate-400 italic">No graded answers for this topic yet.</div>
                      ) : (
                        <>
                          <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
                            <span className="text-slate-300">Accuracy:</span>
                            <span className="font-mono text-emerald-400">{item.accuracy}%</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
                            <span className="text-slate-300">Failure Rate:</span>
                            <span className="font-mono text-rose-400">{100 - item.accuracy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Correct / Graded:</span>
                            <span className="font-mono">{item.correctAnswers} / {item.totalQuestions}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: HEATMAP --- */}
        {activeTab === "heatmap" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Student-Topic Mastery Heatmap</h3>
                <p className="text-xs text-slate-500 mt-1">Cross-reference individual student mastery across all evaluated topics.</p>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500"></div> Mastered (&ge;80%)</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400"></div> Developing (50-79%)</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-500"></div> Needs Support (&lt;50%)</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-200"></div> Insufficient Data</div>
              </div>
            </div>

            {heatmapData.length === 0 || topicPerformance.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Insufficient data to generate heatmap.
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 text-left bg-slate-50 border-b border-r border-slate-200 sticky left-0 z-20 min-w-[150px]">
                        <span className="text-xs font-bold text-slate-700 uppercase">Student</span>
                      </th>
                      {topicPerformance.map((topic: any) => (
                        <th key={topic.conceptId} className="p-3 text-center bg-slate-50 border-b border-slate-200 min-w-[120px]">
                          <span className="text-[10px] font-bold text-slate-600 line-clamp-2" title={topic.conceptName}>
                            {topic.conceptName}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((student: any) => (
                      <tr key={student.studentId} className="group">
                        <td className="p-3 text-left border-b border-r border-slate-100 sticky left-0 z-10 bg-white group-hover:bg-slate-50 font-semibold text-xs text-slate-800">
                          {student.studentName}
                        </td>
                        {topicPerformance.map((topic: any) => {
                          const mastery = student.topicMasteries.find((m: any) => m.conceptId === topic.conceptId);
                          const status = mastery ? mastery.status : 'insufficient_data';
                          
                          let bgClass = "bg-slate-100/50";
                          if (status === 'mastered') bgClass = "bg-emerald-500 text-white";
                          else if (status === 'developing') bgClass = "bg-amber-400 text-white";
                          else if (status === 'needs_support') bgClass = "bg-rose-500 text-white";

                          return (
                            <td key={topic.conceptId} className="p-1 border-b border-slate-100 text-center">
                              <div className={`w-full h-10 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all relative group/cell cursor-help ${bgClass}`}>
                                {status !== 'insufficient_data' ? `${mastery.accuracy}%` : '-'}
                                
                                {/* Cell Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl border border-slate-700">
                                  <div className="font-bold border-b border-slate-700 pb-1 mb-1">{student.studentName}</div>
                                  <div className="text-[10px] text-slate-300 mb-2 truncate">{topic.conceptName}</div>
                                  {status !== 'insufficient_data' ? (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Accuracy:</span>
                                        <span className="font-mono">{mastery.accuracy}%</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Score:</span>
                                        <span className="font-mono">{mastery.correct} / {mastery.total}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-slate-400 italic">No questions answered for this topic yet.</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: ATTENTION --- */}
        {activeTab === "attention" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Students Requiring Attention</h3>
              <p className="text-xs text-slate-500 mt-1">Evidence-based list of students who may benefit from additional support based on empirical assessment data.</p>
            </div>

            {studentsRequiringAttention.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No students currently flagged for attention. Everyone is on track!
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {studentsRequiringAttention.map((student: any) => (
                  <div key={student.studentId} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-6">
                    {/* Student Info */}
                    <div className="md:w-1/4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          {student.studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{student.studentName}</div>
                          <div className="text-xs text-slate-500 font-mono">ID: {student.studentId.slice(0, 8)}</div>
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Overall Accuracy</div>
                        <div className={`text-2xl font-black font-mono ${student.overallAccuracy < 50 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {student.overallAccuracy}%
                        </div>
                        <div className="text-[10px] text-slate-400">Across {student.totalAttempts} assessments</div>
                      </div>
                    </div>

                    {/* Evidence & Weak Topics */}
                    <div className="md:w-3/4 space-y-4 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                      
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Evidence for Flag</div>
                        <ul className="space-y-1">
                          {student.reasons.map((r: string, idx: number) => (
                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {student.weakTopics.length > 0 && (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Priority Focus Topics</div>
                          <div className="flex flex-wrap gap-2">
                            {student.weakTopics.map((wt: any) => (
                              <span key={wt.conceptId} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                {wt.conceptName} 
                                <span className="font-mono text-slate-400">({wt.accuracy}%)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex gap-3">
                        <button className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors">
                          Send Message
                        </button>
                        <button className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition-colors">
                          Assign Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      </main>
    </div>
  );
}
