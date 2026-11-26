"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  FolderGit2,
  Users,
  Vote,
  Lightbulb,
  Coins,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileSignature,
  Eye,
  BookOpen,
  Calendar,
  Layers,
  MapPin,
  FileText
} from "lucide-react";
import {
  User,
  AttendanceRecord,
  ProjectRecord,
  FundSummary,
  NoticeRecord,
  TimetableEntry
} from "../services/api";
import { ModuleKey } from "../components/Sidebar";
import { getTodaySchedule } from "../utils/schedule";

interface DashboardModuleProps {
  user: User;
  onNavigate: (module: ModuleKey) => void;
  attendanceList: AttendanceRecord[];
  onMarkAttendance: (status: "PRESENT" | "ABSENT", subjectName?: string) => void;
  projects: ProjectRecord[];
  funds: FundSummary;
  notices: NoticeRecord[];
  timetables: TimetableEntry[];
  subjects?: import("../services/api").SubjectRecord[];
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  user,
  onNavigate,
  attendanceList,
  onMarkAttendance,
  projects,
  funds,
  notices,
  timetables,
  subjects,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time interval ticking every 30 seconds to update live / upcoming statuses
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const scheduleData = useMemo(() => {
    return getTodaySchedule(subjects || [], user, currentTime);
  }, [subjects, user, currentTime]);

  const {
    hasClassesToday,
    todayClasses,
    activeOrNextClass,
    formattedToday,
    todayDateISO,
    nextClassOtherDay,
  } = scheduleData;

  const isMentorOrAdmin =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "LEAD" ||
    Boolean(
      subjects &&
        subjects.some(
          (s) =>
            s.mentor === user.name ||
            s.mentorId === user.id ||
            s.batches?.some((b) => b.mentorName === user.name || b.mentorId === user.id)
        )
    );

  const todayRecord = activeOrNextClass
    ? attendanceList.find(
        (r) =>
          r.subject === activeOrNextClass.subjectName &&
          r.date === todayDateISO &&
          r.userId === user.id
      )
    : null;

  const totalBalance = funds.totalBalance ?? 0;
  const totalInflow = funds.totalInflow ?? 0;
  const totalDisbursed = funds.totalDisbursed ?? 0;

