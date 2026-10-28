"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { courseService } from "@/services/courses/courseService";
import type { Course, MockTestSchedule } from "@/types";
import { CalendarDays, Plus, Clock, Search, AlertCircle } from "lucide-react";

export default function MockTestsPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [schedules, setSchedules] = useState<MockTestSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      if (!user?.uid) return;
      try {
        const coursesRes = await courseService.listTeacherCourses(user.uid, 50);
        if (coursesRes.success) {
          setCourses(coursesRes.data);
          if (coursesRes.data.length > 0) {
            setSelectedCourseId(coursesRes.data[0].id);
          }
        }
      } catch (err: any) {
        setError("Failed to load courses");
      }
    }
    loadCourses();
  }, [user?.uid]);

  useEffect(() => {
    async function loadSchedules() {
      if (!selectedCourseId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/courses/${selectedCourseId}/mock-tests`, {
          headers: {
            "x-user-id": user?.uid || "",
          },
        });
        const data = await res.json();
        if (data.success) {
          setSchedules(data.data);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError("Failed to load mock tests");
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, [selectedCourseId, user?.uid]);

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Approved</span>;
      case 'pending_approval':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Pending Approval</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 capitalize">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans">
      <TeacherNav />
      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-indigo-600" />
              Mock Test Schedules
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Schedule and manage mock tests for your courses.
            </p>
          </div>
          {selectedCourseId && (
            <Link
              href={`/teacher/mock-tests/new?courseId=${selectedCourseId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Mock Test</span>
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-800 text-sm flex items-start gap-3 border border-rose-200/80">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Select Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full sm:w-1/3 block rounded-lg border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 shadow-xs"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading schedules...</div>
            ) : schedules.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">No Mock Tests Scheduled</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Get started by scheduling a mock test for your students. Ensure there is a 3-day gap between tests.
                </p>
                <div className="mt-6">
                  {selectedCourseId && (
                    <Link
                      href={`/teacher/mock-tests/new?courseId=${selectedCourseId}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 text-sm font-semibold border border-indigo-200 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Schedule</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              schedules.map((schedule) => (
                <div key={schedule.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-bold text-slate-900">{schedule.title}</h3>
                      <StatusBadge status={schedule.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        <span>{schedule.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{schedule.startTime} ({schedule.durationMinutes} min)</span>
                      </div>
                    </div>
                    {schedule.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-1">{schedule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/teacher/mock-tests/${schedule.id}?courseId=${selectedCourseId}`}
                      className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
