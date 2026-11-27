"use client";

import React, { useState } from "react";
import { Eye, EyeOff, ShieldAlert, Check } from "lucide-react";
import { User, authApi } from "../services/api";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Typewriter effect states
  const phrases = [
    "Build What Matters.",
    "Create Everything.",
    "Shape The Future.",
  ];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState("Build What Matters.");
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  React.useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let timer: NodeJS.Timeout;

    if (!isDeleting) {
      if (currentText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        }, 75);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2800);
      }
    } else {
      if (currentText.length > 0) {
        timer = setTimeout(() => {
          setCurrentText(currentPhrase.slice(0, currentText.length - 1));
        }, 40);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const cleanEmail = email.trim();
      const res = await authApi.login(cleanEmail, password);

      if (typeof window !== "undefined") {
        localStorage.setItem("won_auth_token", res.accessToken);
      }

      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      suppressHydrationWarning
      style={{
        background: `
          radial-gradient(ellipse 70% 65% at 88% 28%, rgba(56, 189, 248, 0.28) 0%, rgba(186, 230, 253, 0.40) 45%, rgba(240, 249, 255, 0.75) 75%, transparent 100%),
          radial-gradient(ellipse 60% 60% at 92% 82%, rgba(2, 132, 199, 0.15) 0%, rgba(186, 230, 253, 0.30) 50%, transparent 100%),
          linear-gradient(90deg, #ffffff 0%, #ffffff 40%, #f0f9ff 65%, #dbeafe 100%)
        `,
        fontFamily: "var(--font-fraunces), var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="min-h-screen min-h-[100svh] w-full flex flex-col justify-between lg:flex-row text-slate-900 relative overflow-x-hidden overflow-y-auto lg:overflow-hidden"
    >
      <style>{`
        @media (min-width: 1920px) {
          .login-4k-tree {
            max-height: 780px !important;
            height: 62vh !important;
          }
          .login-4k-birds {
            max-width: 440px !important;
            top: 2.5rem !important;
            left: 4.5rem !important;
          }
          .login-4k-logo {
            height: 38px !important;
          }
          .login-4k-logo-wrapper {
            top: 56px !important;
            right: 56px !important;
          }
          .login-4k-form-container {
            max-width: 28rem !important;
          }
          .login-4k-form-title {
            font-size: 1.875rem !important;
          }
          .login-4k-input {
            min-height: 52px !important;
            font-size: 1.05rem !important;
          }
          .login-4k-btn {
            min-height: 52px !important;
            font-size: 1.05rem !important;
          }
          .login-4k-hero-container {
            max-width: 36rem !important;
          }
          .login-4k-hero-title {
            font-size: 64px !important;
          }
          .login-4k-hero-sub {
            font-size: 1.05rem !important;
            max-width: 34rem !important;
          }
        }

        @media (min-width: 2560px) {
          .login-4k-tree {
            max-height: 1050px !important;
            height: 64vh !important;
          }
          .login-4k-birds {
            max-width: 600px !important;
            top: 3.5rem !important;
            left: 6rem !important;
          }
          .login-4k-logo {
            height: 48px !important;
          }
          .login-4k-logo-wrapper {
            top: 72px !important;
            right: 72px !important;
          }
          .login-4k-form-container {
            max-width: 32rem !important;
          }
          .login-4k-form-title {
            font-size: 2.25rem !important;
          }
          .login-4k-input {
            min-height: 60px !important;
            font-size: 1.15rem !important;
            border-radius: 1rem !important;
          }
          .login-4k-btn {
            min-height: 60px !important;
            font-size: 1.15rem !important;
            border-radius: 1rem !important;
          }
          .login-4k-hero-container {
            max-width: 44rem !important;
          }
          .login-4k-hero-title {
            font-size: 82px !important;
          }
          .login-4k-hero-sub {
            font-size: 1.25rem !important;
            max-width: 40rem !important;
          }
          .login-4k-copyright {
            font-size: 0.95rem !important;
          }
        }

        @media (min-width: 3200px) {
          .login-4k-tree {
            max-height: 1420px !important;
            height: 66vh !important;
          }
          .login-4k-tree-wrapper {
            bottom: -2.5rem !important;
            left: -2.5rem !important;
          }
          .login-4k-birds {
            max-width: 820px !important;
            top: 5rem !important;
            left: 8rem !important;
          }
          .login-4k-logo {
            height: 64px !important;
          }
          .login-4k-logo-wrapper {
            top: 96px !important;
            right: 96px !important;
          }
          .login-4k-form-container {
            max-width: 38rem !important;
          }
          .login-4k-form-title {
            font-size: 3rem !important;
            margin-bottom: 1.5rem !important;
          }
          .login-4k-input {
            min-height: 72px !important;
            font-size: 1.4rem !important;
            padding-left: 1.75rem !important;
            padding-right: 1.75rem !important;
            border-radius: 1.25rem !important;
          }
          .login-4k-btn {
            min-height: 72px !important;
            font-size: 1.4rem !important;
            border-radius: 1.25rem !important;
          }
          .login-4k-forgot {
            font-size: 1.15rem !important;
            padding-top: 0.75rem !important;
          }
          .login-4k-hero-container {
            max-width: 56rem !important;
          }
          .login-4k-hero-title {
            font-size: 110px !important;
            line-height: 1.12 !important;
          }
          .login-4k-hero-sub {
            font-size: 1.5rem !important;
            line-height: 1.6 !important;
            max-width: 50rem !important;
            margin-top: 1.5rem !important;
          }
          .login-4k-copyright {
            font-size: 1.15rem !important;
            padding-bottom: 1.5rem !important;
            padding-right: 1.5rem !important;
          }
        }
      `}</style>
      {/* ============================================================== */}
      {/* SNOW-LADEN WINTER TREE ASSET: Left Corner Overlay              */}
      {/* Scales gracefully on 4K while preserving mobile/desktop        */}
      {/* ============================================================== */}
      <div
        aria-hidden="true"
        className="absolute -bottom-6 -left-10 sm:-bottom-6 sm:-left-6 lg:-bottom-8 lg:-left-8 pointer-events-none select-none z-0 leading-none login-4k-tree-wrapper"
      >
        <img
          src="/snow-tree.png"
          alt="Snow-Laden Winter Tree"
          className="h-[36vh] sm:h-[40vh] lg:h-[58vh] xl:h-[64vh] max-h-[580px] w-auto object-contain object-left-bottom opacity-85 sm:opacity-90 pointer-events-none select-none login-4k-tree"
        />
      </div>

      {/* ============================================================== */}
      {/* COOL BLUE FLOCK OF FLYING BIRDS: Upper Sky Overlay             */}
      {/* Scales gracefully on 4K while preserving mobile/desktop        */}
      {/* ============================================================== */}
      <div
        aria-hidden="true"
        className="absolute top-2 left-2 sm:top-6 sm:left-6 lg:top-8 lg:left-14 pointer-events-none select-none z-0 w-[68vw] max-w-[260px] sm:max-w-[280px] lg:w-auto lg:max-w-[310px] opacity-85 sm:opacity-90 leading-none login-4k-birds"
      >
        <img
          src="/birds.png"
          alt="Cool Blue Flock of Flying Birds"
          className="w-full h-auto object-contain pointer-events-none select-none"
        />
      </div>

      {/* ============================================================== */}
      {/* WON LOGO: Top-Right Corner (Desktop only, 4K scaled)           */}
      {/* ============================================================== */}
      <div
        suppressHydrationWarning
        className="hidden lg:block absolute lg:top-[52px] lg:right-[52px] z-20 select-none pointer-events-none login-4k-logo-wrapper"
      >
        <img
          src="/won-logo.png"
          alt="won"
          className="h-[30px] w-auto object-contain pointer-events-auto select-none login-4k-logo"
        />
      </div>

      {/* ============================================================== */}
      {/* LEFT PANEL: Transparent Minimalist Login Form                  */}
      {/* ============================================================== */}
      <div
        suppressHydrationWarning
        className="w-full lg:w-1/2 min-h-[100svh] lg:min-h-0 flex flex-col justify-between px-6 py-6 sm:px-10 lg:p-16 xl:p-20 relative z-10 shrink-0 login-4k-panel-left"
      >
        {/* Top Empty Spacer */}
        <div suppressHydrationWarning className="h-6 sm:h-8 lg:h-6" />

        {/* Center: Clean Transparent Form Container */}
        <div
          suppressHydrationWarning
          className="w-full max-w-sm mx-auto my-auto -translate-y-6 sm:-translate-y-8 lg:translate-y-0 space-y-4 sm:space-y-6 relative login-4k-form-container"
        >
          {/* Mobile-only Centered WON Logo directly above heading */}
          <div suppressHydrationWarning className="flex justify-center pb-2.5 sm:pb-3 lg:hidden select-none pointer-events-auto">
            <img
              src="/won-logo.png"
              alt="won"
              className="h-[32px] sm:h-[34px] w-auto object-contain select-none"
            />
          </div>

          {/* Mobile Heading with Fraunces font & Typewriter Animation */}
          <div suppressHydrationWarning className="lg:hidden text-center sm:text-left space-y-1">
            <h1
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              className="text-[28px] sm:text-3xl font-normal text-slate-900 tracking-tight leading-none"
            >
              Welcome back
            </h1>
            <p
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              className="italic font-light text-sky-700 text-sm sm:text-base leading-snug"
            >
              {currentText}
              <span className="inline-block w-[2px] h-[16px] bg-sky-600 ml-1.5 align-middle animate-pulse rounded-full" />
            </p>
          </div>

          {/* Desktop Heading (100% original & untouched on standard desktop) */}
          <h1 className="hidden lg:block text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 login-4k-form-title">
            Log into WON
          </h1>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div suppressHydrationWarning className="relative">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Mobile number, username or email"
                className="w-full px-4 py-3 sm:py-3.5 bg-white/75 hover:bg-white/90 focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/15 rounded-xl text-base sm:text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all min-h-[48px] login-4k-input"
              />
            </div>

            {/* Password Field */}
            <div suppressHydrationWarning className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full px-4 py-3 sm:py-3.5 pr-11 bg-white/75 hover:bg-white/90 focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/15 rounded-xl text-base sm:text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all min-h-[48px] login-4k-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 sm:right-3.5 sm:top-3.5 text-slate-400 hover:text-slate-700 transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Log in Button */}
            <div suppressHydrationWarning className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 min-h-[48px] bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium rounded-xl text-base sm:text-[15px] transition-colors shadow-xs flex items-center justify-center cursor-pointer login-4k-btn"
              >
                <span>{isLoading ? "Logging in..." : "Log in"}</span>
              </button>
            </div>

            {/* Forgot password */}
            <div suppressHydrationWarning className="pt-2 text-center login-4k-forgot">
              <button
                type="button"
                disabled={isResetting}
                onClick={async () => {
                  setResetSent(true);
                  setErrorMessage(null);
                  if (!email.trim()) {
                    setResetMessage("Please enter your email address in the field above, then click Forgot password?.");
                    return;
                  }
                  setIsResetting(true);
                  try {
                    const res = await authApi.forgotPassword(email.trim());
                    setResetMessage(res.message);
                  } catch (err: any) {
                    setResetMessage(err.message || "Could not send password reset code.");
                  } finally {
                    setIsResetting(false);
                  }
                }}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-1 inline-block cursor-pointer"
              >
                {isResetting ? "Sending reset code..." : "Forgot password?"}
              </button>
              {resetSent && (
                <div className="mt-2.5 p-3 bg-sky-50 border border-sky-200/80 rounded-xl text-left space-y-2.5">
                  <p className="text-xs text-sky-800 font-medium leading-relaxed">
                    {resetMessage || "Enter your email above to receive a 6-digit reset code."}
                  </p>
                  {email.trim() && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="6-digit reset code"
                        className="w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
                      />
                      <input
                        type="password"
                        value={resetNewPass}
                        onChange={(e) => setResetNewPass(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
                      />
                      <button
                        type="button"
                        disabled={isResetting || !resetCode.trim() || resetNewPass.length < 6}
                        onClick={async () => {
                          setIsResetting(true);
                          try {
                            const res = await authApi.resetPassword(email.trim(), resetCode.trim(), resetNewPass);
                            setResetMessage(res.message);
                            setPassword(resetNewPass);
                            setResetCode("");
                            setResetNewPass("");
                          } catch (err: any) {
                            setResetMessage(err.message || "Invalid or expired reset code.");
                          } finally {
                            setIsResetting(false);
                          }
                        }}
                        className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        {isResetting ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Mobile bottom copyright */}
        <div suppressHydrationWarning className="text-center text-xs text-slate-500 font-medium py-1 lg:hidden relative z-10">
          <span>© 2026 WeOwnNothing</span>
        </div>

        {/* Bottom Spacer (desktop only) */}
        <div suppressHydrationWarning className="hidden lg:block h-4 sm:h-6" />
      </div>

      {/* ============================================================== */}
      {/* RIGHT PANEL: Clean, Soft Sky Blue Brand Showcase (Desktop)     */}
      {/* ============================================================== */}
      <div
        suppressHydrationWarning
        className="hidden lg:flex w-full lg:w-1/2 flex-col justify-between lg:p-16 xl:p-20 relative z-10 login-4k-panel-right"
      >
        {/* Top Space Preserver (Maintains exact layout on desktop) */}
        <div suppressHydrationWarning className="hidden lg:flex h-[22px] sm:h-[26px] lg:h-[30px] justify-end invisible" aria-hidden="true">
          <div className="h-[30px] w-24" />
        </div>

        {/* Center Headline */}
        <div suppressHydrationWarning className="w-full max-w-sm mx-auto my-0 lg:my-auto py-0 lg:py-12 lg:max-w-lg login-4k-hero-container translate-y-6 lg:translate-y-7 2xl:translate-y-9">
          <h2
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            className="text-[26px] sm:text-3xl lg:text-[52px] font-normal text-slate-900 tracking-tight leading-[1.14] login-4k-hero-title"
          >
            We Own Nothing.
            <br />
            <span className="italic font-light text-sky-700 inline-block min-h-[1.15em]">
              {currentText}
              <span className="inline-block w-[3px] h-[22px] sm:h-[28px] lg:h-[44px] bg-sky-600 ml-1.5 align-middle animate-pulse rounded-full" />
            </span>
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm lg:text-base text-slate-500 leading-relaxed font-normal login-4k-hero-sub">
            Team portal for attendance, Spark points, projects, and member profiles.
          </p>
        </div>

        {/* Bottom Notice */}
        <div suppressHydrationWarning className="text-center lg:text-right text-xs text-slate-500 font-medium mt-auto pt-6 sm:pt-8 lg:pt-0 pb-2 lg:pb-0 relative z-10 login-4k-copyright">
          <span>© 2026 WeOwnNothing</span>
        </div>
      </div>
    </div>
  );
};
