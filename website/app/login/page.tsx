"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const LoginScreen = dynamic(
  () => import("@/components/LoginScreen").then((mod) => mod.LoginScreen),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#F4F8FD] bg-gradient-to-br from-[#F5FAFF] via-[#EAF4FF]/50 to-[#F8FBFF] flex items-center justify-center">
        <img
          src="/won-logo.png"
          alt="WON"
          className="h-10 sm:h-12 w-auto object-contain select-none animate-pulse"
        />
      </div>
    ),
  }
);

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (user: import("@/services/api").User) => {
    localStorage.setItem("won_authenticated", "true");
    localStorage.setItem("won_current_user", JSON.stringify(user));
    router.push("/");
  };

  return <LoginScreen onLoginSuccess={handleLogin} />;
}
