"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { ArrowLeft, Save, Send, AlertCircle, CalendarDays, Clock, FileText } from "lucide-react";
import Link from "next/link";

export default function NewMockTestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledDate: "",
    startTime: "09:00",
    durationMinutes: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    topics: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      router.replace("/teacher/mock-tests");
    }
  }, [courseId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'pending_approval') => {
    e.preventDefault();
    if (!courseId) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        durationMinutes: Number(formData.durationMinutes),
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        status,
      };

      const res = await fetch(`/api/courses/${courseId}/mock-tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to schedule mock test");
      }

      router.push("/teacher/mock-tests");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans">
      <TeacherNav />
      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 py-8 w-full">
        <div className="mb-6">
          <Link
            href="/teacher/mock-tests"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Mock Tests</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Schedule Mock Test
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create a new mock test. You can save it as a draft or submit it for approval.
            Ensure at least a 3-day gap between test dates.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-800 text-sm flex items-start gap-3 border border-rose-200/80">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Unable to schedule</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <form className="p-6 sm:p-8 space-y-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900">
                  Test Title <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. Midterm Mock Exam - Algebra"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900">
                  Description / Syllabus
                </label>
                <div className="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Brief description of the test and topics covered..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-semibold text-slate-900">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-2 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="date"
                      id="scheduledDate"
                      name="scheduledDate"
                      required
                      value={formData.scheduledDate}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">Must have 3-day gap from other tests.</p>
                </div>

                <div>
                  <label htmlFor="startTime" className="block text-sm font-semibold text-slate-900">
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-2 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      required
                      value={formData.startTime}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="durationMinutes" className="block text-sm font-semibold text-slate-900">
                    Duration (Minutes) <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-2">
                    <input
                      type="number"
                      id="durationMinutes"
                      name="durationMinutes"
                      min="1"
                      required
                      value={formData.durationMinutes}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="topics" className="block text-sm font-semibold text-slate-900">
                    Topics (comma-separated)
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      id="topics"
                      name="topics"
                      value={formData.topics}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. Chapter 1, Newton's Laws"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleSubmit(e, 'draft')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4 text-slate-500" />
                Save as Draft
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleSubmit(e, 'pending_approval')}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
