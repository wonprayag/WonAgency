"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Sparkles,
  Save,
  CheckCircle2,
  CalendarCheck2,
  ShieldAlert,
  Mail,
  User as UserIcon,
  Briefcase,
  FileText,
  Loader2,
  Lock,
  Sparkle
} from "lucide-react";
import { User, usersApi } from "../services/api";

interface ProfileModuleProps {
  user: User;
  onUpdateUser?: (updated: Partial<User>) => void;
}

export const ProfileModule: React.FC<ProfileModuleProps> = ({ user, onUpdateUser }) => {
  const [name, setName] = useState(user.name || "");
  const [department, setDepartment] = useState(user.department || "");
  const [bio, setBio] = useState(user.bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name || "");
    setDepartment(user.department || "");
    setBio(user.bio || "");
  }, [user.name, user.department, user.bio]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const targetId = user.id || (user as any)._id || user.email;
      const updated = await usersApi.updateProfile(targetId, {
        name: name.trim(),
        department: department.trim(),
        bio: bio.trim(),
      });
      if (onUpdateUser) {
        onUpdateUser({
          name: updated.name,
          department: updated.department,
          bio: updated.bio,
        });
      }
      setNotice("Personal profile changes saved successfully.");
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const roleBadgeText =
    user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user.role === "ADMIN"
      ? "Admin"
      : user.role === "LEAD"
      ? "Team Lead"
      : "Member";

  return (
    <div className="relative max-w-6xl mx-auto space-y-8 pb-14 animate-fadeIn">
      {/* Background Decorative Winter Accents (Subtle and non-intrusive) */}
      <div className="absolute -top-10 -right-10 w-96 h-96 opacity-20 pointer-events-none select-none z-0">
        <img
          src="/frosted-tree-birds.png"
          alt=""
          className="w-full h-full object-contain mix-blend-multiply"
        />
      </div>

      {/* Page Heading */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1 border-b border-[#E5F2FF] pb-4">
        <div>
          <h2 className="font-serif-fraunces text-2xl sm:text-3xl text-[#101C34] font-normal tracking-tight">
            Personal Profile
          </h2>
          <p className="text-xs sm:text-sm text-[#647895] mt-1 font-sans">
            Official agency identity pass, executive credentials, and performance milestones.
          </p>
        </div>
      </div>

      {/* Notice / Feedback Toast */}
      {notice && (
        <div className="relative z-10 p-3.5 bg-[#E5F2FF] text-[#0868AE] border border-[#bae6fd] rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#087FC4] shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-[#087FC4] hover:text-[#101C34] font-bold text-sm ml-3 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Layout: Left (42%) / Right (58%) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Identity Pass Card + Performance Statistics   */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Official Digital Executive Pass Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#F7FAFD] to-[#E9F3FE] p-6 sm:p-7 border border-[#D5E6F8] shadow-sm transition-all hover:shadow-md">
            
            {/* Mountain Panorama Graphic at Card Bottom */}
            <div className="absolute right-0 bottom-0 left-0 h-36 opacity-30 pointer-events-none select-none z-0">
              <img
                src="/mountain-panorama.png"
                alt=""
                className="w-full h-full object-cover object-bottom mix-blend-multiply opacity-50"
              />
            </div>

            {/* Card Content - Higher Z-Index */}
            <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
              
              {/* Header Strip: WON Logo + Pass Label + Super Admin Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E0EEFC]">
                <div className="flex items-center space-x-2.5">
                  <img
                    src="/won-logo.png"
                    alt="WON"
                    className="h-6 w-auto object-contain select-none"
                  />
                  <span className="h-3 w-[1px] bg-[#D0E4FA]" />
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-[#087FC4]">
                    Executive Pass
                  </span>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold tracking-wider uppercase shadow-2xs">
                  {roleBadgeText}
                </span>
              </div>

              {/* Avatar & User Details */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E0EEFC] to-[#BAE0FD] border-2 border-white shadow-xs text-[#0868AE] font-serif-fraunces font-bold text-2xl flex items-center justify-center shrink-0">
                  {user.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif-fraunces text-2xl font-normal text-[#101C34] leading-tight truncate">
                    {user.name}
                  </h3>
                  <p className="text-xs text-[#647895] font-sans mt-0.5 truncate">
                    {user.email}
                  </p>
                  <div className="mt-2 inline-flex items-center space-x-1.5 text-[10px] text-emerald-800 bg-emerald-50/90 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-semibold tracking-wide">Root Access Verified</span>
                  </div>
                </div>
              </div>

              {/* Credentials & Balance Footer Strip */}
              <div className="pt-4 border-t border-[#E0EEFC] grid grid-cols-2 gap-4 items-end">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#647895] block mb-0.5">
                    System E-ID
                  </span>
                  <span className="font-mono text-xs font-bold text-[#101C34] tracking-wider">
                    {user.eidNumber}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#647895] block mb-0.5">
                    Spark Balance
                  </span>
                  <span className="inline-flex items-center space-x-1 font-bold text-sm text-[#087FC4]">
                    <Sparkles className="w-3.5 h-3.5 text-[#087FC4]" />
                    <span>{user.sparkBalance.toFixed(2)} SPK</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Compact Statistics Tiles: Attendance Score + Bonds Default */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tile A: Attendance Score */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-[#E5F2FF] p-5 shadow-xs flex flex-col justify-between hover:border-[#bae6fd] transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647895]">
                  Attendance Score
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-serif-fraunces text-3xl text-[#101C34] tracking-tight">
                  100%
                </p>
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  Perfect track record
                </p>
              </div>
            </div>

            {/* Tile B: Bonds Default */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-[#E5F2FF] p-5 shadow-xs flex flex-col justify-between hover:border-[#bae6fd] transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647895]">
                  Bonds Default
                </span>
                <div className="p-1.5 rounded-lg bg-[#E5F2FF] text-[#087FC4]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-serif-fraunces text-3xl text-[#101C34] tracking-tight">
                  0
                </p>
                <p className="text-xs text-[#087FC4] font-medium mt-1">
                  Clean accountability
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Personal Information Form                   */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Section Header */}
          <div className="pb-4 border-b border-[#E5F2FF]">
            <h3 className="font-serif-fraunces text-xl sm:text-2xl text-[#101C34] font-normal tracking-tight">
              Personal Information
            </h3>
            <p className="text-xs text-[#647895] mt-1 font-sans">
              Manage your display identity, bio, and operational department.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Field 1: Full Name */}
            <div>
              <label className="text-xs font-semibold text-[#101C34] flex items-center space-x-1.5 mb-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#087FC4]" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full text-xs py-3 px-3.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] placeholder-slate-400 focus:outline-none focus:border-[#087FC4] focus:bg-white focus:ring-2 focus:ring-[#087FC4]/10 transition-all font-sans"
              />
            </div>

            {/* Field 2: Official Account Email (Read-only System Identifier) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#101C34] flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#087FC4]" />
                  <span>Official Account Email</span>
                </label>
                <span className="text-[10px] text-[#647895] flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Permanent Account ID</span>
                </span>
              </div>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full text-xs py-3 px-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-500 cursor-not-allowed select-none font-sans"
              />
            </div>

            {/* Field 3: Assigned Agency Department */}
            <div>
              <label className="text-xs font-semibold text-[#101C34] flex items-center space-x-1.5 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#087FC4]" />
                <span>Assigned Agency Department</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering & Design"
                className="w-full text-xs py-3 px-3.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] placeholder-slate-400 focus:outline-none focus:border-[#087FC4] focus:bg-white focus:ring-2 focus:ring-[#087FC4]/10 transition-all font-sans"
              />
            </div>

            {/* Field 4: About / Studio Bio */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#101C34] flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#087FC4]" />
                  <span>About / Studio Bio</span>
                </label>
                <span className="text-[10px] text-[#647895]">
                  Visible on agency digital passes & directory
                </span>
              </div>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your role, specialization, and focus in the agency..."
                className="w-full text-xs py-3 px-3.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] placeholder-slate-400 focus:outline-none focus:border-[#087FC4] focus:bg-white focus:ring-2 focus:ring-[#087FC4]/10 transition-all font-sans resize-none leading-relaxed"
              />
            </div>

            {/* Save Button Strip: Right-aligned, integrated */}
            <div className="pt-3 border-t border-[#E5F2FF] flex justify-end items-center">
              <button
                type="submit"
                disabled={isSaving}
                className="py-2.5 px-6 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs transition-all cursor-pointer hover:shadow-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
