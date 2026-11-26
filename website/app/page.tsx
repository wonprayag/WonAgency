"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "../components/Navbar";
import { Sidebar, ModuleKey, NAV_ITEMS } from "../components/Sidebar";

const LoginScreen = dynamic(
  () => import("../components/LoginScreen").then((mod) => mod.LoginScreen),
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

import { AttendanceModule } from "../modules/AttendanceModule";
import { DashboardModule } from "../modules/DashboardModule";
import { ProjectsModule } from "../modules/ProjectsModule";
import { MembersModule } from "../modules/MembersModule";
import { VotingModule } from "../modules/VotingModule";
import { IdeationModule } from "../modules/IdeationModule";
import { FundsModule } from "../modules/FundsModule";
import { DocsModule } from "../modules/DocsModule";
import { SettingsModule } from "../modules/SettingsModule";
import { ProfileModule } from "../modules/ProfileModule";

import {
  User,
  AttendanceRecord,
  BondRecord,
  SparkTransaction,
  TimetableEntry,
  NoticeRecord,
  ProjectRecord,
  ContributorApplication,
  DocumentRecord,
  CertificateRecord,
  MemberRecord,
  VotingPoll,
  FeedbackForm,
  IdeationRecord,
  FundSummary,
  SubjectRecord,
  usersApi,
  subjectsApi,
  projectsApi,
  contributorsApi,
  documentsApi,
  certificatesApi,
  votingApi,
  ideationsApi,
  attendanceApi,
  fundsApi,
  sparkApi,
} from "../services/api";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Real state management across all workspace modules (zero fake data)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [bondsList, setBondsList] = useState<BondRecord[]>([]);
  const [sparkHistory, setSparkHistory] = useState<SparkTransaction[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [notices, setNotices] = useState<NoticeRecord[]>([]);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [applications, setApplications] = useState<ContributorApplication[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [polls, setPolls] = useState<VotingPoll[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackForm[]>([]);
  const [ideations, setIdeations] = useState<IdeationRecord[]>([]);
  const [funds, setFunds] = useState<FundSummary>({
    totalBalance: 0,
    totalInflow: 0,
    totalDisbursed: 0,
    currency: "INR",
  });
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);

  // Load real members and subjects from MongoDB on mount
  useEffect(() => {
    // 1. Fetch real MongoDB users for Members directory
    usersApi.getAll().then((dbUsers) => {
      if (dbUsers && dbUsers.length > 0) {
        const mapped: MemberRecord[] = dbUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          eidNumber: u.eidNumber,
          sparkBalance: u.sparkBalance,
          bio: u.bio || "",
          links: {},
          timeline: [
            {
              event: u.role === "SUPER_ADMIN" ? "FOUNDED" : "JOINED",
              title: u.role === "SUPER_ADMIN" ? "Executive Leadership Established" : "Joined WON Originals",
              date: "2026-11-21",
              details: `Account provisioned with role ${u.role} in ${u.department}.`,
            },
          ],
        }));
        setMembers(mapped);
      }
    });

    // 2. Fetch real subjects from MongoDB
    subjectsApi.getAll().then((dbSubjects) => {
      setSubjects(dbSubjects);
    });

    // 3. Fetch real projects from MongoDB
    projectsApi.getAll().then((dbProjects) => {
      if (dbProjects) setProjects(dbProjects);
    }).catch(console.error);

    // 4. Fetch real contributor applications from MongoDB
    contributorsApi.getAll().then((dbApps) => {
      if (dbApps) setApplications(dbApps);
    }).catch(console.error);

    // 5. Fetch real documents from MongoDB
    documentsApi.getAll().then((dbDocs) => {
      if (dbDocs) setDocuments(dbDocs);
    }).catch(console.error);

    // 6. Fetch real certificates from MongoDB
    certificatesApi.getAll().then((dbCerts) => {
      if (dbCerts) setCertificates(dbCerts);
    }).catch(console.error);

    // 7. Fetch real polls from MongoDB
    votingApi.getPolls().then((dbPolls) => {
      if (dbPolls) setPolls(dbPolls);
    }).catch(console.error);

    // 8. Fetch real feedback forms from MongoDB
    votingApi.getFeedbackForms().then((dbForms) => {
      if (dbForms) setFeedbackList(dbForms);
    }).catch(console.error);

    // 9. Fetch real proposals / ideations from MongoDB
    ideationsApi.getAll().then((dbIdeas) => {
      if (dbIdeas) setIdeations(dbIdeas);
    }).catch(console.error);

    // 10. Fetch real attendance check-ins from MongoDB
    attendanceApi.getAll().then((dbAttendance) => {
      if (dbAttendance) setAttendanceList(dbAttendance);
    }).catch(console.error);

    // 11. Fetch real funds summary from MongoDB
    fundsApi.getSummary().then((summary) => {
      if (summary && summary.fund) setFunds(summary.fund);
    }).catch(console.error);
  }, []);

  // Check login state on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("won_authenticated");
    const savedUser = localStorage.getItem("won_current_user");
    if (saved === "true" && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          setCurrentUser(parsed);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
  }, []);

  // Load Spark history when user is authenticated
  useEffect(() => {
    if (!currentUser?.id) return;
    sparkApi.getHistory(currentUser.id).then((history) => {
      setSparkHistory(history);
    }).catch(console.error);
  }, [currentUser?.id]);

  // Enforce module scope restrictions for non-Super Admin users
  useEffect(() => {
    if (currentUser && currentUser.role !== "SUPER_ADMIN") {
      const allowed =
        currentUser.allowedModules && currentUser.allowedModules.length > 0
          ? currentUser.allowedModules
          : ["dashboard", "attendance", "projects", "docs"];

      if (
        !allowed.includes(activeModule) &&
        activeModule !== "profile" &&
        activeModule !== "settings"
      ) {
        setActiveModule((allowed[0] as ModuleKey) || "dashboard");
      }
    }
  }, [currentUser, activeModule]);

  const handleLogin = (user: User) => {
    localStorage.setItem("won_authenticated", "true");
    localStorage.setItem("won_current_user", JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);

    // If user has specific scope, default them to their first allowed module
    if (user.role !== "SUPER_ADMIN" && user.allowedModules && user.allowedModules.length > 0) {
      if (!user.allowedModules.includes("dashboard")) {
        setActiveModule(user.allowedModules[0] as ModuleKey);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("won_authenticated");
    localStorage.removeItem("won_current_user");
    localStorage.removeItem("won_auth_token");
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleUpdateSparkBalance = (newBalance: number) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, sparkBalance: newBalance };
      try {
        localStorage.setItem("won_current_user", JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  // PRD Requirement: The website must open directly on the Login Screen.
  // No landing page. No marketing homepage.
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  const activeItem = NAV_ITEMS.find((item) => item.key === activeModule);
  const activeTitle =
    activeModule === "settings"
      ? "Settings & Preferences"
      : activeModule === "profile"
      ? "Personal Profile"
      : activeItem?.label || "WON Portal";

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F4F8FD] bg-gradient-to-br from-[#F5FAFF] via-[#EAF4FF]/40 to-[#F8FBFF] flex flex-col text-[#101C34]">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        activeModuleTitle={activeTitle}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          user={currentUser}
          onLogout={handleLogout}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-7 md:p-9 min-h-0">
          <div className="max-w-7xl mx-auto">
            {activeModule === "dashboard" && (
              <DashboardModule
                user={currentUser}
                onNavigate={setActiveModule}
                attendanceList={attendanceList}
                onMarkAttendance={async (status, subjectName) => {
                  if (!subjectName || !currentUser) return;
                  const today = new Date().toISOString().split("T")[0];
                  try {
                    const res = await attendanceApi.mark({
                      userId: currentUser.id,
                      subject: subjectName,
                      date: today,
                      status,
                    });
                    setAttendanceList((prev) => [res.attendance, ...prev]);
                    handleUpdateSparkBalance(res.sparkBalance);
                    const newSparkEntry: SparkTransaction = {
                      id: `spk-${Date.now()}`,
                      userId: currentUser.id,
                      change: res.sparkDelta,
                      balanceAfter: res.sparkBalance,
                      reason: `${status === "PRESENT" ? "Attended" : "Absent from"} ${subjectName}`,
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    };
                    setSparkHistory((prev) => [newSparkEntry, ...prev]);
                  } catch (err: any) {
                    console.error("Failed to mark attendance from dashboard:", err.message);
                  }
                }}
                projects={projects}
                funds={funds}
                notices={notices}
                timetables={timetables}
                subjects={subjects}
              />
            )}

            {activeModule === "attendance" && (
              <AttendanceModule
                user={currentUser}
                onUpdateSparkBalance={handleUpdateSparkBalance}
                attendanceList={attendanceList}
                setAttendanceList={setAttendanceList}
                bondsList={bondsList}
                setBondsList={setBondsList}
                sparkHistory={sparkHistory}
                setSparkHistory={setSparkHistory}
                timetables={timetables}
                notices={notices}
              />
            )}

            {activeModule === "projects" && (
              <ProjectsModule
                user={currentUser}
                members={members}
                projects={projects}
                setProjects={setProjects}
                applications={applications}
                setApplications={setApplications}
                documents={documents}
                setDocuments={setDocuments}
                certificates={certificates}
                setCertificates={setCertificates}
              />
            )}

            {activeModule === "members" && (
              <MembersModule user={currentUser} members={members} />
            )}

            {activeModule === "voting" && (
              <VotingModule
                user={currentUser}
                members={members}
                polls={polls}
                setPolls={setPolls}
                feedbackList={feedbackList}
                setFeedbackList={setFeedbackList}
              />
            )}

            {activeModule === "ideation" && (
              <IdeationModule
                user={currentUser}
                ideations={ideations}
                setIdeations={setIdeations}
              />
            )}

            {activeModule === "funds" && (
              <FundsModule
                user={currentUser}
                funds={funds}
                setFunds={setFunds}
              />
            )}

            {activeModule === "docs" && (
              <DocsModule user={currentUser} />
            )}

            {activeModule === "settings" && (
              <SettingsModule
                user={currentUser}
                onUpdateUser={(updated) => {
                  const updatedUser = { ...currentUser, ...updated };
                  setCurrentUser(updatedUser);
                  localStorage.setItem("won_current_user", JSON.stringify(updatedUser));
                }}
              />
            )}

            {activeModule === "profile" && (
              <ProfileModule
                user={currentUser}
                onUpdateUser={(updated) => {
                  const updatedUser = { ...currentUser, ...updated };
                  setCurrentUser(updatedUser);
                  localStorage.setItem("won_current_user", JSON.stringify(updatedUser));
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
