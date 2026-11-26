"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Bell,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  UserPlus,
  Trash2,
  Check,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  AlertTriangle,
  Plus,
  X,
  UserCheck,
  UserX,
  Briefcase
} from "lucide-react";
import { User, authApi, usersApi, Team, teamsApi } from "../services/api";

const AVAILABLE_MODULES = [
  { key: "dashboard", label: "Dashboard", desc: "Overview, quick stats, and today's session" },
  { key: "attendance", label: "Attendance", desc: "Daily check-in, attendance records, and schedule" },
  { key: "projects", label: "Projects", desc: "Project boards, tasks, and files" },
  { key: "members", label: "Members", desc: "Team directory, member cards, and roles" },
  { key: "voting", label: "Voting", desc: "Team votes, polls, and feedback" },
  { key: "ideation", label: "Proposals", desc: "Share ideas and submit proposals" },
  { key: "funds", label: "Treasury", desc: "Funds, budget, and expenses" },
];

const PRESET_COLORS = [
  { name: "Blue", hex: "#087FC4" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Emerald", hex: "#059669" },
  { name: "Amber", hex: "#D97706" },
  { name: "Rose", hex: "#E11D48" },
  { name: "Indigo", hex: "#4F46E5" },
];

interface SettingsModuleProps {
  user: User;
  onUpdateUser?: (updated: Partial<User>) => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<
    "security" | "provisioning" | "preferences" | "notifications" | "workspace"
  >("security");

  // Sub-section within Team Members tab: "members" or "teams"
  const [memberSection, setMemberSection] = useState<"members" | "teams">("members");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // User Management State (MongoDB)
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [newRole, setNewRole] = useState<"MEMBER" | "LEAD" | "ADMIN" | "SUPER_ADMIN">("MEMBER");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [newSparkBalance, setNewSparkBalance] = useState<number>(0);
  const [newEid, setNewEid] = useState("");
  const [selectedScope, setSelectedScope] = useState<string[]>([
    "dashboard",
    "attendance",
    "projects",
  ]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [provisionFeedback, setProvisionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Editing existing user scope
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingScope, setEditingScope] = useState<string[]>([]);
  const [isUpdatingScope, setIsUpdatingScope] = useState(false);

  // In-app Delete Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // In-app Team Delete Confirmation Modal State
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  // Teams Management State (MongoDB)
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamLead, setNewTeamLead] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#087FC4");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamFeedback, setTeamFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Add person to existing team state
  const [teamToAddMemberTo, setTeamToAddMemberTo] = useState<string | null>(null);
  const [selectedUserForTeam, setSelectedUserForTeam] = useState<string>("");
  const [isAddingMemberToTeam, setIsAddingMemberToTeam] = useState(false);

  // Load database users
  const loadUsers = () => {
    setIsLoadingUsers(true);
    usersApi
      .getAll()
      .then((users) => setDbUsers(users))
      .catch((e) => console.error("Error loading users:", e))
      .finally(() => setIsLoadingUsers(false));
  };

  // Load teams
  const loadTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const list = await teamsApi.getAll();
      setTeams(list);
      if (list.length > 0 && !selectedTeamName) {
        setSelectedTeamName(list[0].name);
      }
    } catch (e) {
      console.error("Error loading teams:", e);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (activeTab === "provisioning" || user.role === "SUPER_ADMIN") {
      loadUsers();
      loadTeams();
    }
  }, [activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionFeedback(null);

    if (!newName.trim() || !newEmail.trim() || !newUserPass.trim()) {
      setProvisionFeedback({
        type: "error",
        message: "Please enter a name, email address, and password.",
      });
      return;
    }

    if (newUserPass.length < 6) {
      setProvisionFeedback({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    if (selectedScope.length === 0) {
      setProvisionFeedback({
        type: "error",
        message: "Please select at least one page this member can access.",
      });
      return;
    }

    setIsCreatingUser(true);

    try {
      const assignedDept = selectedTeamName.trim();

      const created = await usersApi.create({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        pass: newUserPass,
        role: newRole,
        department: assignedDept,
        sparkBalance: Number(newSparkBalance) || 0,
        eidNumber: newEid.trim() || `WON-${Math.floor(1000 + Math.random() * 9000)}`,
        allowedModules: selectedScope,
      });

      // If team selected, also register member to team in MongoDB
      if (assignedDept) {
        const matchingTeam = teams.find((t) => t.name === assignedDept);
        if (matchingTeam) {
          try {
            await teamsApi.addMember(matchingTeam.id, created.id || (created as any)._id);
            await loadTeams();
          } catch (teamErr) {
            console.error("Error linking user to team:", teamErr);
          }
        }
      }

      setDbUsers([created, ...dbUsers.filter((u) => u.email !== created.email)]);
      setNewName("");
      setNewEmail("");
      setNewUserPass("");
      setNewEid("");
      setNewSparkBalance(0);
      setSelectedScope(["dashboard", "attendance", "projects"]);

      setProvisionFeedback({
        type: "success",
        message: assignedDept
          ? `Account for ${created.name} (${created.email}) created and added to team "${assignedDept}"!`
          : `Account for ${created.name} (${created.email}) created successfully!`,
      });

      setTimeout(() => setProvisionFeedback(null), 5000);
    } catch (err: any) {
      setProvisionFeedback({
        type: "error",
        message: err.message || "Could not create user account. Please try again.",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSaveScope = async (targetUser: User) => {
    const idToUpdate = targetUser.id || (targetUser as any)._id || targetUser.email;
    setIsUpdatingScope(true);
    try {
      await usersApi.updateScope(idToUpdate, editingScope);
      setDbUsers(
        dbUsers.map((u) => {
          const match = (u.id && u.id === idToUpdate) || ((u as any)._id && (u as any)._id === idToUpdate) || u.email === targetUser.email;
          return match ? { ...u, allowedModules: editingScope } : u;
        })
      );
      setEditingUserId(null);
      setNotice(`Allowed pages updated for ${targetUser.name}.`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice(`Failed to update pages: ${err.message}`);
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsUpdatingScope(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const idToDelete = userToDelete.id || (userToDelete as any)._id || userToDelete.email;
      await usersApi.delete(idToDelete);
      setDbUsers((prev) =>
        prev.filter((u) => {
          const match =
            (u.id && u.id === idToDelete) ||
            ((u as any)._id && (u as any)._id === idToDelete) ||
            u.email.toLowerCase() === userToDelete.email.toLowerCase();
          return !match;
        })
      );
      setNotice(`Account for ${userToDelete.name} was successfully deleted.`);
      setUserToDelete(null);
      await loadTeams();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice(`Could not delete account: ${err.message}`);
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Create Team Handler
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamFeedback(null);

    if (!newTeamName.trim()) {
      setTeamFeedback({ type: "error", message: "Team name is required." });
      return;
    }

    setIsCreatingTeam(true);
    try {
      const created = await teamsApi.create({
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        leadName: newTeamLead.trim(),
        color: newTeamColor,
      });

      const updatedTeams = [created, ...teams.filter((t) => t.name !== created.name)];
      setTeams(updatedTeams);
      setSelectedTeamName(created.name);
      setNewTeamName("");
      setNewTeamDesc("");
      setNewTeamLead("");
      setIsCreateTeamOpen(false);
      setNotice(`Team "${created.name}" created successfully!`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setTeamFeedback({ type: "error", message: err.message || "Failed to create team." });
    } finally {
      setIsCreatingTeam(false);
    }
  };

  // Delete Team Handler with In-app Confirmation
  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    setIsDeletingTeam(true);
    try {
      const idToDelete = teamToDelete.id || (teamToDelete as any)._id || teamToDelete.name;
      await teamsApi.delete(idToDelete);
      setTeams((prev) => prev.filter((t) => (t.id || (t as any)._id) !== idToDelete && t.name !== teamToDelete.name));
      if (selectedTeamName === teamToDelete.name) {
        setSelectedTeamName("");
      }
      setNotice(`Team "${teamToDelete.name}" deleted successfully.`);
      setTeamToDelete(null);
      loadUsers();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice(`Could not delete team: ${err.message}`);
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsDeletingTeam(false);
    }
  };

  // Add Member to Team Handler
  const handleAddMemberToTeam = async (teamId: string) => {
    if (!selectedUserForTeam) return;
    setIsAddingMemberToTeam(true);
    try {
      const updated = await teamsApi.addMember(teamId, selectedUserForTeam);
      setTeams(updated);
      setSelectedUserForTeam("");
      setTeamToAddMemberTo(null);
      loadUsers(); // Refresh department in users list
      setNotice("Member added to team successfully!");
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice(`Failed to add member to team: ${err.message}`);
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsAddingMemberToTeam(false);
    }
  };

  // Remove Member from Team Handler
  const handleRemoveMemberFromTeam = async (teamId: string, userId: string, memberName: string) => {
    try {
      const updated = await teamsApi.removeMember(teamId, userId);
      setTeams(updated);
      loadUsers();
      setNotice(`${memberName} removed from team.`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice(`Failed to remove member: ${err.message}`);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  // Studio Theme State
  const [selectedTheme, setSelectedTheme] = useState("winter");

  // Notifications State
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [sparkAlerts, setSparkAlerts] = useState(true);
  const [proposalAlerts, setProposalAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  // Workspace Settings
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST +05:30)");
  const [autoLockMinutes, setAutoLockMinutes] = useState("30");

  const [notice, setNotice] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({
        type: "error",
        message: "New password must be at least 6 characters long."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "New passwords do not match."
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const result = await authApi.changePassword(user.email, currentPassword, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordFeedback({
        type: "success",
        message: result.message || "Password updated successfully!"
      });

      setTimeout(() => setPasswordFeedback(null), 5000);
    } catch (err: any) {
      setPasswordFeedback({
        type: "error",
        message: err.message || "The current password you entered is incorrect. Please try again."
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    setNotice("Settings saved successfully.");
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-serif-fraunces text-2xl sm:text-3xl text-[#101C34] font-normal tracking-tight">
            Settings
          </h2>
          <p className="text-xs sm:text-sm text-[#647895] mt-1">
            Manage your password, teams, members, theme, and alerts.
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-[#E5F2FF] text-[#0868AE] border border-[#bae6fd] rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs animate-fadeIn">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-[#087FC4] font-bold ml-2">✕</button>
        </div>
      )}

      {/* Settings Navigation Tabs Strip */}
      <div className="border-b border-[#E5F2FF] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { key: "security", label: "Password & Security", icon: Lock },
            ...((user.role === "SUPER_ADMIN" || user.role === "ADMIN")
              ? [{ key: "provisioning", label: "Team Members & Teams", icon: Users }]
              : []),
            { key: "preferences", label: "Theme & Look", icon: Palette },
            { key: "notifications", label: "Notifications", icon: Bell },
            { key: "workspace", label: "Preferences", icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#E5F2FF] text-[#087FC4] font-semibold border border-[#bae6fd]/60 shadow-2xs"
                    : "text-[#647895] hover:text-[#101C34] hover:bg-[#F1F7FD]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#087FC4]" : "text-[#647895]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Password & Security */}
      {activeTab === "security" && (
        <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="font-serif-fraunces text-xl text-[#101C34]">Change Password</h3>
            <p className="text-xs text-[#647895] mt-0.5">
              Keep your account safe by updating your password regularly.
            </p>
          </div>

          {passwordFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-medium flex items-center space-x-2.5 transition-all animate-fadeIn ${
                passwordFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {passwordFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{passwordFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#101C34] block mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full text-xs p-3 pr-10 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#647895] hover:text-[#101C34]"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full text-xs p-3 pr-10 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#647895] hover:text-[#101C34]"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1.5">Confirm New Password</label>
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="p-3 bg-[#F8FBFF] rounded-xl border border-[#E5F2FF] flex items-center space-x-2.5 text-xs text-[#647895]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Two-factor security protection is active for {user.email}.</span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="py-2.5 px-5 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-medium rounded-xl flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Team Members & Teams Management */}
      {activeTab === "provisioning" && (
        <div className="space-y-8 max-w-4xl">
          {/* Section 1: Add New Member Form */}
          <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-[#E5F2FF] text-[#087FC4]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-fraunces text-xl text-[#101C34]">
                    Add New Member
                  </h3>
                  <p className="text-xs text-[#647895] mt-0.5">
                    Create an account, assign them to a team, and choose which pages they can see.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateTeamOpen(true)}
                className="py-2 px-3.5 bg-[#F1F7FD] hover:bg-[#E5F2FF] text-[#087FC4] border border-[#bae6fd] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Team</span>
              </button>
            </div>

            {provisionFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-medium flex items-center space-x-2.5 transition-all animate-fadeIn ${
                  provisionFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {provisionFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{provisionFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya Chen"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. maya@wonoriginals.agency"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showNewUserPass ? "text" : "password"}
                      required
                      placeholder="At least 6 characters"
                      value={newUserPass}
                      onChange={(e) => setNewUserPass(e.target.value)}
                      className="w-full text-xs p-3 pr-10 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPass(!showNewUserPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#647895] hover:text-[#101C34]"
                    >
                      {showNewUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                  >
                    <option value="MEMBER">Member (Standard)</option>
                    <option value="LEAD">Team Lead</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                {/* Team Selector with Real Teams from MongoDB */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#101C34]">
                      Team *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreateTeamOpen(true)}
                      className="text-[11px] font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Team</span>
                    </button>
                  </div>
                  <select
                    value={selectedTeamName}
                    onChange={(e) => setSelectedTeamName(e.target.value)}
                    className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                  >
                    <option value="">No Team (Unassigned)</option>
                    {teams.map((t) => (
                      <option key={t.id || (t as any)._id} value={t.name}>
                        {t.name} ({t.memberCount} {t.memberCount === 1 ? "member" : "members"})
                      </option>
                    ))}
                  </select>
                  {teams.length === 0 && (
                    <p className="text-[11px] text-[#647895] mt-1">
                      No teams created yet. Click <button type="button" onClick={() => setIsCreateTeamOpen(true)} className="text-[#087FC4] font-semibold underline cursor-pointer">+ Create Team</button> to add one.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">Starting Sparks (SPK)</label>
                  <input
                    type="number"
                    step="0.25"
                    placeholder="0.00"
                    value={newSparkBalance}
                    onChange={(e) => setNewSparkBalance(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                  />
                </div>
              </div>

              {/* Scope Selection Box */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div>
                    <label className="text-xs font-bold text-[#101C34] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#087FC4]" />
                      <span>Allowed Pages *</span>
                    </label>
                    <p className="text-[11px] text-[#647895]">
                      Select which pages this member can open in their portal.
                    </p>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedScope(AVAILABLE_MODULES.map((m) => m.key))}
                      className="text-[10px] font-semibold px-2.5 py-1 bg-[#E5F2FF] text-[#087FC4] hover:bg-[#bae6fd]/50 rounded-lg transition-colors cursor-pointer"
                    >
                      All Pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedScope(["dashboard", "attendance", "projects", "members"])}
                      className="text-[10px] font-semibold px-2.5 py-1 bg-[#F1F7FD] text-[#647895] hover:bg-[#E5F2FF] rounded-lg transition-colors cursor-pointer"
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedScope(["dashboard", "attendance"])}
                      className="text-[10px] font-semibold px-2.5 py-1 bg-[#F1F7FD] text-[#647895] hover:bg-[#E5F2FF] rounded-lg transition-colors cursor-pointer"
                    >
                      Basic
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = selectedScope.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedScope(selectedScope.filter((k) => k !== mod.key));
                          } else {
                            setSelectedScope([...selectedScope, mod.key]);
                          }
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start space-x-2.5 ${
                          isChecked
                            ? "bg-[#F8FBFF] border-[#087FC4] shadow-2xs"
                            : "bg-white border-[#E5F2FF] hover:border-[#bae6fd] opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="pt-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#087FC4]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold ${isChecked ? "text-[#087FC4]" : "text-[#101C34]"}`}>
                            {mod.label}
                          </p>
                          <p className="text-[10px] text-[#647895] leading-tight mt-0.5 truncate">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="py-3 px-6 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
                >
                  {isCreatingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Management of Team Members and Teams */}
          <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5F2FF]">
              <div>
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">
                  {memberSection === "members" ? "Team Members" : "Teams & Groups"}
                </h3>
                <p className="text-xs text-[#647895] mt-0.5">
                  {memberSection === "members"
                    ? "See all accounts, change what pages they can open, or remove them."
                    : "Create teams, add persons to teams, and manage group assignments."}
                </p>
              </div>

              {/* Sub-tab pills: Members vs Teams */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="p-1 bg-[#F1F7FD] border border-[#E5F2FF] rounded-2xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMemberSection("members")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      memberSection === "members"
                        ? "bg-white text-[#087FC4] shadow-2xs"
                        : "text-[#647895] hover:text-[#101C34]"
                    }`}
                  >
                    Members ({dbUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberSection("teams")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      memberSection === "teams"
                        ? "bg-white text-[#087FC4] shadow-2xs"
                        : "text-[#647895] hover:text-[#101C34]"
                    }`}
                  >
                    Teams ({teams.length})
                  </button>
                </div>

                {memberSection === "teams" ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamOpen(true)}
                    className="text-xs font-semibold text-white bg-[#087FC4] hover:bg-[#0868AE] px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Create Team</span>
                  </button>
                ) : (
                  <button
                    onClick={loadUsers}
                    className="text-xs font-semibold text-[#087FC4] hover:text-[#0868AE] px-3 py-1.5 bg-[#E5F2FF] rounded-xl cursor-pointer"
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>

            {/* SUB-VIEW 1: MEMBERS LIST */}
            {memberSection === "members" && (
              <>
                {isLoadingUsers ? (
                  <div className="py-8 text-center text-xs text-[#647895] flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#087FC4]" />
                    <span>Loading team members...</span>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {dbUsers.map((u) => {
                      const userKey = u.id || (u as any)._id || u.email;
                      const isEditing = editingUserId === userKey;
                      const currentAllowed = u.allowedModules || AVAILABLE_MODULES.map((m) => m.key);
                      const isSuperAdmin = u.role === "SUPER_ADMIN" || u.email.toLowerCase() === "byprayag@gmail.com";

                      return (
                        <div
                          key={userKey}
                          className="p-4 rounded-2xl bg-[#F8FBFF] border border-[#E5F2FF] space-y-3 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-[#E5F2FF] border border-[#bae6fd] text-[#087FC4] font-bold text-xs flex items-center justify-center shrink-0">
                                {u.name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs font-bold text-[#101C34]">{u.name}</p>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    {u.role === "SUPER_ADMIN" ? "Super Admin" : u.role === "ADMIN" ? "Admin" : u.role === "LEAD" ? "Lead" : "Member"}
                                  </span>
                                  {u.department && (
                                    <span className="text-[10px] font-semibold text-[#087FC4] bg-[#E5F2FF] px-2 py-0.5 rounded-full border border-[#bae6fd]/60">
                                      {u.department}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#647895] mt-0.5">{u.email} • {u.eidNumber}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 self-start sm:self-auto">
                              <button
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingUserId(null);
                                  } else {
                                    setEditingUserId(userKey);
                                    setEditingScope(currentAllowed);
                                  }
                                }}
                                className="py-1.5 px-3 bg-white hover:bg-[#E5F2FF] text-[#087FC4] border border-[#bae6fd] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                              >
                                {isEditing ? "Close" : "Edit Access"}
                              </button>
                              {!isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Display Scope Badges */}
                          {!isEditing && (
                            <div className="pt-2 border-t border-[#E5F2FF] flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-[#647895] mr-1">Allowed Pages:</span>
                              {currentAllowed.map((modKey) => {
                                const modInfo = AVAILABLE_MODULES.find((m) => m.key === modKey);
                                return (
                                  <span
                                    key={modKey}
                                    className="text-[10px] font-semibold px-2 py-0.5 bg-[#E5F2FF] text-[#087FC4] rounded-md border border-[#bae6fd]/50"
                                  >
                                    {modInfo?.label || modKey}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Inline Scope Editor */}
                          {isEditing && (
                            <div className="pt-3 border-t border-[#E5F2FF] space-y-3 animate-fadeIn">
                              <p className="text-xs font-bold text-[#101C34]">
                                Allowed pages for {u.name}:
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {AVAILABLE_MODULES.map((m) => {
                                  const active = editingScope.includes(m.key);
                                  return (
                                    <button
                                      type="button"
                                      key={m.key}
                                      onClick={() => {
                                        if (active) {
                                          setEditingScope(editingScope.filter((k) => k !== m.key));
                                        } else {
                                          setEditingScope([...editingScope, m.key]);
                                        }
                                      }}
                                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                        active
                                          ? "bg-[#E5F2FF] text-[#087FC4] border-[#087FC4]"
                                          : "bg-white text-[#647895] border-[#E5F2FF]"
                                      }`}
                                    >
                                      <span>{m.label}</span>
                                      {active && <Check className="w-3.5 h-3.5 text-[#087FC4]" />}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex justify-end space-x-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="py-1.5 px-3 rounded-xl text-xs font-medium text-[#647895] hover:bg-[#E5F2FF] cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveScope(u)}
                                  disabled={isUpdatingScope}
                                  className="py-1.5 px-4 rounded-xl text-xs font-semibold bg-[#087FC4] hover:bg-[#0868AE] text-white shadow-2xs cursor-pointer"
                                >
                                  {isUpdatingScope ? "Saving..." : "Save Access"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* SUB-VIEW 2: TEAMS & ADDING PERSONS */}
            {memberSection === "teams" && (
              <div className="space-y-5">
                {isLoadingTeams ? (
                  <div className="py-8 text-center text-xs text-[#647895] flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#087FC4]" />
                    <span>Loading teams...</span>
                  </div>
                ) : teams.length === 0 ? (
                  <div className="p-8 text-center bg-[#F8FBFF] rounded-2xl border border-dashed border-[#bae6fd] space-y-3">
                    <Briefcase className="w-8 h-8 text-[#087FC4] mx-auto" />
                    <p className="text-xs font-semibold text-[#101C34]">No Teams Created Yet</p>
                    <p className="text-xs text-[#647895]">Create your first team to group members and assign responsibilities.</p>
                    <button
                      type="button"
                      onClick={() => setIsCreateTeamOpen(true)}
                      className="px-4 py-2 bg-[#087FC4] text-white text-xs font-semibold rounded-xl shadow-xs"
                    >
                      + Create First Team
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5">
                    {teams.map((t) => {
                      const isAdding = teamToAddMemberTo === t.id;
                      // Find users who are not yet in this team
                      const currentMemberIds = new Set((t.members || []).map((m) => m.id || (m as any)._id));
                      const availableUsersToAdd = dbUsers.filter(
                        (u) => !currentMemberIds.has(u.id || (u as any)._id)
                      );

                      return (
                        <div
                          key={t.id}
                          className="bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] p-5 space-y-4 shadow-2xs hover:border-[#bae6fd] transition-all"
                        >
                          {/* Team Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5F2FF]">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-3.5 h-3.5 rounded-full shrink-0"
                                style={{ backgroundColor: t.color || "#087FC4" }}
                              />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-bold text-[#101C34]">{t.name}</h4>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#bae6fd] text-[#087FC4]">
                                    {t.memberCount} {t.memberCount === 1 ? "Member" : "Members"}
                                  </span>
                                </div>
                                <p className="text-xs text-[#647895] mt-0.5">
                                  {t.leadName ? (
                                    <>Lead: <span className="font-semibold text-[#101C34]">{t.leadName}</span></>
                                  ) : (
                                    <span className="italic text-slate-400">No Lead assigned</span>
                                  )}
                                  {t.description && ` • ${t.description}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAdding) {
                                    setTeamToAddMemberTo(null);
                                    setSelectedUserForTeam("");
                                  } else {
                                    setTeamToAddMemberTo(t.id);
                                    if (availableUsersToAdd.length > 0) {
                                      setSelectedUserForTeam(availableUsersToAdd[0].id || (availableUsersToAdd[0] as any)._id);
                                    }
                                  }
                                }}
                                className="py-1.5 px-3 bg-white hover:bg-[#E5F2FF] text-[#087FC4] border border-[#bae6fd] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>{isAdding ? "Cancel" : "+ Add Person"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTeamToDelete(t)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Team"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Inline: Add Person To Team */}
                          {isAdding && (
                            <div className="p-3 bg-white rounded-xl border border-[#bae6fd] space-y-2 animate-fadeIn">
                              <p className="text-xs font-bold text-[#101C34] flex items-center space-x-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-[#087FC4]" />
                                <span>Add a person to {t.name}:</span>
                              </p>
                              {availableUsersToAdd.length === 0 ? (
                                <p className="text-xs text-[#647895]">All registered members are already in this team!</p>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <select
                                    value={selectedUserForTeam}
                                    onChange={(e) => setSelectedUserForTeam(e.target.value)}
                                    className="flex-1 text-xs p-2.5 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                                  >
                                    {availableUsersToAdd.map((u) => (
                                      <option key={u.id || (u as any)._id} value={u.id || (u as any)._id}>
                                        {u.name} ({u.email} - currently {u.department || "No team"})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={isAddingMemberToTeam || !selectedUserForTeam}
                                    onClick={() => handleAddMemberToTeam(t.id)}
                                    className="px-4 py-2 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                                  >
                                    {isAddingMemberToTeam ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Adding...</span>
                                      </>
                                    ) : (
                                      <span>Add Person to Team</span>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Persons in this Team */}
                          <div>
                            <p className="text-[11px] font-semibold text-[#647895] mb-2">Team Members:</p>
                            {t.members && t.members.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {t.members.map((m) => (
                                  <div
                                    key={m.id || (m as any)._id}
                                    className="p-2.5 bg-white rounded-xl border border-[#E5F2FF] flex items-center justify-between shadow-2xs"
                                  >
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-full bg-[#E5F2FF] text-[#087FC4] font-bold text-xs flex items-center justify-center shrink-0">
                                        {m.name.split(" ").map((n) => n[0]).join("")}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[#101C34] truncate">{m.name}</p>
                                        <p className="text-[10px] text-[#647895] truncate">{m.role} • {m.eidNumber}</p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMemberFromTeam(t.id, m.id || (m as any)._id, m.name)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors ml-2 cursor-pointer shrink-0"
                                      title="Remove from team"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 bg-white rounded-xl border border-dashed border-[#bae6fd] text-center">
                                <p className="text-xs text-[#647895]">No members assigned to this team yet. Click <strong className="text-[#087FC4]">+ Add Person</strong> above to add someone!</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Theme & Look */}
      {activeTab === "preferences" && (
        <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="font-serif-fraunces text-xl text-[#101C34]">Theme & Look</h3>
            <p className="text-xs text-[#647895] mt-0.5">
              Choose the visual style and colors for your portal.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setSelectedTheme("winter")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTheme === "winter"
                    ? "bg-[#F8FBFF] border-[#087FC4] ring-2 ring-[#E5F2FF]"
                    : "bg-white border-[#E5F2FF] hover:bg-[#F8FBFF]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-[#101C34]">Winter Blue</span>
                  {selectedTheme === "winter" && (
                    <span className="w-2 h-2 rounded-full bg-[#087FC4]" />
                  )}
                </div>
                <p className="text-[11px] text-[#647895]">Soft blues, frosted mountain vistas, and serif typography.</p>
                <span className="inline-block mt-3 px-2 py-0.5 bg-[#E5F2FF] text-[#087FC4] rounded text-[10px] font-semibold">Active</span>
              </div>

              <div
                onClick={() => setSelectedTheme("minimal")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTheme === "minimal"
                    ? "bg-[#F8FBFF] border-[#087FC4] ring-2 ring-[#E5F2FF]"
                    : "bg-white border-[#E5F2FF] hover:bg-[#F8FBFF]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-[#101C34]">Clean White</span>
                  {selectedTheme === "minimal" && (
                    <span className="w-2 h-2 rounded-full bg-[#087FC4]" />
                  )}
                </div>
                <p className="text-[11px] text-[#647895]">Clean whites, light borders, and simple modern layout.</p>
                <span className="inline-block mt-3 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">Preset</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSavePreferences}
                className="py-2.5 px-5 bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Apply Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Notifications */}
      {activeTab === "notifications" && (
        <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="font-serif-fraunces text-xl text-[#101C34]">Notification Settings</h3>
            <p className="text-xs text-[#647895] mt-0.5">
              Choose which alerts you want to receive.
            </p>
          </div>

          <div className="space-y-3">
            <label className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-xs text-[#101C34]">Daily Attendance Alerts</p>
                <p className="text-[11px] text-[#647895]">Get alerts when session check-in opens and closes</p>
              </div>
              <input
                type="checkbox"
                checked={attendanceAlerts}
                onChange={(e) => setAttendanceAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#087FC4]"
              />
            </label>

            <label className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-xs text-[#101C34]">Spark Balance Updates</p>
                <p className="text-[11px] text-[#647895]">Get notified when you earn or spend Sparks</p>
              </div>
              <input
                type="checkbox"
                checked={sparkAlerts}
                onChange={(e) => setSparkAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#087FC4]"
              />
            </label>

            <label className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-xs text-[#101C34]">Voting & Idea Alerts</p>
                <p className="text-[11px] text-[#647895]">Get notified when someone posts a poll or new idea</p>
              </div>
              <input
                type="checkbox"
                checked={proposalAlerts}
                onChange={(e) => setProposalAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#087FC4]"
              />
            </label>

            <label className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-xs text-[#101C34]">Weekly Email Summary</p>
                <p className="text-[11px] text-[#647895]">Receive a weekly summary email</p>
              </div>
              <input
                type="checkbox"
                checked={emailDigest}
                onChange={(e) => setEmailDigest(e.target.checked)}
                className="w-4 h-4 accent-[#087FC4]"
              />
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="py-2.5 px-5 bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Save Notification Preferences
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Preferences */}
      {activeTab === "workspace" && (
        <div className="bg-white/90 backdrop-blur-xs rounded-3xl border border-[#E5F2FF] p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="font-serif-fraunces text-xl text-[#101C34]">System Preferences</h3>
            <p className="text-xs text-[#647895] mt-0.5">
              General settings for currency, timezone, and auto-lock.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-[#101C34]">Currency</p>
                <p className="text-[11px] text-[#647895]">Used across projects and treasury</p>
              </div>
              <span className="px-3 py-1 bg-[#E5F2FF] text-[#087FC4] border border-[#bae6fd] text-xs font-bold rounded-xl font-mono">
                INR (₹)
              </span>
            </div>

            <div className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-[#101C34]">Timezone</p>
                <p className="text-[11px] text-[#647895]">Used for attendance and session times</p>
              </div>
              <span className="text-xs font-semibold text-[#101C34]">{timezone}</span>
            </div>

            <div className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E5F2FF] flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-[#101C34]">Auto-Lock Timer</p>
                <p className="text-[11px] text-[#647895]">Log out automatically when inactive for</p>
              </div>
              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(e.target.value)}
                className="text-xs bg-white border border-[#E5F2FF] rounded-xl px-3 py-1.5 text-[#101C34] focus:outline-none focus:border-[#087FC4]"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="never">Never (Stay logged in)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create New Team Modal */}
      {isCreateTeamOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5F2FF] shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5F2FF]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#E5F2FF] text-[#087FC4]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif-fraunces text-lg text-[#101C34]">Create New Team</h4>
                  <p className="text-xs text-[#647895]">Group members and assign team leads.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTeamOpen(false)}
                className="p-1.5 text-slate-400 hover:text-[#101C34] rounded-lg hover:bg-[#F1F7FD]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {teamFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                  teamFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{teamFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Engineering, Design Systems"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Builds core mobile app architecture and UI"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Team Lead (Optional)
                </label>
                <select
                  value={newTeamLead}
                  onChange={(e) => setNewTeamLead(e.target.value)}
                  className="w-full text-xs p-3 bg-[#F1F7FD] border border-[#E5F2FF] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] focus:bg-white"
                >
                  <option value="">None (No Lead assigned)</option>
                  {dbUsers.map((u) => (
                    <option key={u.id || (u as any)._id} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#647895] mt-1">
                  Leave as "None" if this team doesn't have a lead.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1.5">
                  Badge Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      type="button"
                      key={col.hex}
                      onClick={() => setNewTeamColor(col.hex)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        newTeamColor === col.hex ? "scale-115 ring-2 ring-offset-2 ring-[#087FC4]" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: col.hex }}
                    >
                      {newTeamColor === col.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end items-center space-x-2 pt-3 border-t border-[#E5F2FF]">
                <button
                  type="button"
                  disabled={isCreatingTeam}
                  onClick={() => setIsCreateTeamOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#647895] hover:bg-[#F1F7FD] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeam}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#087FC4] hover:bg-[#0868AE] text-white shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  {isCreatingTeam ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Team...</span>
                    </>
                  ) : (
                    <span>Create Team</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: In-app Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5F2FF] shadow-2xl max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h4 className="font-serif-fraunces text-lg text-[#101C34]">Delete Account?</h4>
                <p className="text-xs text-[#647895]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#647895] leading-relaxed">
              Are you sure you want to delete the account for{" "}
              <strong className="text-[#101C34] font-semibold">{userToDelete.name}</strong> ({userToDelete.email})?
              They will no longer be able to log in to the portal.
            </p>

            <div className="flex justify-end items-center space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#647895] hover:bg-[#F1F7FD] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={confirmDeleteUser}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {isDeletingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: In-app Team Delete Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5F2FF] shadow-2xl max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h4 className="font-serif-fraunces text-lg text-[#101C34]">Delete Team?</h4>
                <p className="text-xs text-[#647895]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#647895] leading-relaxed">
              Are you sure you want to delete the team <strong className="text-[#101C34] font-semibold">{teamToDelete.name}</strong>?
              This team will be permanently deleted from MongoDB. Any members assigned to this team will have their team unassigned.
            </p>

            <div className="flex justify-end items-center space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeletingTeam}
                onClick={() => setTeamToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#647895] hover:bg-[#F1F7FD] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingTeam}
                onClick={confirmDeleteTeam}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {isDeletingTeam ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Team...</span>
                  </>
                ) : (
                  <span>Yes, Delete Team</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
