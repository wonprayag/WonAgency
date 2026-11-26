"use client";

import React from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  FolderGit2,
  Users,
  Vote,
  Lightbulb,
  Coins,
  FileText,
  ChevronRight,
  Settings,
  LogOut
} from "lucide-react";
import { User } from "../services/api";

export type ModuleKey =
  | "dashboard"
  | "attendance"
  | "projects"
  | "members"
  | "voting"
  | "ideation"
  | "funds"
  | "docs"
  | "settings"
  | "profile";

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  user: User;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  key: ModuleKey;
  label: string;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    subtext: "Overview",
    icon: LayoutDashboard
  },
  {
    key: "attendance",
    label: "Attendance",
    subtext: "Sessions & Sparks",
    icon: CalendarCheck
  },
  {
    key: "projects",
    label: "Projects",
    subtext: "Tasks & Teams",
    icon: FolderGit2
  },
  {
    key: "members",
    label: "Members",
    subtext: "Team & Roles",
    icon: Users
  },
  {
    key: "voting",
    label: "Voting",
    subtext: "Polls & Feedback",
    icon: Vote
  },
  {
    key: "ideation",
    label: "Proposals",
    subtext: "Ideas & Plans",
    icon: Lightbulb
  },
  {
    key: "funds",
    label: "Treasury",
    subtext: "Funds & Budget",
    icon: Coins
  },
  {
    key: "docs",
    label: "Docs",
    subtext: "Notices & Templates",
    icon: FileText
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  user,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const isSettingsActive = activeModule === "settings";

  // Role and scope filtering
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const userAllowed =
    user.allowedModules && user.allowedModules.length > 0
      ? user.allowedModules
      : ["dashboard", "attendance", "projects", "members", "voting", "ideation", "funds", "docs"];

  const visibleNavItems = isSuperAdmin
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => userAllowed.includes(item.key));

  const navContent = (
    <div className="flex flex-col justify-between h-full p-4 sm:p-5 pb-0 sm:pb-0 relative overflow-hidden bg-white/90 backdrop-blur-md">
      {/* Top Section: Brand + Navigation */}
      <div className="relative z-10 shrink-0">
        {/* Brand Logo Header */}
        <div className="px-2 pt-1 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img
              src="/won-logo.png"
              alt="WON"
              className="h-7 sm:h-8 w-auto object-contain select-none"
            />
            <div className="h-4 w-[1px] bg-[#E5F2FF]" />
            <span className="text-[11px] font-medium tracking-wide uppercase text-[#647895]">
              Originals
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-2.5 mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#647895]/80">
            Workspace
          </p>
        </div>

        <nav className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelectModule(item.key);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all relative group ${
                  isActive
                    ? "bg-[#E5F2FF]/85 text-[#087FC4] font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#087FC4] before:rounded-r shadow-2xs"
                    : "text-[#647895] hover:text-[#101C34] hover:bg-[#F1F7FD]"
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                      isActive
                        ? "text-[#087FC4]"
                        : "text-[#647895] group-hover:text-[#101C34]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs tracking-tight leading-snug truncate">{item.label}</p>
                    {item.subtext && (
                      <p
                        className={`text-[10px] leading-tight truncate ${
                          isActive ? "text-[#087FC4]/70" : "text-[#647895]/70"
                        }`}
                      >
                        {item.subtext}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isActive
                      ? "text-[#087FC4] translate-x-0.5"
                      : "text-slate-300 opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Account / Preferences Section */}
        <div className="px-2.5 mt-3 mb-1.5 pt-2 border-t border-[#E5F2FF]/80">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#647895]/80">
            Account
          </p>
        </div>

        <div className="space-y-0.5">
          {/* 1. Profile Option */}
          <button
            onClick={() => {
              onSelectModule("profile");
              onCloseMobile?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all relative group ${
              activeModule === "profile"
                ? "bg-[#E5F2FF]/85 text-[#087FC4] font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#087FC4] before:rounded-r shadow-2xs"
                : "text-[#647895] hover:text-[#101C34] hover:bg-[#F1F7FD]"
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#E5F2FF] border border-[#bae6fd] text-[#087FC4] font-bold text-[10px] flex items-center justify-center shrink-0">
                {user.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-[#101C34] truncate leading-tight">{user.name}</p>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                  {user.role === "SUPER_ADMIN" ? "SUPER ADMIN" : user.role}
                </span>
              </div>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                activeModule === "profile"
                  ? "text-[#087FC4] translate-x-0.5"
                  : "text-slate-300 opacity-0 group-hover:opacity-100"
              }`}
            />
          </button>

          {/* 2. Full-Page Settings Option */}
          <button
            onClick={() => {
              onSelectModule("settings");
              onCloseMobile?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all relative group ${
              isSettingsActive
                ? "bg-[#E5F2FF]/85 text-[#087FC4] font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#087FC4] before:rounded-r shadow-2xs"
                : "text-[#647895] hover:text-[#101C34] hover:bg-[#F1F7FD]"
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  isSettingsActive
                    ? "text-[#087FC4]"
                    : "text-[#647895] group-hover:text-[#101C34]"
                }`}
              >
                <Settings className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium">Settings</p>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                isSettingsActive
                  ? "text-[#087FC4] translate-x-0.5"
                  : "text-slate-300 opacity-0 group-hover:opacity-100"
              }`}
            />
          </button>

          {/* 3. Logout Option */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-rose-600/80 hover:text-rose-700 hover:bg-rose-50/70 transition-all group"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-1.5 rounded-lg text-rose-500 group-hover:text-rose-700 transition-colors shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium">Log out</p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Area: Icy Blue Snow Blossom Branch (Flush to left & bottom edge, no extra gap) */}
      <div className="relative mt-auto pointer-events-none select-none overflow-hidden shrink-0 -mx-4 sm:-mx-5 -mb-1 w-[calc(100%+2rem)] sm:w-[calc(100%+2.5rem)]">
        <div className="relative w-full h-44 sm:h-52 overflow-hidden flex items-end">
          <img
            src="/snow-blossom-branch.png"
            alt="Icy Blue Snow Blossom Branch"
            style={{
              transform: "scaleX(-1) scale(1.4) translate(12%, 6%)",
              transformOrigin: "bottom center"
            }}
            className="w-full h-full object-contain object-bottom opacity-95 drop-shadow-xs"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Fixed/Locked Sidebar */}
      <aside className="hidden md:flex w-64 h-full border-r border-[#E5F2FF] flex-col shrink-0 select-none overflow-hidden">
        {navContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#101C34]/30 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer content */}
          <aside className="relative w-72 max-w-[85vw] h-full border-r border-[#E5F2FF] shadow-2xl z-10 flex flex-col overflow-hidden">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
