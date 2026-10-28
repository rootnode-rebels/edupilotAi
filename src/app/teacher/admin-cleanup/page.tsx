"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, writeBatch, doc, query, where } from "firebase/firestore";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import type { Course } from "@/types";

const INVALID_NAMES_LOWER = [
  'edupilot ai', 'demo workflow', 'demo course', 'sample topic',
  'test concept', 'untitled topic', 'duplicate'
];

export default function AdminCleanupPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<{ total: number; marked: number } | null>(null);

  useEffect(() => {
    async function loadCourses() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        const res = await courseService.listTeacherCourses(user.uid, 50);
        if (res.success && res.data) {
          setCourses(res.data);
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, [user?.uid]);

  const runCleanup = async () => {
    if (!user?.uid || courses.length === 0) return;
    
    setCleaning(true);
    setLogs(["Starting Concept Cleanup for your courses..."]);
    setSummary(null);
    
    try {
      let total = 0;
      let toMark = 0;
      const updates: any[] = [];

      for (const course of courses) {
        setLogs(prev => [...prev, `Checking concepts for course: ${course.title} (${course.id})`]);
        
        // Fetch all concepts for this course, including archived ones just in case
        const q = query(collection(db, 'concepts'), where('courseId', '==', course.id));
        const snapshot = await getDocs(q);
        
        const courseConcepts = new Set<string>(); // Keep track of seen lowercase names
        
        snapshot.forEach(docSnap => {
          total++;
          const data = docSnap.data();
          const name = (data.name || '').trim();
          const nameLower = name.toLowerCase().replace(/\s+/g, ' ');
          
          let invalid = false;
          
          // 1. Check for empty or invalid names
          if (!name) {
            invalid = true;
          } else if (INVALID_NAMES_LOWER.some(invalidName => nameLower.includes(invalidName))) {
            invalid = true;
          }
          
          // 2. Check for duplicates within the same course
          if (!invalid) {
            if (courseConcepts.has(nameLower)) {
              invalid = true;
              setLogs(prev => [...prev, `[DUPLICATE] Concept ID: ${docSnap.id} | Name: "${name}"`]);
            } else {
              courseConcepts.add(nameLower);
            }
          }
          
          // Add to updates if it needs to be marked
          if (invalid && data.status !== 'archived' && data.status !== 'invalid') {
            toMark++;
            if (!courseConcepts.has(nameLower) || !name) {
              setLogs(prev => [...prev, `[INVALID] Concept ID: ${docSnap.id} | Name: "${name}"`]);
            }
            updates.push({ docRef: doc(db, 'concepts', docSnap.id), data });
          }
        });
      }

      setLogs(prev => [...prev, `Found ${toMark} invalid or duplicate concepts out of ${total} total concepts.`]);
      
      if (toMark > 0) {
        setLogs(prev => [...prev, "Applying updates (marking as invalid)..."]);
        
        let batch = writeBatch(db);
        let batchCount = 0;
        
        for (const update of updates) {
          batch.update(update.docRef, { status: 'invalid' });
          batchCount++;
          if (batchCount === 500) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
        
        if (batchCount > 0) {
          await batch.commit();
        }
        setLogs(prev => [...prev, "Updates applied successfully!"]);
      } else {
        setLogs(prev => [...prev, "No concepts needed cleanup."]);
      }
      
      setSummary({ total, marked: toMark });
    } catch (err: any) {
      console.error("Cleanup error:", err);
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <TeacherNav />
      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Cleanup Utilities</h1>
              <p className="text-slate-500 text-sm mt-1">
                Run data hygiene operations on your courses to remove invalid or duplicate placeholder concepts.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading your courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-2">
              <AlertCircle className="w-5 h-5" />
              You do not have any courses to clean up.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700">
                <p>
                  <strong>What this tool does:</strong><br />
                  - Scans all your active courses ({courses.length} found).<br />
                  - Detects concepts with dummy names like "EduPilot AI", "Demo Workflow", "Test Concept".<br />
                  - Detects duplicated concepts (same name in the same course).<br />
                  - Safely marks them as <code className="bg-slate-200 px-1 rounded">invalid</code> so they no longer appear in analytics or AI Tutor, without deleting potentially linked data.
                </p>
              </div>

              <button
                onClick={runCleanup}
                disabled={cleaning}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors"
              >
                {cleaning ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {cleaning ? "Running Cleanup..." : "Run Concept Cleanup"}
              </button>

              {logs.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold text-slate-900 mb-3">Operation Logs:</h3>
                  <div className="bg-slate-900 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1 shadow-inner">
                    {logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {summary && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Cleanup Complete</h4>
                    <p className="text-sm mt-1">
                      Scanned {summary.total} concepts. Marked {summary.marked} as invalid.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
