import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentMobileHeader } from "@/components/student/StudentMobileHeader";
import { StudentMobileNav } from "@/components/student/StudentMobileNav";

import { StudentLayoutWrapper } from "@/components/student/StudentLayoutWrapper";

export const metadata: Metadata = {
  title: "EduPilot AI — Student Learning Experience",
  description: "EduPilot AI Student workspace — personalized learning journeys, adaptive diagnostics, and AI co-pilot.",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col md:flex-row text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
        <StudentSidebar />
        <StudentMobileHeader />
        <StudentLayoutWrapper>
          {children}
        </StudentLayoutWrapper>
        <StudentMobileNav />
      </div>
    </RoleGuard>
  );
}


