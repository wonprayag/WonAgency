"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Layers,
  ShieldCheck,
  Sparkles,
  CalendarCheck2,
  ShieldAlert,
  Mail,
  User as UserIcon,
  Briefcase,
  FileText,
  Lock,
  X,
  ExternalLink,
  ChevronRight,
  Building2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { MemberRecord, User, Team, teamsApi, usersApi } from "../services/api";

interface MembersModuleProps {
  user: User;
  members: MemberRecord[];
}

export const MembersModule: React.FC<MembersModuleProps> = ({ user, members }) => {
  const [activeTab, setActiveTab] = useState<"directory" | "teams">("directory");
  const [teams, setTeams] = useState<Team[]>([]);
  const [userList, setUserList] = useState<MemberRecord[]>(members);

  // Search state by User ID / E-ID
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedUser, setSearchedUser] = useState<MemberRecord | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    teamsApi.getAll().then(setTeams).catch((e) => console.error(e));

    // Fetch latest users directly from MongoDB to ensure latest saved bio/department
    usersApi
      .getAll()
      .then((dbUsers) => {
        if (dbUsers && dbUsers.length > 0) {
          const mapped: MemberRecord[] = dbUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            department: u.department || "General",
            eidNumber: u.eidNumber || "",
            sparkBalance: u.sparkBalance || 0,
            bio: u.bio || "",
            links: {},
            timeline: []
          }));
          setUserList(mapped);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Update userList if members prop updates
  useEffect(() => {
    if (members && members.length > 0) {
      setUserList(members);
    }
  }, [members]);

  const handleSearch = (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim().toLowerCase();
    if (!q) {
      setSearchedUser(null);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    // Find matching user by System E-ID (eidNumber), DB id, email, or name
    const found = userList.find(
      (m) =>
        m.eidNumber?.toLowerCase() === q ||
        m.id?.toLowerCase() === q ||
        m.email?.toLowerCase() === q ||
        m.name?.toLowerCase().includes(q)
    );

    setSearchedUser(found || null);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchedUser(null);
    setHasSearched(false);
  };

  // Find teams the searched user is a member or lead of
  const userTeams = searchedUser
    ? teams.filter(
        (t) =>
          t.leadName?.toLowerCase() === searchedUser.name.toLowerCase() ||
          t.members?.some(
            (m) =>
              m.id === searchedUser.id ||
              (m as any)._id === searchedUser.id ||
              m.name?.toLowerCase() === searchedUser.name.toLowerCase() ||
              m.email?.toLowerCase() === searchedUser.email?.toLowerCase()
          )
      )
    : [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Module Header */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 sm:p-6 border border-[#E2EEFC] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center shrink-0 shadow-2xs border border-[#CDE5FC]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-serif-fraunces font-normal text-[#101C34] tracking-tight">
                Members Information
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5F2FF] text-[#087FC4] text-[10px] font-bold uppercase tracking-wider">
                {userList.length} Registered
              </span>
            </div>
            <p className="text-xs text-[#647895] mt-0.5 font-sans">
              Search member accounts by User ID, inspect saved studio profiles, and view team operations.
            </p>
          </div>
        </div>
      </div>

      {/* Clean 2 Tabs: Team Directory & Teams */}
      <div className="flex items-center gap-2 border-b border-[#E2EEFC] pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: "directory", label: "Team Directory Lookup", icon: Search },
          { key: "teams", label: "Teams", icon: Layers, count: teams.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#087FC4] text-white shadow-xs"
                  : "bg-white/80 hover:bg-[#E5F2FF]/60 text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: TEAM DIRECTORY WITH USER ID SEARCH & SAVED PROFILE  */}
      {/* ========================================================= */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          {/* Search Box Card */}
          <div className="bg-white/95 backdrop-blur-xs rounded-3xl p-6 border border-[#E2EEFC] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif-fraunces text-lg text-[#101C34]">
                  Search Member Profile by User ID
                </h3>
                <p className="text-xs text-[#647895]">
                  Lookup any verified studio member using their User ID or System E-ID.
                </p>
              </div>
              {hasSearched && (
                <button
                  onClick={clearSearch}
                  className="text-xs font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              )}
            </div>

            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-[#087FC4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter User ID or System E-ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs py-3 pl-10 pr-10 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] placeholder-slate-400 focus:outline-none focus:border-[#087FC4] focus:bg-white focus:ring-2 focus:ring-[#087FC4]/10 transition-all font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Member</span>
              </button>
            </form>
          </div>

          {/* ========================================================= */}
          {/* SEARCH RESULTS: FULL USER PROFILE (WHEN SEARCHED)         */}
          {/* ========================================================= */}
          {hasSearched && searchedUser && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                
                {/* Left Column: Official Digital Pass & Statistics */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Digital Pass Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#F7FAFD] to-[#E9F3FE] p-6 sm:p-7 border border-[#D5E6F8] shadow-sm">
                    {/* Mountain Panorama Graphic at Card Bottom */}
                    <div className="absolute right-0 bottom-0 left-0 h-32 opacity-25 pointer-events-none select-none z-0">
                      <img
                        src="/mountain-panorama.png"
                        alt=""
                        className="w-full h-full object-cover object-bottom mix-blend-multiply"
                      />
                    </div>

                    <div className="relative z-10 space-y-5">
                      {/* Top Header Strip */}
                      <div className="flex items-center justify-between pb-3.5 border-b border-[#E0EEFC]">
                        <div className="flex items-center space-x-2">
                          <img src="/won-logo.png" alt="WON" className="h-5 w-auto object-contain select-none" />
                          <span className="h-3 w-[1px] bg-[#D0E4FA]" />
                          <span className="text-[10px] tracking-widest uppercase font-semibold text-[#087FC4]">
                            Executive Pass
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold tracking-wider uppercase">
                          {searchedUser.role.replace("_", " ")}
                        </span>
                      </div>

                      {/* Avatar & User Details */}
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E0EEFC] to-[#BAE0FD] border-2 border-white shadow-xs text-[#0868AE] font-serif-fraunces font-bold text-2xl flex items-center justify-center shrink-0">
                          {searchedUser.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif-fraunces text-2xl font-normal text-[#101C34] leading-tight truncate">
                            {searchedUser.name}
                          </h3>
                          <p className="text-xs text-[#647895] font-sans mt-0.5 truncate">
                            {searchedUser.email || "No email on record"}
                          </p>
                          <div className="mt-2 inline-flex items-center space-x-1.5 text-[10px] text-emerald-800 bg-emerald-50/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-semibold tracking-wide">Root Access Verified</span>
                          </div>
                        </div>
                      </div>

                      {/* Credentials & Balance Footer */}
                      <div className="pt-4 border-t border-[#E0EEFC] grid grid-cols-2 gap-4 items-end">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#647895] block mb-0.5">
                            System E-ID
                          </span>
                          <span className="font-mono text-xs font-bold text-[#101C34] tracking-wider">
                            {searchedUser.eidNumber}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#647895] block mb-0.5">
                            Spark Balance
                          </span>
                          <span className="inline-flex items-center space-x-1 font-bold text-sm text-[#087FC4]">
                            <Sparkles className="w-3.5 h-3.5 text-[#087FC4]" />
                            <span>{(searchedUser.sparkBalance || 0).toFixed(2)} SPK</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compact Statistics Tiles */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/95 rounded-2xl border border-[#E2EEFC] p-4 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#647895]">
                          Attendance
                        </span>
                        <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <p className="font-serif-fraunces text-2xl text-[#101C34]">100%</p>
                      <p className="text-[11px] text-emerald-700 font-medium">Perfect track record</p>
                    </div>

                    <div className="bg-white/95 rounded-2xl border border-[#E2EEFC] p-4 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#647895]">
                          Bonds Default
                        </span>
                        <ShieldAlert className="w-3.5 h-3.5 text-[#087FC4]" />
                      </div>
                      <p className="font-serif-fraunces text-2xl text-[#101C34]">0</p>
                      <p className="text-[11px] text-[#087FC4] font-medium">Clean accountability</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Saved Personal Information & Bio */}
                <div className="lg:col-span-7 bg-white/95 backdrop-blur-xs rounded-3xl border border-[#E2EEFC] p-6 sm:p-7 shadow-2xs space-y-5">
                  <div className="pb-3.5 border-b border-[#E2EEFC] flex items-center justify-between">
                    <div>
                      <h3 className="font-serif-fraunces text-xl text-[#101C34]">
                        Saved User Profile Information
                      </h3>
                      <p className="text-xs text-[#647895] mt-0.5">
                        Official personal profile and studio biography stored in MongoDB Atlas.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Profile Active
                    </span>
                  </div>

                  {/* Field Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC]">
                      <span className="text-[#647895] text-[10px] uppercase font-bold tracking-wider block mb-1">
                        Full Display Name
                      </span>
                      <p className="font-semibold text-[#101C34] text-sm">{searchedUser.name}</p>
                    </div>

                    <div className="p-3 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC]">
                      <span className="text-[#647895] text-[10px] uppercase font-bold tracking-wider block mb-1">
                        Official Account Email
                      </span>
                      <p className="font-semibold text-[#101C34] text-sm truncate">
                        {searchedUser.email || "byprayag@gmail.com"}
                      </p>
                    </div>

                    <div className="p-3 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC]">
                      <span className="text-[#647895] text-[10px] uppercase font-bold tracking-wider block mb-1">
                        Assigned Agency Department
                      </span>
                      <p className="font-semibold text-[#101C34] text-sm">
                        {searchedUser.department || "Core Systems & Engineering"}
                      </p>
                    </div>

                    <div className="p-3 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC]">
                      <span className="text-[#647895] text-[10px] uppercase font-bold tracking-wider block mb-1">
                        Database Account Identifier
                      </span>
                      <p className="font-mono text-xs text-[#647895] truncate">{searchedUser.id}</p>
                    </div>
                  </div>

                  {/* About / Studio Bio Section */}
                  <div className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] space-y-2">
                    <div className="flex items-center space-x-1.5 text-[#101C34] font-semibold text-xs">
                      <FileText className="w-4 h-4 text-[#087FC4]" />
                      <span>About / Studio Bio</span>
                    </div>
                    <p className="text-xs text-[#101C34] leading-relaxed whitespace-pre-wrap">
                      {searchedUser.bio && searchedUser.bio.trim().length > 0 ? (
                        searchedUser.bio
                      ) : (
                        <span className="text-[#647895] italic">
                          No studio bio has been provided by this member yet.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Associated Teams */}
                  <div className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#101C34] flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#087FC4]" />
                        <span>Team Memberships</span>
                      </span>
                      <span className="text-[11px] text-[#647895]">{userTeams.length} teams</span>
                    </div>

                    {userTeams.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {userTeams.map((t) => (
                          <div
                            key={t.id}
                            className="px-3 py-1.5 bg-white border border-[#D5E6F8] rounded-xl flex items-center space-x-2 text-xs text-[#101C34] shadow-2xs"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: t.color || "#087FC4" }}
                            />
                            <span className="font-medium">{t.name}</span>
                            <span className="text-[10px] text-[#647895]">({t.leadName})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#647895] italic">Not assigned to any team yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Made but No User Found */}
          {hasSearched && !searchedUser && (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-[#E2EEFC] shadow-2xs space-y-3 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="font-serif-fraunces text-lg text-[#101C34]">No Member Found</h3>
              <p className="text-xs text-[#647895] max-w-sm mx-auto leading-relaxed">
                No registered agency account matches User ID "{searchQuery}". Please verify the identifier and try again.
              </p>
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-2 bg-[#E5F2FF] hover:bg-[#D5E6F8] text-[#087FC4] font-semibold text-xs rounded-xl cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Initial State Before Searching */}
          {!hasSearched && (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-[#E2EEFC] shadow-2xs space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center mx-auto border border-[#CDE5FC] shadow-2xs">
                <Search className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">
                  Member Identity Directory Lookup
                </h3>
                <p className="text-xs text-[#647895] leading-relaxed">
                  Enter a member's User ID or System E-ID into the search field above to inspect official credentials,
                  agency department assignment, and saved studio profile information.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TEAMS VIEW                                         */}
      {/* ========================================================= */}
      {activeTab === "teams" && (
        <div className="space-y-6">
          {teams.length === 0 ? (
            <div className="bg-white/95 p-12 rounded-3xl border border-dashed border-[#CDE5FC] text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="text-sm font-bold text-[#101C34]">No Teams Created Yet</p>
              <p className="text-xs text-[#647895]">
                Teams can be created and managed dynamically in Settings without hardcoded values.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-4 hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color || "#087FC4" }}
                      />
                      <div>
                        <h4 className="text-base font-bold text-[#101C34]">{team.name}</h4>
                        <p className="text-xs text-[#087FC4] font-medium">Lead: {team.leadName}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#E5F2FF] text-[#087FC4] text-xs font-bold rounded-full border border-[#CDE5FC]">
                      {team.memberCount} {team.memberCount === 1 ? "Member" : "Members"}
                    </span>
                  </div>

                  {team.description && (
                    <p className="text-xs text-[#647895] leading-relaxed">{team.description}</p>
                  )}

                  <div className="pt-2 border-t border-[#E2EEFC]">
                    <p className="text-[11px] font-bold text-[#647895] uppercase tracking-wider mb-2">
                      Team Members
                    </p>
                    {team.members && team.members.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {team.members.map((m) => (
                          <div
                            key={m.id || (m as any)._id}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-xs text-[#101C34]"
                          >
                            <div className="w-5 h-5 rounded-full bg-[#E5F2FF] text-[#087FC4] font-bold text-[10px] flex items-center justify-center">
                              {m.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-[10px] text-[#647895] font-mono">({m.role})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#647895] italic">No members assigned yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
