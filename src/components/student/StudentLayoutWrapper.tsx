"use client";

import { usePathname } from "next/navigation";

export function StudentLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTutor = pathname.startsWith("/student/ai-tutor");
  
  return (
    <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out h-[100dvh] ${isTutor ? "overflow-hidden" : "overflow-y-auto"}`}>
      <main className={`flex-1 w-full mx-auto transition-all duration-300 ease-in-out ${
        isTutor 
          ? "max-w-none p-0 h-full" 
          : "max-w-6xl p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 h-auto"
      }`}>
        {children}
      </main>
    </div>
  );
}
