"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser, loginWithGoogle, logoutUser } from "@/services/auth/authService";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, createUserProfile } from "@/lib/firebase/firestore";
import { AnimatedAIBackground } from "@/components/auth/AnimatedAIBackground";
import { AuthBranding } from "@/components/auth/AuthBranding";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  GraduationCap,
  Presentation,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRole: "student" | "teacher" =
    searchParams.get("role") === "teacher" ? "teacher" : "student";

  const activeRoleRef = useRef(activeRole);
  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Clear errors when switching roles via browser navigation
  useEffect(() => {
    setError(null);
    setRoleNotice(null);
  }, [activeRole]);

  const { user, profile: authProfile, role, loading } = useAuth();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // If already authenticated and profile loaded, redirect based on real role
  useEffect(() => {
    if (!loading && user && role) {
      if (authProfile?.isActive === false) {
        logoutUser().then(() => {
          setError("Your account has been deactivated. Please contact an administrator.");
        });
        return;
      }

      if (role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  }, [loading, user, role, authProfile, router]);

  if (!loading && user && role && authProfile?.isActive !== false) {
    return null;
  }

  const handleRoleChange = (newRole: "student" | "teacher") => {
    setError(null);
    setRoleNotice(null);
    router.replace(`/login?role=${newRole}`);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setRoleNotice(null);

    const { user: firebaseUser, profile, error: googleError } = await loginWithGoogle();

    if (googleError) {
      setError(googleError);
      setIsGoogleLoading(false);
      return;
    }

    if (firebaseUser) {
      const userProfile = profile || (await getUserProfile(firebaseUser.uid));

      if (!userProfile) {
        await logoutUser();
        setError("Account profile not found. Please contact an administrator.");
        setIsGoogleLoading(false);
        return;
      }

      if (userProfile.isActive === false) {
        await logoutUser();
        setError("Your account has been deactivated. Please contact an administrator.");
        setIsGoogleLoading(false);
        return;
      }

      const trustedRole = userProfile.role;

      // Strict Teacher Portal Boundary for Google OAuth
      if (activeRoleRef.current === "teacher") {
        if (trustedRole !== "teacher") {
          // Immediately revoke session so unauthorized student is signed out
          await logoutUser();
          setIsGoogleLoading(false);
          setError(
            "Access Denied: This Google account is not an authorized teacher account. Student accounts cannot log in through the Teacher Portal."
          );
          return;
        }
        router.push("/teacher/dashboard");
        return;
      }

      // Student Portal Boundary
      if (trustedRole === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    setRoleNotice(null);

    const { user: firebaseUser, error: loginError } = await loginUser(
      data.email,
      data.password
    );

    if (loginError) {
      setError(loginError);
      setIsLoading(false);
      return;
    }

    if (firebaseUser) {
      let profile = await getUserProfile(firebaseUser.uid);

      if (!profile) {
        // Auto-recover missing profiles for email/password users (similar to Google login)
        // This prevents users from being permanently locked out if Firestore creation failed during registration.
        try {
          await createUserProfile(
            firebaseUser.uid,
            firebaseUser.email || '',
            firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            'student'
          );
          profile = await getUserProfile(firebaseUser.uid);
        } catch (recoveryError) {
          console.error("Failed to recover missing profile:", recoveryError);
        }

        if (!profile) {
          await logoutUser();
          setError("Account profile could not be retrieved. Please contact an administrator.");
          setIsLoading(false);
          return;
        }
      }

      if (profile.isActive === false) {
        await logoutUser();
        setError("Your teacher account has been deactivated. Please contact an administrator.");
        setIsLoading(false);
        return;
      }

      const trustedRole = profile.role;

      // Strict Teacher Portal Verification
      if (activeRoleRef.current === "teacher") {
        if (trustedRole !== "teacher") {
          // Immediately revoke session so unauthorized student is signed out
          await logoutUser();
          setIsLoading(false);
          setError(
            "Access Denied: This account is registered as a Student. Student accounts are not permitted to log in through the Teacher Portal."
          );
          return;
        }
        router.push("/teacher/dashboard");
        return;
      }

      // Student Portal Verification
      if (trustedRole === "teacher") {
        router.push("/teacher/dashboard");
      } else if (trustedRole === "student") {
        router.push("/student/dashboard");
      } else {
        await logoutUser();
        router.push("/unauthorized");
      }
    }
  };

  const isTeacher = activeRole === "teacher";

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-purple-500/30 selection:text-purple-900 overflow-hidden">
      <AnimatedAIBackground />

      {/* Main Grid Layout */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
        
        {/* LEFT SECTION - Promotional Text */}
        <div className="hidden lg:block lg:col-span-3 xl:col-span-4 animate-in fade-in slide-in-from-left-8 duration-700 delay-150">
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4 drop-shadow-md">
            Knowledge<br />today.<br />Brighter<br />tomorrow.
          </h2>
          <p className="text-white/80 text-sm xl:text-base font-medium max-w-xs drop-shadow-sm">
            AI-powered learning for curious minds.
          </p>
          <div className="w-12 h-1 bg-white/40 mt-6 rounded-full" />
        </div>

        {/* CENTER SECTION - Login Form */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col items-center w-full max-w-md mx-auto lg:max-w-none">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[420px]">
            {/* Animated Brand Logo */}
            <AuthBranding subtitle="Sign in to your intelligent learning portal" />

            {/* Auth Card Container */}
            <div className="rounded-3xl bg-white/70 sm:bg-white/60 border border-white/60 p-6 sm:p-8 shadow-2xl shadow-purple-900/10 backdrop-blur-xl relative overflow-hidden transition-all">
              {/* Subtle Ambient Glow inside card */}
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

              {/* Segmented Role Switcher */}
              <div className="mb-6 relative z-10">
                <div
                  role="tablist"
                  aria-label="Select portal type"
                  className="grid grid-cols-2 p-1.5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 shadow-inner"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isTeacher}
                    disabled={isLoading || isGoogleLoading}
                    onClick={() => handleRoleChange("student")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                      !isTeacher
                        ? "bg-gradient-to-r from-[#6842FF] to-[#8B5CF6] text-white shadow-md shadow-purple-500/20"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <GraduationCap className={`w-4 h-4 ${!isTeacher ? 'text-white' : 'text-slate-400'}`} />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={isTeacher}
                    disabled={isLoading || isGoogleLoading}
                    onClick={() => handleRoleChange("teacher")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                      isTeacher
                        ? "bg-gradient-to-r from-[#6842FF] to-[#8B5CF6] text-white shadow-md shadow-purple-500/20"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Presentation className={`w-4 h-4 ${isTeacher ? 'text-white' : 'text-slate-400'}`} />
                    <span>Teacher</span>
                  </button>
                </div>

                {/* Context Badge */}
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#11172B] tracking-tight">
                      {isTeacher ? "Teacher Workspace" : "Student Portal"}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {isTeacher
                        ? "Access courses, materials, and student cohorts"
                        : "Continue your AI-assisted learning journey"}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                      isTeacher
                        ? "bg-purple-50/80 text-[#6842FF] border-[#6842FF]/20"
                        : "bg-blue-50/80 text-blue-600 border-blue-200/50"
                    }`}
                  >
                    {isTeacher ? "Educator" : "Learner"}
                  </span>
                </div>
              </div>

              {/* Feedback Alerts */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <p className="font-semibold">{error}</p>
                    {error.includes("Teacher Portal") && (
                      <button
                        type="button"
                        onClick={() => handleRoleChange("student")}
                        className="mt-1.5 font-bold underline text-[#6842FF] hover:text-purple-800 block"
                      >
                        Switch to Student Portal →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {roleNotice && (
                <div
                  role="status"
                  className="mb-5 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <p className="font-medium">{roleNotice}</p>
                </div>
              )}

              <div className="relative z-10">
                {/* Google Sign-in Option */}
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white hover:border-purple-200 bg-white/90 hover:bg-white text-slate-700 text-sm font-semibold shadow-sm hover:shadow active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#6842FF]" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.665-5.17 3.665-9.12z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.44 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.13z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.56 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                        />
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#fcfcff] px-3 text-slate-400 font-bold tracking-wider text-[10px] rounded-full">
                      or sign in with email
                    </span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder={isTeacher ? "teacher@school.edu" : "student@university.edu"}
                        {...register("email")}
                        className={`w-full pl-10 pr-3.5 py-3 rounded-xl border bg-white/90 text-sm transition-all focus:outline-none placeholder:text-slate-400 ${
                          errors.email
                            ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/50"
                            : "border-slate-200 focus:border-[#6842FF] focus:ring-2 focus:ring-[#6842FF]/20"
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="password"
                        className="block text-xs font-bold text-slate-700"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                        className="text-[11px] font-bold text-[#6842FF] hover:text-purple-800 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        {...register("password")}
                        className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-white/90 text-sm transition-all focus:outline-none placeholder:text-slate-400 ${
                          errors.password
                            ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/50"
                            : "border-slate-200 focus:border-[#6842FF] focus:ring-2 focus:ring-[#6842FF]/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || isGoogleLoading}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-50 mt-4 bg-gradient-to-r from-[#6842FF] to-[#8B5CF6] hover:from-[#5135F5] hover:to-[#6842FF] shadow-purple-500/25`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In as {isTeacher ? "Teacher" : "Student"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Navigation Link */}
                <div className="mt-6 pt-5 border-t border-slate-200/50 text-center">
                  {isTeacher ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-500 font-medium">
                        Teacher access requires institutional provisioning.
                      </p>
                      <Link
                        href="/register?role=teacher"
                        className="text-xs font-bold text-[#6842FF] hover:text-purple-800 transition-colors inline-flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Request Institutional Access</span>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">
                      Don&apos;t have an account?{" "}
                      <Link
                        href="/register?role=student"
                        className="font-bold text-[#6842FF] hover:text-purple-800 transition-colors"
                      >
                        Create Student Account
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION - Floating Feature Cards */}
        <div className="hidden lg:flex lg:col-span-3 xl:col-span-3 flex-col gap-4 items-end animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
          <FeatureCard 
            icon={<GraduationCap className="w-5 h-5 text-[#6842FF]" />}
            title="Ask"
            subtitle="Questions"
            delay="delay-[300ms]"
          />
          <FeatureCard 
            icon={<svg className="w-5 h-5 text-[#6842FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            title="Practice"
            subtitle="Concepts"
            delay="delay-[400ms]"
          />
          <FeatureCard 
            icon={<svg className="w-5 h-5 text-[#6842FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            title="Track"
            subtitle="Progress"
            delay="delay-[500ms]"
          />
          <FeatureCard 
            icon={<svg className="w-5 h-5 text-[#6842FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            title="Achieve"
            subtitle="Your Goals"
            delay="delay-[600ms]"
          />
        </div>

      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={getValues("email") || ""}
      />
    </main>
  );
}

function FeatureCard({ icon, title, subtitle, delay }: { icon: React.ReactNode, title: string, subtitle: string, delay: string }) {
  return (
    <div className={`flex items-center gap-4 bg-white/70 backdrop-blur-md border border-white/50 p-3.5 pr-8 rounded-2xl shadow-xl shadow-purple-900/5 hover:scale-105 hover:bg-white/90 transition-all duration-300 w-48 animate-in fade-in slide-in-from-right-4 ${delay}`}>
      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-[#11172B] font-bold text-sm leading-tight">{title}</h4>
        <p className="text-slate-500 text-xs font-medium">{subtitle}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}