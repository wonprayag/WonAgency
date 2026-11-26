import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F4F8FD] bg-gradient-to-br from-[#F5FAFF] via-[#EAF4FF]/50 to-[#F8FBFF] flex items-center justify-center">
      <img
        src="/won-logo.png"
        alt="WON"
        className="h-10 sm:h-12 w-auto object-contain select-none animate-pulse"
      />
    </div>
  );
}
