"use client";

import React from "react";
import { Search, ChevronRight, Menu, X } from "lucide-react";
import { User } from "../services/api";

interface NavbarProps {
  user: User;
  onLogout?: () => void;
  activeModuleTitle: string;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeModuleTitle,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  return (
    <header className="h-16 bg-white/75 backdrop-blur-md border-b border-[#E5F2FF] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shrink-0">
      {/* Left Area: Mobile Menu + Breadcrumbs */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-1.5 -ml-1 text-[#647895] hover:text-[#101C34] md:hidden rounded-lg hover:bg-[#F1F7FD] transition-colors shrink-0"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        {/* Minimal Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-[#647895]">
          <span className="font-serif-fraunces font-semibold text-[#101C34] tracking-tight text-sm">WON</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#647895]/50 shrink-0" />
          <span className="font-medium text-[#087FC4] truncate">{activeModuleTitle}</span>
        </nav>
      </div>

      {/* Center Area: Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#647895] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search across WON..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-[#F1F7FD] border border-[#E5F2FF] rounded-full text-[#101C34] placeholder:text-[#647895]/70 focus:outline-none focus:border-[#087FC4] focus:bg-white focus:ring-2 focus:ring-[#E5F2FF] transition-all"
          />
        </div>
      </div>

      {/* Right Area: Spark Balance Pill */}
      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#E5F2FF] border border-[#bae6fd] rounded-full shrink-0 shadow-2xs">
          <span className="text-[#087FC4] text-xs">✦</span>
          <span className="text-xs text-[#101C34] font-bold">
            {user.sparkBalance.toFixed(2)}
          </span>
          <span className="text-[11px] text-[#0868AE] font-medium hidden sm:inline">Sparks</span>
        </div>
      </div>
    </header>
  );
};