  const attendancePercent =
    attendanceList.length > 0
      ? Math.round(
          (attendanceList.filter((a) => a.status === "PRESENT").length /
            attendanceList.length) *
            100
        )
      : 100;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Studio Welcome Greeting Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/95 via-[#F8FBFF]/90 to-[#EAF4FF]/80 border border-[#E5F2FF] p-6 sm:p-10 shadow-xs">
        {/* Winter background decorations */}
        <div className="absolute right-0 top-0 w-64 sm:w-96 h-48 sm:h-56 pointer-events-none select-none opacity-25">
          <img
            src="/cool-birds.png"
            alt="Birds"
            className="w-full h-full object-contain object-right-top"
          />
        </div>
        <div className="absolute -left-10 -bottom-10 w-44 sm:w-60 h-44 sm:h-60 pointer-events-none select-none opacity-15">
          <img
            src="/snow-tree-overlay.png"
            alt="Winter tree"
            className="w-full h-full object-contain object-left-bottom"
          />
        </div>

        <div className="relative z-10 max-w-2xl">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#087FC4] mb-2">
            Creative Studio Workspace
          </p>
          <h1 className="font-serif-fraunces text-3xl sm:text-4xl lg:text-5xl text-[#101C34] leading-[1.15] font-normal">
            Good Morning, <br className="hidden sm:inline" />
            <span className="italic text-[#087FC4]">{user.name}!</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#647895] font-light leading-relaxed">
            Let's make today productive. Build what matters.
          </p>
        </div>
      </section>

      {/* 2. Key Executive Studio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Spark Balance Card with Mountain Panorama */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F8FBFF] via-[#EBF4FF] to-[#E1EFFE] border border-[#E5F2FF] p-6 shadow-xs flex flex-col justify-between">
          <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none select-none overflow-hidden">
            <img
              src="/mountain-panorama.png"
              alt="Mountain Panorama"
              className="w-full h-full object-cover object-bottom opacity-40 mix-blend-multiply"
            />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#647895] block">
              Spark Treasury
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-serif-fraunces text-3xl text-[#101C34] leading-none">
                {user.sparkBalance.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#087FC4]">SPK</span>
            </div>
            <p className="text-[11px] text-[#647895] mt-2">Active balance & peer rate (+0.25 / -1.00)</p>
          </div>
          <div className="relative z-10 pt-4">
            <button
              onClick={() => onNavigate("attendance")}
              className="text-xs font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center gap-1 transition-colors"
            >
              <span>View Spark History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Projects Metric */}
        <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#647895] block">
              Active Projects
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-serif-fraunces text-3xl text-[#101C34] leading-none">
                {projects.length}
              </span>
              <span className="text-xs font-semibold text-emerald-600">On Track</span>
            </div>
            <p className="text-[11px] text-[#647895] mt-2">Deliverables, sprints & token pools</p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => onNavigate("projects")}
              className="text-xs font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center gap-1 transition-colors"
            >
              <span>Open Project Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Treasury / Fund Management Metric */}
        <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#647895] block">
              Treasury Balance
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-serif-fraunces text-2xl text-[#101C34] leading-none">
                ₹{totalBalance.toLocaleString("en-IN")}
              </span>
              <span className="text-xs font-semibold text-emerald-600">Available</span>
            </div>
            <p className="text-[11px] text-[#647895] mt-2">
              Inflow: ₹{totalInflow.toLocaleString("en-IN")} • Disbursed: ₹{totalDisbursed.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => onNavigate("funds")}
              className="text-xs font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center gap-1 transition-colors"
            >
              <span>Manage Treasury</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Attendance Score Metric */}
        <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#647895] block">
              Attendance Standing
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-serif-fraunces text-3xl text-[#101C34] leading-none">
                {attendancePercent}%
              </span>
              <span className={`text-xs font-semibold ${attendancePercent >= 75 ? "text-emerald-600" : "text-amber-600"}`}>
                {attendanceList.length === 0 ? "Baseline" : attendancePercent >= 75 ? "Compliant" : "Attention"}
              </span>
            </div>
            <p className="text-[11px] text-[#647895] mt-2">
              {attendanceList.length === 0 ? "No recorded attendance sessions yet" : `${attendanceList.length} session(s) tracked`}
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => onNavigate("attendance")}
              className="text-xs font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center gap-1 transition-colors"
            >
              <span>Check Sessions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Studio Agenda & Live Session Quick Action (Real-Time Dynamic Schedule) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {!hasClassesToday ? (
          /* NO CLASSES TODAY STATE */
          <div className="lg:col-span-7 bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1F7FD] border border-[#E5F2FF] text-[#087FC4] text-[11px] font-bold uppercase tracking-widest rounded-full">
                <CalendarCheck className="w-3.5 h-3.5" />
                {formattedToday}
              </span>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full border bg-slate-50 text-[#647895] border-[#E5F2FF]">
                No Sessions Today
              </span>
            </div>

            <div>
              <h3 className="font-serif-fraunces text-2xl text-[#101C34]">
                No Classes Today
              </h3>
              <p className="text-xs text-[#647895] mt-1.5 leading-relaxed">
                You have no academic tracks or lectures scheduled for today ({formattedToday}).
              </p>
            </div>

            {nextClassOtherDay ? (
              <div className="p-4 bg-[#F8FBFE] border border-[#E2EEFC] rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#087FC4]/10 text-[#087FC4] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#101C34]">
                      Next Scheduled Class: {nextClassOtherDay.subjectName} {nextClassOtherDay.batchName ? `(${nextClassOtherDay.batchName})` : ""}
                    </p>
                    <p className="text-[11px] text-[#647895] mt-0.5">
                      {nextClassOtherDay.day} • {nextClassOtherDay.timeSlot} • {nextClassOtherDay.room}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-[#647895]">
                {subjects && subjects.length > 0
                  ? "All configured subjects are scheduled on other days."
                  : "No subjects added yet. Admins can create subjects in Attendance."}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => onNavigate("attendance")}
                className="py-3 px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-[#087FC4] hover:bg-[#0868AE] text-white transition-all shadow-xs active:scale-[0.99] cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>View Full Weekly Timetable</span>
              </button>
              <button
                onClick={() => onNavigate("projects")}
                className="py-3 px-5 rounded-xl text-xs font-medium text-[#647895] hover:text-[#101C34] hover:bg-[#F1F7FD] border border-[#E5F2FF] transition-all cursor-pointer"
              >
                Open Project Board
              </button>
            </div>
          </div>
        ) : (
          /* HAS CLASSES TODAY - REAL-TIME SCHEDULE CARD */
          <div className="lg:col-span-7 bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1F7FD] border border-[#E5F2FF] text-[#087FC4] text-[11px] font-bold uppercase tracking-widest rounded-full">
                <Clock className="w-3.5 h-3.5" />
                {formattedToday}
              </span>

              {activeOrNextClass?.status === "LIVE_NOW" ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Now • Ends at {activeOrNextClass.endTime}
                </span>
              ) : activeOrNextClass?.status === "UPCOMING" ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border bg-sky-50 text-[#087FC4] border-sky-200">
                  <Clock className="w-3 h-3" />
                  Upcoming • Starts at {activeOrNextClass?.startTime}
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                  Class Concluded Today
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">
                  {activeOrNextClass?.subjectName}
                </h3>
                {activeOrNextClass?.batchName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF4FC] text-[#087FC4] border border-[#D5E6F6]">
                    <Layers className="w-3 h-3" />
                    {activeOrNextClass.batchName}
                  </span>
                )}
                <span className="text-[10px] font-mono text-[#647895] bg-slate-100 px-2 py-0.5 rounded-md">
                  {activeOrNextClass?.subjectCode}
                </span>
              </div>
              <p className="text-xs text-[#647895] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-[#101C34]">{activeOrNextClass?.timeSlot}</span>
                <span>•</span>
                <span>Mentor: <strong className="text-[#101C34]">{activeOrNextClass?.mentor}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[#087FC4]" /> {activeOrNextClass?.room}</span>
              </p>
            </div>

            {/* Attendance Standing for this Session */}
            {todayRecord && (
              <div className="p-3 bg-[#F4F9FE] border border-[#DCEAF8] rounded-xl flex items-center justify-between text-xs">
                <span className="text-[#647895]">Your Attendance Standing:</span>
                <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                  todayRecord.status === "PRESENT"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}>
                  {todayRecord.status === "PRESENT" ? "Marked Present (+0.25 SPK)" : "Marked Absent (-1.00 SPK)"}
                </span>
              </div>
            )}

            {/* If multiple classes today, show full schedule timeline */}
            {todayClasses.length > 1 && (
              <div className="space-y-2 pt-1 border-t border-[#EDF4FB]">
                <p className="text-[10px] font-bold text-[#647895] uppercase tracking-wider">
                  Today's Complete Schedule ({todayClasses.length} sessions)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {todayClasses.map((cls) => {
                    const isCurrent = cls.id === activeOrNextClass?.id;
                    return (
                      <div
                        key={cls.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isCurrent
                            ? "bg-[#087FC4]/5 border-[#087FC4]/30 shadow-2xs"
                            : "bg-[#F9FBFE] border-[#E8F1FA]"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className={`font-semibold truncate ${isCurrent ? "text-[#087FC4]" : "text-[#101C34]"}`}>
                            {cls.subjectName} {cls.batchName ? `(${cls.batchName})` : ""}
                          </p>
                          <p className="text-[10px] text-[#647895] truncate">{cls.timeSlot} • {cls.room}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          cls.status === "LIVE_NOW"
                            ? "bg-emerald-100 text-emerald-700"
                            : cls.status === "UPCOMING"
                            ? "bg-sky-100 text-[#087FC4]"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {cls.status === "LIVE_NOW" ? "Live Now" : cls.status === "UPCOMING" ? "Upcoming" : "Ended"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isMentorOrAdmin ? (
                <button
                  onClick={() => onNavigate("attendance")}
                  className="py-3 px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-[#087FC4] hover:bg-[#0868AE] text-white transition-all shadow-xs active:scale-[0.99] cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Take Session Attendance Register</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate("attendance")}
                  className="py-3 px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-[#087FC4] hover:bg-[#0868AE] text-white transition-all shadow-xs active:scale-[0.99] cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View My Attendance & Standing</span>
                </button>
              )}
              <button
                onClick={() => onNavigate("attendance")}
                className="py-3 px-5 rounded-xl text-xs font-medium text-[#647895] hover:text-[#101C34] hover:bg-[#F1F7FD] border border-[#E5F2FF] transition-all cursor-pointer"
              >
                Academic Portal
              </button>
            </div>
          </div>
        )}

        {/* Latest Official Notice */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5F2FF]/60">
            <span className="text-xs font-bold text-[#101C34] flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-[#087FC4]" />
              Latest Agency Notice
            </span>
            <span className="text-[11px] text-[#647895]">Official</span>
          </div>

          {notices[0] ? (
            <div className="space-y-2">
              <h4 className="font-serif-fraunces text-base text-[#101C34] leading-snug">
                {notices[0].title}
              </h4>
              <p className="text-xs text-[#647895] line-clamp-3 leading-relaxed">
                {notices[0].content}
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-[#647895]">
                <span>By {notices[0].authorityName}</span>
                <span className="font-mono text-[10px] text-[#087FC4] bg-[#E5F2FF] px-2 py-0.5 rounded-full border border-[#bae6fd]">
                  {notices[0]?.virtualSignatureHash ? `${notices[0].virtualSignatureHash.substring(0, 14)}...` : "SIG-VERIFIED"}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#647895] space-y-1.5">
              <p className="font-semibold text-[#101C34]">No agency notices published yet</p>
              <p className="text-[11px] leading-relaxed text-[#647895]/80">
                Team announcements and notices will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Workspace Quick Launchpad */}
      <div>
        <h3 className="font-serif-fraunces text-xl text-[#101C34] mb-4 px-1">
          Studio Workspace Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              key: "attendance" as ModuleKey,
              title: "Attendance",
              desc: "Daily session check-ins, subjects, and Spark history.",
              icon: CalendarCheck
            },
            {
              key: "projects" as ModuleKey,
              title: "Projects",
              desc: "Track client projects, sprints, tasks, and documents.",
              icon: FolderGit2
            },
            {
              key: "funds" as ModuleKey,
              title: "Treasury",
              desc: "Agency budget, capital raised, and financial goals.",
              icon: Coins
            },
            {
              key: "members" as ModuleKey,
              title: "Members",
              desc: "View team members, roles, and digital passes.",
              icon: Users
            },
            {
              key: "voting" as ModuleKey,
              title: "Voting",
              desc: "Vote on team decisions, polls, and feedback.",
              icon: Vote
            },
            {
              key: "ideation" as ModuleKey,
              title: "Proposals",
              desc: "Share new ideas, solutions, and project proposals.",
              icon: Lightbulb
            },
            {
              key: "docs" as ModuleKey,
              title: "Docs",
              desc: "Official agency notices, circulars, and executive templates.",
              icon: FileText
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className="p-5 bg-white/90 backdrop-blur-xs rounded-2xl border border-[#E5F2FF] hover:border-[#bae6fd] hover:shadow-xs transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-[#E5F2FF] text-[#087FC4] group-hover:bg-[#087FC4] group-hover:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#087FC4] group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="font-semibold text-xs text-[#101C34] group-hover:text-[#087FC4] transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-[#647895] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
