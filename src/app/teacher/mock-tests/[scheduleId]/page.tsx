"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { ArrowLeft, Save, Send, AlertCircle, CalendarDays, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import type { MockTestSchedule } from "@/types";

export default function EditMockTestPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [schedule, setSchedule] = useState<MockTestSchedule | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledDate: "",
    startTime: "",
    durationMinutes: 60,
    timezone: "",
    topics: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      router.replace("/teacher/mock-tests");
      return;
    }

    async function loadSchedule() {
      try {
        const res = await fetch(`/api/courses/${courseId}/mock-tests/${scheduleId}`, {
          headers: { "x-user-id": user?.uid || "" },
        });
        const data = await res.json();
        if (data.success) {
          const s = data.data as MockTestSchedule;
          setSchedule(s);
          setFormData({
            title: s.title,
            description: s.description || "",
            scheduledDate: s.scheduledDate,
            startTime: s.startTime,
            durationMinutes: s.durationMinutes,
            timezone: s.timezone,
            topics: s.topics.join(", "),
          });
        } else {
          setError(data.error || "Failed to load schedule");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [scheduleId, courseId, user?.uid, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (newStatus?: 'pending_approval' | 'draft') => {
    if (!courseId) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        durationMinutes: Number(formData.durationMinutes),
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        ...(newStatus ? { status: newStatus } : {}),
      };

      const res = await fetch(`/api/courses/${courseId}/mock-tests/${scheduleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update mock test");
      }

      router.push("/teacher/mock-tests");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!courseId) return;
    if (!confirm("Are you sure you want to cancel this mock test? This cannot be undone.")) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/mock-tests/${scheduleId}`, {
        method: "DELETE",
        headers: { "x-user-id": user?.uid || "" },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to cancel mock test");
      router.push("/teacher/mock-tests");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TeacherNav />
        <div className="flex-1 flex justify-center items-center">Loading...</div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TeacherNav />
        <div className="flex-1 p-8 text-center text-rose-600">{error || "Not found"}</div>
      </div>
    );
  }

  const isEditable = schedule.status === 'draft' || schedule.status === 'rejected' || schedule.status === 'approved' || schedule.status === 'pending_approval';

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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Edit Schedule: {schedule.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Current Status: <strong className="uppercase">{schedule.status}</strong>
            </p>
          </div>
          {schedule.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-2 text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Cancel Test
            </button>
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

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 space-y-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900">
                  Test Title
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    disabled={!isEditable}
                    value={formData.title}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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
                    disabled={!isEditable}
                    value={formData.description}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-semibold text-slate-900">
                    Date
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
                      disabled={!isEditable}
                      value={formData.scheduledDate}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="startTime" className="block text-sm font-semibold text-slate-900">
                    Start Time
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
                      disabled={!isEditable}
                      value={formData.startTime}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="durationMinutes" className="block text-sm font-semibold text-slate-900">
                    Duration (Minutes)
                  </label>
                  <div className="mt-2">
                    <input
                      type="number"
                      id="durationMinutes"
                      name="durationMinutes"
                      min="1"
                      required
                      disabled={!isEditable}
                      value={formData.durationMinutes}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={!isEditable}
                      value={formData.topics}
                      onChange={handleChange}
                      className="block w-full rounded-xl border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {isEditable && (
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleUpdate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  Save Changes
                </button>

                {(schedule.status === 'draft' || schedule.status === 'rejected') && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleUpdate('pending_approval')}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Resubmit for Approval
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
