"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Sparkles,
  ShieldAlert,
  Clock,
  Radio,
  FileSignature,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  X,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Search,
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Award,
  AlertTriangle,
  Download,
  Edit3,
  RefreshCw,
  Lock,
  Eye,
  Settings,
  HelpCircle,
  Plus,
  Info,
  MapPin,
} from "lucide-react";
import {
  AttendanceRecord,
  BondRecord,
  SparkTransaction,
  TimetableEntry,
  NoticeRecord,
  User,
  SubjectRecord,
  BatchRecord,
  EnrolledMember,
  MemberSubjectSummary,
  MemberAttendanceDashboard,
  subjectsApi,
  attendanceApi,
  bondsApi,
  usersApi,
  sparkApi,
} from "../services/api";
import { formatTimeRange, getTodaySchedule } from "../utils/schedule";

interface AttendanceModuleProps {
  user: User;
  onUpdateSparkBalance: (newBalance: number) => void;
  attendanceList: AttendanceRecord[];
  setAttendanceList: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  bondsList: BondRecord[];
  setBondsList: React.Dispatch<React.SetStateAction<BondRecord[]>>;
  sparkHistory: SparkTransaction[];
  setSparkHistory: React.Dispatch<React.SetStateAction<SparkTransaction[]>>;
  timetables: TimetableEntry[];
  notices: NoticeRecord[];
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  user,
  onUpdateSparkBalance,
  attendanceList,
  setAttendanceList,
  bondsList,
  setBondsList,
  sparkHistory,
  setSparkHistory,
  timetables,
  notices,
}) => {
  // Roles & Permissions
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = isSuperAdmin || user.role === "ADMIN";

  // Dynamic Subjects from MongoDB Atlas
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Check if user is a mentor of any subject or batch
  const isMentor = useMemo(() => {
    if (isAdmin || user.role === "LEAD") return true;
    return subjects.some(
      (s) =>
        s.mentor === user.name ||
        s.mentorId === user.id ||
        s.coMentors?.includes(user.name) ||
        s.batches?.some((b) => b.mentorName === user.name || b.mentorId === user.id)
    );
  }, [isAdmin, user, subjects]);

  const isMember = !isAdmin && !isMentor;

  // Active Navigation Tab based on role
  const [activeTab, setActiveTab] = useState<string>(
    isMember ? "my-attendance" : "register"
  );

  // Synchronize default tab when role/subjects resolve
  useEffect(() => {
    if (isMember && activeTab !== "my-attendance") {
      setActiveTab("my-attendance");
    } else if (!isMember && activeTab === "my-attendance") {
      setActiveTab("register");
    } else if (!isAdmin && ["manage-subjects", "bonds"].includes(activeTab)) {
      setActiveTab(isMember ? "my-attendance" : "register");
    }
  }, [isMember, isAdmin, activeTab]);

  // Load data on mount
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedSubjects, fetchedUsers, fetchedAttendance, fetchedBonds] = await Promise.all([
        subjectsApi.getAll(),
        usersApi.getAll().catch(() => []),
        attendanceApi.getAll().catch(() => []),
        bondsApi.getAll().catch(() => []),
      ]);
      setSubjects(fetchedSubjects || []);
      setAllUsers(fetchedUsers || []);
      if (fetchedAttendance) {
        setAttendanceList(fetchedAttendance);
      }
      if (fetchedBonds) {
        setBondsList(fetchedBonds);
      }
    } catch (e) {
      console.error("Failed loading academic attendance data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --------------------------------------------------------------------------
  // SECTION: ATTENDANCE SHORTAGE & BOND ISSUANCE STATE
  // --------------------------------------------------------------------------
  const [defaultersList, setDefaultersList] = useState<any[]>([]);
  const [isLoadingDefaulters, setIsLoadingDefaulters] = useState(false);
  const [bondSubjectFilter, setBondSubjectFilter] = useState<string>("ALL");
  const [defaulterViewMode, setDefaulterViewMode] = useState<"SHORTAGE" | "BONDS" | "ALL">("SHORTAGE");

  // Modal for sending bond to student account
  const [isBondModalOpen, setIsBondModalOpen] = useState(false);
  const [targetStudentForBond, setTargetStudentForBond] = useState<{
    userId: string;
    userName: string;
    userEid: string;
    subjectName: string;
    subjectId: string;
    currentAttendance: number;
    attendedSessions: number;
    totalSessions: number;
    minRequiredPercentage: number;
  } | null>(null);
  const [bondFormTitle, setBondFormTitle] = useState("Attendance Shortage Warning & Make-up Obligation");
  const [bondFormReason, setBondFormReason] = useState("");
  const [bondFormObligation, setBondFormObligation] = useState("Must attend 2 mandatory tutorial review sessions and complete compensatory coursework.");
  const [isSubmittingBond, setIsSubmittingBond] = useState(false);

  const fetchDefaulters = async () => {
    setIsLoadingDefaulters(true);
    try {
      const data = await attendanceApi.getDefaulters();
      setDefaultersList(data || []);
      const bonds = await bondsApi.getAll();
      setBondsList(bonds || []);
    } catch (e) {
      console.error("Failed to load attendance defaulters:", e);
    } finally {
      setIsLoadingDefaulters(false);
    }
  };

  useEffect(() => {
    if (activeTab === "bonds") {
      fetchDefaulters();
    }
  }, [activeTab]);

  const handleOpenSendBond = (student: any) => {
    setTargetStudentForBond({
      userId: student.userId,
      userName: student.userName,
      userEid: student.userEid,
      subjectName: student.subjectName,
      subjectId: student.subjectId,
      currentAttendance: student.percentage,
      attendedSessions: student.attendedSessions,
      totalSessions: student.totalSessions,
      minRequiredPercentage: student.minRequiredPercentage || 75,
    });
    setBondFormTitle(`Attendance Shortage: ${student.subjectName}`);
    setBondFormReason(`Current attendance is ${student.percentage}% (${student.attendedSessions}/${student.totalSessions} sessions), falling below the required ${student.minRequiredPercentage || 75}% threshold.`);
    setBondFormObligation("Attend mandatory tutorial review sessions and complete practical coursework to restore academic standing.");
    setIsBondModalOpen(true);
  };

  const handleSubmitBond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentForBond) return;
    setIsSubmittingBond(true);
    try {
      const created = await bondsApi.issue({
        userId: targetStudentForBond.userId,
        userName: targetStudentForBond.userName,
        title: bondFormTitle.trim(),
        reason: bondFormReason.trim(),
        penaltyObligation: bondFormObligation.trim(),
        subjectName: targetStudentForBond.subjectName,
        subjectId: targetStudentForBond.subjectId,
      });
      setBondsList((prev) => [created, ...prev]);
      showNotice(`Accountability bond sent directly to ${targetStudentForBond.userName}'s account!`, "success");
      setIsBondModalOpen(false);
    } catch (err: any) {
      showNotice(err.message || "Failed to issue bond", "error");
    } finally {
      setIsSubmittingBond(false);
    }
  };

  const handleResolveBond = async (bondId: string, studentName: string) => {
    try {
      await bondsApi.resolve(bondId);
      setBondsList((prev) =>
        prev.map((b) => (b.id === bondId ? { ...b, status: "RESOLVED" } : b))
      );
      showNotice(`Bond for ${studentName} marked as Resolved / Cleared!`, "success");
    } catch (err: any) {
      showNotice(err.message || "Failed to resolve bond", "error");
    }
  };

  const handleDeleteBond = async (bondId: string) => {
    if (!confirm("Are you sure you want to revoke/delete this bond?")) return;
    try {
      await bondsApi.delete(bondId);
      setBondsList((prev) => prev.filter((b) => b.id !== bondId));
      showNotice("Bond revoked successfully.", "success");
    } catch (err: any) {
      showNotice(err.message || "Failed to revoke bond", "error");
    }
  };

  // Notice notification toast helper
  const showNotice = (text: string, type: "success" | "error" | "info" = "info", duration = 4000) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), duration);
  };

  // --------------------------------------------------------------------------
  // SECTION A: MENTOR ATTENDANCE REGISTER STATE
  // --------------------------------------------------------------------------
  const availableSubjectsForMentor = useMemo(() => {
    if (isAdmin) return subjects;
    return subjects.filter(
      (s) =>
        s.mentor === user.name ||
        s.mentorId === user.id ||
        s.coMentors?.includes(user.name) ||
        s.batches?.some((b) => b.mentorName === user.name || b.mentorId === user.id)
    );
  }, [isAdmin, subjects, user]);

  const [registerSubjectId, setRegisterSubjectId] = useState<string>("");
  const [registerBatchId, setRegisterBatchId] = useState<string>("");
  const [registerDate, setRegisterDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isRegisterSubjectDropdownOpen, setIsRegisterSubjectDropdownOpen] = useState(false);
  const registerDropdownRef = useRef<HTMLDivElement>(null);

  // Real-time schedule calculation
  const todaySchedule = useMemo(() => {
    return getTodaySchedule(subjects, user);
  }, [subjects, user]);

  // Active Subject for Register
  const selectedRegisterSubject = useMemo(() => {
    if (!registerSubjectId && availableSubjectsForMentor.length > 0) {
      if (todaySchedule.activeOrNextClass) {
        const found = availableSubjectsForMentor.find(
          (s) =>
            (s._id || s.id || s.name) === todaySchedule.activeOrNextClass?.subjectId ||
            s.name === todaySchedule.activeOrNextClass?.subjectName
        );
        if (found) return found;
      }
      return availableSubjectsForMentor[0];
    }
    return availableSubjectsForMentor.find(
      (s) => (s._id || s.id) === registerSubjectId || s.name === registerSubjectId
    ) || null;
  }, [registerSubjectId, availableSubjectsForMentor, todaySchedule]);

  // Sync default subject id
  useEffect(() => {
    if (!registerSubjectId && availableSubjectsForMentor.length > 0) {
      if (todaySchedule.activeOrNextClass) {
        const found = availableSubjectsForMentor.find(
          (s) =>
            (s._id || s.id || s.name) === todaySchedule.activeOrNextClass?.subjectId ||
            s.name === todaySchedule.activeOrNextClass?.subjectName
        );
        if (found) {
          setRegisterSubjectId(found._id || found.id || found.name);
          if (todaySchedule.activeOrNextClass.batchId) {
            setRegisterBatchId(todaySchedule.activeOrNextClass.batchId);
          }
          return;
        }
      }
      setRegisterSubjectId(availableSubjectsForMentor[0]._id || availableSubjectsForMentor[0].id || availableSubjectsForMentor[0].name);
    }
  }, [availableSubjectsForMentor, registerSubjectId, todaySchedule]);

  // Selected Batch for Register
  const activeBatch = useMemo(() => {
    if (!selectedRegisterSubject?.hasBatches || !selectedRegisterSubject.batches?.length) {
      return null;
    }
    if (!registerBatchId) {
      return selectedRegisterSubject.batches[0];
    }
    return selectedRegisterSubject.batches.find((b) => b.id === registerBatchId) || selectedRegisterSubject.batches[0];
  }, [selectedRegisterSubject, registerBatchId]);

  // When subject changes, reset or select first batch
  useEffect(() => {
    if (selectedRegisterSubject?.hasBatches && selectedRegisterSubject.batches?.length) {
      setRegisterBatchId(selectedRegisterSubject.batches[0].id);
    } else {
      setRegisterBatchId("");
    }
  }, [selectedRegisterSubject]);

  // Active Student Roster for the Selected Subject / Batch
  interface StudentRosterItem {
    userId: string;
    userName: string;
    userEid: string;
    email?: string;
    department?: string;
    batchId?: string;
    batchName?: string;
    status: "NOT_MARKED" | "PRESENT" | "ABSENT";
    remarks?: string;
    previousStatus?: "PRESENT" | "ABSENT";
  }

  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>([]);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  // Load existing session attendance from backend whenever subject/batch/date changes
  useEffect(() => {
    if (!selectedRegisterSubject) {
      setStudentRoster([]);
      return;
    }

    let candidateStudents: EnrolledMember[] = [];

    if (selectedRegisterSubject.hasBatches && activeBatch) {
      // Students in this specific batch
      const batchMemberIds = activeBatch.memberIds || [];
      candidateStudents = (selectedRegisterSubject.enrolledMembers || []).filter((m) =>
        batchMemberIds.includes(m.userId)
      );
    } else {
      // Entire enrolled subject roster
      candidateStudents = selectedRegisterSubject.enrolledMembers || [];
    }

    // Query MongoDB for any existing attendance already submitted for this session
    attendanceApi
      .getSession(
        selectedRegisterSubject.name,
        registerDate,
        activeBatch ? activeBatch.id : undefined
      )
      .then((existingRecords) => {
        const recordsMap = new Map<string, AttendanceRecord>();
        existingRecords.forEach((r) => recordsMap.set(r.userId, r));

        const roster: StudentRosterItem[] = candidateStudents.map((s) => {
          const rec = recordsMap.get(s.userId);
          return {
            userId: s.userId,
            userName: s.name,
            userEid: s.eidNumber || "",
            email: s.email || "",
            department: s.department || selectedRegisterSubject.department,
            batchId: activeBatch?.id,
            batchName: activeBatch?.name,
            status: rec ? (rec.status as "PRESENT" | "ABSENT") : "NOT_MARKED",
            previousStatus: rec ? (rec.status as "PRESENT" | "ABSENT") : undefined,
            remarks: rec?.remarks || "",
          };
        });

        setStudentRoster(roster);
        setIsSessionLocked(existingRecords.length > 0 && roster.every((r) => r.status !== "NOT_MARKED"));
      })
      .catch((err) => {
        console.error("Failed fetching session records:", err);
      });
  }, [selectedRegisterSubject, activeBatch, registerDate]);

  // Bulk register action controls
  const handleMarkAllRoster = (newStatus: "PRESENT" | "ABSENT") => {
    setStudentRoster((prev) =>
      prev.map((student) => ({
        ...student,
        status: newStatus,
      }))
    );
  };

  const handleResetRoster = () => {
    setStudentRoster((prev) =>
      prev.map((student) => ({
        ...student,
        status: "NOT_MARKED",
      }))
    );
  };

  const handleStudentStatusChange = (userId: string, newStatus: "PRESENT" | "ABSENT") => {
    setStudentRoster((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, status: newStatus } : s))
    );
  };

  // Register summary metrics
  const rosterStats = useMemo(() => {
    const total = studentRoster.length;
    const present = studentRoster.filter((s) => s.status === "PRESENT").length;
    const absent = studentRoster.filter((s) => s.status === "ABSENT").length;
    const unmarked = studentRoster.filter((s) => s.status === "NOT_MARKED").length;
    const percentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;
    return { total, present, absent, unmarked, percentage };
  }, [studentRoster]);

  // Save / Submit Attendance Register
  const handleSubmitAttendanceRegister = async () => {
    if (!selectedRegisterSubject) {
      showNotice("Please select a subject first.", "error");
      return;
    }

    if (studentRoster.length === 0) {
      showNotice("No enrolled students to mark attendance for.", "error");
      return;
    }

    if (rosterStats.unmarked > 0) {
      const proceed = confirm(
        `There are still ${rosterStats.unmarked} student(s) marked as 'Not Marked'. Would you like to mark them as ABSENT and finalize the session?`
      );
      if (!proceed) return;

      // Auto-set remaining unmarked students to ABSENT
      setStudentRoster((prev) =>
        prev.map((s) => (s.status === "NOT_MARKED" ? { ...s, status: "ABSENT" } : s))
      );
    }

    setIsSubmittingRegister(true);
    try {
      const recordsToSubmit = studentRoster.map((s) => ({
        userId: s.userId,
        userName: s.userName,
        userEid: s.userEid,
        status: (s.status === "NOT_MARKED" ? "ABSENT" : s.status) as "PRESENT" | "ABSENT",
        remarks: s.remarks,
      }));

      const res = await attendanceApi.submitSession({
        subjectId: selectedRegisterSubject._id || selectedRegisterSubject.id,
        subjectName: selectedRegisterSubject.name,
        batchId: activeBatch?.id,
        batchName: activeBatch?.name,
        date: registerDate,
        timeSlot: activeBatch?.schedule?.timeSlot || selectedRegisterSubject.timeSlot,
        room: activeBatch?.schedule?.room || selectedRegisterSubject.room,
        markedByUserId: user.id,
        markedByName: user.name,
        records: recordsToSubmit,
      });

      showNotice(
        `Attendance successfully saved for ${res.count} student(s) in "${selectedRegisterSubject.name}"!`,
        "success"
      );

      // Update logged-in user's Spark balance in real time if they were part of this session
      if (res.updatedBalances && res.updatedBalances[user.id] !== undefined) {
        onUpdateSparkBalance(res.updatedBalances[user.id]);
      }

      setIsSessionLocked(true);
      // Reload overall records, user balances & spark history
      const [updatedList, updatedUsers, updatedSparkHistory] = await Promise.all([
        attendanceApi.getAll(),
        usersApi.getAll().catch(() => []),
        sparkApi.getHistory(user.id).catch(() => []),
      ]);
      setAttendanceList(updatedList);
      setSparkHistory(updatedSparkHistory);
      if (updatedUsers.length > 0) {
        setAllUsers(updatedUsers);
        const me = updatedUsers.find((u) => u.id === user.id || u._id === user.id);
        if (me && me.sparkBalance !== undefined) {
          onUpdateSparkBalance(me.sparkBalance);
        }
      }
    } catch (e: any) {
      showNotice(e.message || "Failed to submit attendance register", "error");
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  // Close Apple dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (registerDropdownRef.current && !registerDropdownRef.current.contains(e.target as Node)) {
        setIsRegisterSubjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // --------------------------------------------------------------------------
  // SECTION B: MEMBER PERSONAL ATTENDANCE DASHBOARD (DAY-WISE CALENDAR)
  // --------------------------------------------------------------------------
  const [memberDashboardData, setMemberDashboardData] = useState<MemberAttendanceDashboard | null>(null);
  const [isLoadingMemberDashboard, setIsLoadingMemberDashboard] = useState(false);

  const todayISO = new Date().toISOString().split("T")[0];
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayISO);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // All attendance records belonging to the logged-in student
  const myAttendanceRecords = useMemo(() => {
    return attendanceList.filter((rec) => {
      const uid = typeof rec.userId === "object" ? (rec.userId as any)?._id || (rec.userId as any)?.id : rec.userId;
      return uid === user.id || uid === user._id;
    });
  }, [attendanceList, user.id, user._id]);

  // Map YYYY-MM-DD -> { present, absent, records }
  const dayAttendanceMap = useMemo(() => {
    const map: Record<string, { present: number; absent: number; records: AttendanceRecord[] }> = {};
    for (const rec of myAttendanceRecords) {
      if (!rec.date) continue;
      if (!map[rec.date]) {
        map[rec.date] = { present: 0, absent: 0, records: [] };
      }
      if (rec.status === "PRESENT") map[rec.date].present += 1;
      else map[rec.date].absent += 1;
      map[rec.date].records.push(rec);
    }
    return map;
  }, [myAttendanceRecords]);

  // Calendar grid cells for current month
  const calendarCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; isoDate: string | null }> = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({ day: null, isoDate: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push({ day: d, isoDate: `${year}-${mm}-${dd}` });
    }
    return cells;
  }, [calendarMonth]);

  const selectedDayRecords = useMemo(() => {
    return dayAttendanceMap[selectedCalendarDate]?.records || [];
  }, [dayAttendanceMap, selectedCalendarDate]);

  const formattedSelectedDateLabel = useMemo(() => {
    const [y, m, d] = selectedCalendarDate.split("-").map(Number);
    if (!y || !m || !d) return selectedCalendarDate;
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedCalendarDate]);

  useEffect(() => {
    if (activeTab === "sparks" && user.id) {
      sparkApi.getHistory(user.id).then(setSparkHistory).catch(console.error);
    }
  }, [activeTab, user.id, setSparkHistory]);

  useEffect(() => {
    if (activeTab === "my-attendance" && user.id) {
      setIsLoadingMemberDashboard(true);
      attendanceApi
        .getMemberSummary(user.id)
        .then((data) => {
          setMemberDashboardData(data);
        })
        .catch((err) => {
          console.error("Failed fetching personal attendance dashboard:", err);
        })
        .finally(() => {
          setIsLoadingMemberDashboard(false);
        });
    }
  }, [activeTab, user.id]);

  // --------------------------------------------------------------------------
  // SECTION C: SUBJECT & ENROLLMENT MANAGEMENT MODAL (ADMINS)
  // --------------------------------------------------------------------------
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMentorName, setFormMentorName] = useState(user.name);
  const [formMentorId, setFormMentorId] = useState(user.id);
  const [formMinAttendance, setFormMinAttendance] = useState(75);
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Single Schedule Fields
  const [formDays, setFormDays] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formTimeSlot, setFormTimeSlot] = useState("");
  const [formRoom, setFormRoom] = useState("");

  // Enrollment state
  const [formEnrolledMembers, setFormEnrolledMembers] = useState<EnrolledMember[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  // Group / Batch subdivision state
  const [formHasBatches, setFormHasBatches] = useState(false);
  const [formBatches, setFormBatches] = useState<BatchRecord[]>([]);

  // Expandable batches preview inside Subject Management
  const [expandedManageSubjectId, setExpandedManageSubjectId] = useState<string | null>(null);

  // Conflict validation warnings
  const [scheduleConflicts, setScheduleConflicts] = useState<string[]>([]);
  const [isValidatingSchedule, setIsValidatingSchedule] = useState(false);

  // Open modal for Create
  const handleOpenCreateSubject = () => {
    setEditingSubjectId(null);
    setFormName("");
    setFormCode(`SUB-${Math.floor(100 + Math.random() * 900)}`);
    setFormDept("");
    setFormDescription("");
    setFormMentorName(user.name);
    setFormMentorId(user.id);
    setFormMinAttendance(75);
    setFormStatus("ACTIVE");
    setFormDays("");
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormTimeSlot("09:00 - 10:00");
    setFormRoom("");
    setFormEnrolledMembers([]);
    setFormHasBatches(false);
    setFormBatches([]);
    setScheduleConflicts([]);
    setIsSubjectModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditSubject = (sub: SubjectRecord) => {
    setEditingSubjectId(sub._id || sub.id || null);
    setFormName(sub.name);
    setFormCode(sub.code);
    setFormDept(sub.department || "");
    setFormDescription(sub.description || "");
    setFormMentorName(sub.mentor || user.name);
    setFormMentorId(sub.mentorId || user.id);
    setFormMinAttendance(sub.minAttendancePercentage || 75);
    setFormStatus(sub.status || "ACTIVE");
    setFormDays(sub.days || "");
    const start = sub.startTime || "09:00";
    const end = sub.endTime || "10:00";
    setFormStartTime(start);
    setFormEndTime(end);
    setFormTimeSlot(sub.startTime ? formatTimeRange(start, end) : (sub.timeSlot || formatTimeRange(start, end)));
    setFormRoom(sub.room || "");
    setFormEnrolledMembers(sub.enrolledMembers || []);
    setFormHasBatches(Boolean(sub.hasBatches));
    setFormBatches(sub.batches ? JSON.parse(JSON.stringify(sub.batches)) : []);
    setScheduleConflicts([]);
    setIsSubjectModalOpen(true);
  };

  // Toggle member enrollment
  const handleToggleEnrollUser = (u: User) => {
    const isEnrolled = formEnrolledMembers.some((m) => m.userId === u.id);
    if (isEnrolled) {
      setFormEnrolledMembers((prev) => prev.filter((m) => m.userId !== u.id));
      // Also remove from any batches
      setFormBatches((prev) =>
        prev.map((b) => ({
          ...b,
          memberIds: b.memberIds.filter((id) => id !== u.id),
        }))
      );
    } else {
      setFormEnrolledMembers((prev) => [
        ...prev,
        {
          userId: u.id,
          name: u.name,
          email: u.email,
          eidNumber: u.eidNumber,
          department: u.department,
          enrolledAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSelectAllFilteredMembers = () => {
    const filtered = allUsers.filter((u) =>
      u.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
      (u.eidNumber && u.eidNumber.toLowerCase().includes(memberSearchTerm.toLowerCase()))
    );
    const newEnrolled: EnrolledMember[] = filtered.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      eidNumber: u.eidNumber,
      department: u.department,
      enrolledAt: new Date().toISOString(),
    }));
    // Merge without duplicates
    const map = new Map<string, EnrolledMember>();
    formEnrolledMembers.forEach((m) => map.set(m.userId, m));
    newEnrolled.forEach((m) => map.set(m.userId, m));
    setFormEnrolledMembers(Array.from(map.values()));
  };

  // Add new Batch
  const handleAddBatch = () => {
    const batchLetter = String.fromCharCode(65 + formBatches.length);
    const newBatch: BatchRecord = {
      id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `Batch ${batchLetter}`,
      description: `Class subdivision for ${formName || "Subject"}`,
      mentorName: formMentorName,
      mentorId: formMentorId,
      schedule: {
        days: formDays || "Mon, Wed, Fri",
        startTime: formStartTime || "09:00",
        endTime: formEndTime || "10:00",
        timeSlot: formTimeSlot || formatTimeRange(formStartTime, formEndTime),
        room: formRoom || "Room 101",
      },
      memberIds: [],
      status: "ACTIVE",
    };
    setFormBatches((prev) => [...prev, newBatch]);
  };

  const handleRemoveBatch = (batchId: string) => {
    setFormBatches((prev) => prev.filter((b) => b.id !== batchId));
  };

  // Assign / Unassign member to specific Batch
  const handleToggleMemberInBatch = (batchId: string, memberId: string) => {
    setFormBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          const hasMember = b.memberIds.includes(memberId);
          return {
            ...b,
            memberIds: hasMember
              ? b.memberIds.filter((id) => id !== memberId)
              : [...b.memberIds, memberId],
          };
        }
        return b;
      })
    );
  };

  // Real-time schedule conflict validation trigger
  const runConflictValidation = async () => {
    setIsValidatingSchedule(true);
    const foundConflicts: string[] = [];

    if (formHasBatches && formBatches.length > 0) {
      for (const b of formBatches) {
        const res = await subjectsApi.validateSchedule({
          days: b.schedule?.days || formDays,
          timeSlot: b.schedule?.timeSlot || formTimeSlot,
          mentor: b.mentorName || formMentorName,
          batchName: b.name,
          memberIds: b.memberIds,
          excludeSubjectId: editingSubjectId || undefined,
          excludeBatchId: b.id,
        });
        if (res.hasConflict) {
          foundConflicts.push(...res.conflicts);
        }
      }
    } else {
      const res = await subjectsApi.validateSchedule({
        days: formDays,
        timeSlot: formTimeSlot,
        mentor: formMentorName,
        mentorId: formMentorId,
        memberIds: formEnrolledMembers.map((m) => m.userId),
        excludeSubjectId: editingSubjectId || undefined,
      });
      if (res.hasConflict) {
        foundConflicts.push(...res.conflicts);
      }
    }

    setScheduleConflicts(Array.from(new Set(foundConflicts)));
    setIsValidatingSchedule(false);
  };

  // Save Subject to Database
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showNotice("Subject name is required.", "error");
      return;
    }

    const payload = {
      name: formName.trim(),
      code: formCode.trim() || `SUB-${Math.floor(100 + Math.random() * 900)}`,
      department: formDept.trim() || undefined,
      description: formDescription.trim(),
      mentor: formMentorName.trim() || user.name,
      mentorId: formMentorId,
      enrolledMembers: formEnrolledMembers,
      hasBatches: formHasBatches,
      batches: formHasBatches ? formBatches : [],
      days: formDays.trim(),
      startTime: formStartTime,
      endTime: formEndTime,
      timeSlot: formTimeSlot.trim() || formatTimeRange(formStartTime, formEndTime),
      room: formRoom.trim() || "Room 101",
      status: formStatus,
      minAttendancePercentage: formMinAttendance,
    };

    try {
      if (editingSubjectId) {
        await subjectsApi.update(editingSubjectId, payload);
        showNotice(`Subject "${formName}" updated successfully!`, "success");
      } else {
        await subjectsApi.create(payload);
        showNotice(`Subject "${formName}" created with ${formEnrolledMembers.length} enrolled student(s)!`, "success");
      }
      setIsSubjectModalOpen(false);
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Failed to save subject track", "error");
    }
  };

  // Delete Subject from Database
  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete subject track "${name}" and all associated batch timetables?`)) {
      return;
    }
    try {
      await subjectsApi.delete(id);
      showNotice(`Subject track "${name}" deleted.`, "success");
      await loadData();
      if (registerSubjectId === id) {
        setRegisterSubjectId("");
      }
    } catch (e: any) {
      showNotice(e.message || "Failed to delete subject", "error");
    }
  };

  // --------------------------------------------------------------------------
  // SECTION D: ATTENDANCE HISTORY & AUDIT LOG WITH CSV EXPORT
  // --------------------------------------------------------------------------
  const [historySubjectFilter, setHistorySubjectFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historySearchTerm, setHistorySearchTerm] = useState("");

  const filteredHistoryRecords = useMemo(() => {
    return attendanceList.filter((rec) => {
      // For ordinary member, strictly show only their own records!
      if (isMember && rec.userId !== user.id) return false;

      if (historySubjectFilter !== "ALL" && rec.subject !== historySubjectFilter) return false;
      if (historyStatusFilter !== "ALL" && rec.status !== historyStatusFilter) return false;
      if (historySearchTerm.trim()) {
        const term = historySearchTerm.toLowerCase();
        const matchesName = rec.userName?.toLowerCase().includes(term);
        const matchesSubject = rec.subject?.toLowerCase().includes(term);
        const matchesDate = rec.date?.toLowerCase().includes(term);
        if (!matchesName && !matchesSubject && !matchesDate) return false;
      }
      return true;
    });
  }, [attendanceList, isMember, user.id, historySubjectFilter, historyStatusFilter, historySearchTerm]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Date", "Student Name", "EID", "Subject", "Batch", "Status", "Spark Delta", "Marked By", "Remarks"];
    const rows = filteredHistoryRecords.map((r) => [
      r.date,
      `"${(r.userName || "").replace(/"/g, '""')}"`,
      r.userEid || "",
      `"${(r.subject || "").replace(/"/g, '""')}"`,
      r.batchName || "Main Class",
      r.status,
      r.sparkDelta > 0 ? `+${r.sparkDelta.toFixed(2)}` : r.sparkDelta.toFixed(2),
      `"${(r.markedByName || "").replace(/"/g, '""')}"`,
      `"${(r.remarks || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `won_attendance_records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteHistoryRecord = async (recordId: string, delta: number) => {
    if (!confirm("Remove this attendance check-in? Spark delta will be adjusted.")) return;
    try {
      if (!recordId.startsWith("att-")) {
        await attendanceApi.delete(recordId);
      }
    } catch (e) {
      console.warn("Delete attendance via API failed or was local:", e);
    }
    setAttendanceList((prev) => prev.filter((r) => r.id !== recordId && (r as any)._id !== recordId));
    const newBalance = Number(((user.sparkBalance || 0) - delta).toFixed(2));
    onUpdateSparkBalance(newBalance);
    showNotice("Record removed and spark reconciled.", "success");
  };

  return (
    <div className="space-y-7 pb-16 font-sans">
      {/* Action Toast Notice */}
      {actionNotice && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border transition-all animate-in fade-in slide-in-from-top-3 ${
            actionNotice.type === "success"
              ? "bg-emerald-50/95 text-emerald-900 border-emerald-200"
              : actionNotice.type === "error"
              ? "bg-rose-50/95 text-rose-900 border-rose-200"
              : "bg-[#087FC4]/10 text-[#087FC4] border-[#087FC4]/30"
          }`}
        >
          {actionNotice.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {actionNotice.type === "error" && <XCircle className="w-4 h-4 text-rose-600" />}
          {actionNotice.type === "info" && <Info className="w-4 h-4 text-[#087FC4]" />}
          <span className="text-xs font-semibold">{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header Banner & Portal Branding */}
      <div className="bg-white/90 backdrop-blur-md border border-[#E2EEFC] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#087FC4]/10 border border-[#087FC4]/20 text-[#087FC4] text-[10px] font-bold uppercase tracking-wider">
              {isAdmin ? "Admin Portal" : isMentor ? "Mentor Portal" : "Member Portal"}
            </span>
            <span className="text-xs text-[#647895]">• {user.name} ({user.role})</span>
          </div>
          <h2 className="font-serif-fraunces text-2xl sm:text-3xl text-[#101C34] font-normal leading-snug">
            Attendance & Subject Management
          </h2>
          <p className="text-xs text-[#647895] mt-1 max-w-2xl leading-relaxed">
            {isAdmin
              ? "Manage subjects, batches, student lists, and daily attendance."
              : isMentor
              ? "Mark and manage daily attendance for your subjects and batches."
              : "View your subjects, attendance percentage, and class timings."}
          </p>
        </div>

        {/* Right side KPIs */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isAdmin && (
            <button
              onClick={handleOpenCreateSubject}
              className="px-4 py-2 rounded-full bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Subject</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F2F8FE] border border-[#CFE2F7] text-xs shadow-2xs select-none">
            <Sparkles className="w-3.5 h-3.5 text-[#087FC4] shrink-0" />
            <span className="font-bold text-[#101C34] tabular-nums">{user.sparkBalance.toFixed(2)}</span>
            <span className="font-semibold text-[#087FC4] text-[11px]">SPK</span>
          </div>
        </div>
      </div>

      {/* 2. Role-Adaptive Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* STUDENT / MEMBER TAB: Only day-wise attendance */}
        {isMember && (
          <button
            onClick={() => setActiveTab("my-attendance")}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer bg-[#087FC4] text-white shadow-xs"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>My Attendance</span>
          </button>
        )}

        {/* MENTOR & ADMIN TABS (Attendance Marking) */}
        {!isMember && (
          <>
            <button
              onClick={() => setActiveTab("register")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "register"
                  ? "bg-[#087FC4] text-white shadow-xs"
                  : "bg-white/80 hover:bg-white text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Attendance Register</span>
            </button>
            <button
              onClick={() => setActiveTab("my-subjects")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "my-subjects"
                  ? "bg-[#087FC4] text-white shadow-xs"
                  : "bg-white/80 hover:bg-white text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>My Subjects & Batches ({availableSubjectsForMentor.length})</span>
            </button>
          </>
        )}

        {/* ADMIN EXCLUSIVE TABS (Subject & Batch Management, Shortage & Bonds) */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab("manage-subjects")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "manage-subjects"
                ? "bg-[#087FC4] text-white shadow-xs"
                : "bg-white/80 hover:bg-white text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Subject Management</span>
          </button>
        )}

        {/* MENTOR & ADMIN SHARED TABS */}
        {!isMember && (
          <>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "history"
                  ? "bg-[#087FC4] text-white shadow-xs"
                  : "bg-white/80 hover:bg-white text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Attendance Log</span>
            </button>
            <button
              onClick={() => setActiveTab("timetable")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "timetable"
                  ? "bg-[#087FC4] text-white shadow-xs"
                  : "bg-white/80 hover:bg-white text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Weekly Timetable</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("bonds")}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "bonds"
                    ? "bg-[#087FC4] text-white shadow-xs"
                    : "bg-white/80 hover:bg-white text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
                }`}
              >
                <FileSignature className="w-4 h-4" />
                <span>Shortage & Bonds</span>
                {defaultersList.filter((d) => d.isShortage).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {defaultersList.filter((d) => d.isShortage).length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab("notices")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "notices"
                  ? "bg-[#087FC4] text-white shadow-xs"
                  : "bg-white/80 hover:bg-white text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Notices</span>
            </button>
          </>
        )}
      </div>

      {/* =========================================================================
          TAB 1: AGENCY ATTENDANCE REGISTER (FOR MENTORS & ADMINS)
         ========================================================================= */}
      {activeTab === "register" && !isMember && (
        <div className="space-y-6">
          {/* Top Session Configuration & Apple Selector */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-[#EDF4FB]">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1F7FD] border border-[#E5F2FF] text-[#087FC4] text-[11px] font-bold uppercase tracking-widest rounded-full mb-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Attendance Register
                </span>
                <h3 className="font-serif-fraunces text-2xl sm:text-3xl text-[#101C34] font-normal">
                  {selectedRegisterSubject ? selectedRegisterSubject.name : "Select a Subject"}
                </h3>
                <p className="text-xs text-[#647895] mt-1">
                  {selectedRegisterSubject ? (
                    <>
                      {selectedRegisterSubject.code} • Mentor: <strong className="text-[#101C34]">{selectedRegisterSubject.mentor}</strong> • Room: {selectedRegisterSubject.room}
                      {activeBatch && ` • Batch: ${activeBatch.name}`}
                      {activeBatch?.schedule?.timeSlot
                        ? ` • Time: ${activeBatch.schedule.timeSlot}`
                        : selectedRegisterSubject.timeSlot
                        ? ` • Time: ${selectedRegisterSubject.timeSlot}`
                        : ""}
                    </>
                  ) : (
                    "No subject chosen yet."
                  )}
                </p>
              </div>

              {/* Subject & Session Selectors */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Apple Subject Dropdown */}
                <div className="relative min-w-[190px] max-w-[260px]" ref={registerDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsRegisterSubjectDropdownOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-full bg-[#F4F8FC] hover:bg-[#EBF3FB] border border-[#D4E3F2] text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-[#101C34] truncate">
                        {selectedRegisterSubject ? selectedRegisterSubject.name : "Choose Subject..."}
                      </span>
                      {selectedRegisterSubject?.code && (
                        <span className="text-[10px] text-[#647895] font-mono shrink-0">
                          {selectedRegisterSubject.code}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#647895] shrink-0 transition-transform ${isRegisterSubjectDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isRegisterSubjectDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white/95 backdrop-blur-2xl border border-[#DDEAF6] rounded-2xl shadow-xl p-1.5 space-y-1">
                      {availableSubjectsForMentor.length > 0 ? (
                        availableSubjectsForMentor.map((sub) => (
                          <div
                            key={sub._id || sub.id || sub.name}
                            onClick={() => {
                              setRegisterSubjectId(sub._id || sub.id || sub.name);
                              setIsRegisterSubjectDropdownOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              (selectedRegisterSubject?._id || selectedRegisterSubject?.name) === (sub._id || sub.name)
                                ? "bg-[#087FC4]/10 text-[#087FC4] font-semibold"
                                : "hover:bg-[#F2F7FD] text-[#101C34]"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate">{sub.name}</span>
                              {todaySchedule.todayClasses.some((c) => c.subjectId === (sub._id || sub.id || sub.name)) && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 shrink-0">
                                  Today
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#647895] font-mono shrink-0">{sub.code}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-[#647895]">No subjects assigned to you.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Session Date Input */}
                <div className="flex items-center gap-2 bg-[#F4F8FC] border border-[#D4E3F2] px-3.5 py-2 rounded-full">
                  <Calendar className="w-3.5 h-3.5 text-[#087FC4]" />
                  <input
                    type="date"
                    value={registerDate}
                    onChange={(e) => setRegisterDate(e.target.value)}
                    className="text-xs text-[#101C34] bg-transparent focus:outline-none font-medium cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* CONDITIONAL BATCH SELECTION: Only visible when subject has batches */}
            {selectedRegisterSubject?.hasBatches && selectedRegisterSubject.batches && selectedRegisterSubject.batches.length > 0 && (
              <div className="bg-[#F8FBFE] border border-[#E5F2FF] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#087FC4]" />
                  <span className="text-xs font-bold text-[#101C34]">Subject Batches ({selectedRegisterSubject.batches.length}):</span>
                  <span className="text-xs text-[#647895]">Select the batch taking attendance</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedRegisterSubject.batches.map((batch) => {
                    const isSelected = (activeBatch?.id === batch.id);
                    return (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={() => setRegisterBatchId(batch.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? "bg-[#087FC4] text-white shadow-xs"
                            : "bg-white text-[#101C34] hover:bg-white/80 border border-[#D5E4F3]"
                        }`}
                      >
                        <span>{batch.name}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-[#647895]"
                        }`}>
                          {batch.memberIds?.length || 0} students
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apple-styled Frosted Stat Strip */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(16,28,52,0.03)] grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Total Enrolled */}
              <div className="p-3 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="text-[11px] font-semibold text-slate-500 tracking-tight">Total Enrolled</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-[#101C34] tabular-nums">{rosterStats.total}</p>
              </div>

              {/* Present */}
              <div className="p-3 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-[11px] font-semibold text-emerald-700 tracking-tight">Present</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 tabular-nums">+0.25 SPK</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-emerald-800 tabular-nums">{rosterStats.present}</p>
              </div>

              {/* Absent */}
              <div className="p-3 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                  <span className="text-[11px] font-semibold text-rose-700 tracking-tight">Absent</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100/80 text-rose-800 tabular-nums">-1.00 SPK</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-rose-800 tabular-nums">{rosterStats.absent}</p>
              </div>

              {/* Unmarked */}
              <div className="p-3 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span className="text-[11px] font-semibold text-slate-500 tracking-tight">Unmarked</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-slate-700 tabular-nums">{rosterStats.unmarked}</p>
              </div>

              {/* Attendance % */}
              <div className="p-3 text-center flex flex-col items-center justify-center col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#087FC4] shadow-[0_0_8px_rgba(8,127,196,0.5)]"></span>
                  <span className="text-[11px] font-semibold text-[#087FC4] tracking-tight">Attendance</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-[#087FC4] tabular-nums">{rosterStats.percentage}%</p>
              </div>
            </div>

            {/* Apple Floating Pill Dock */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center p-1 bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-full shadow-[0_1px_8px_rgba(16,28,52,0.04)]">
                <button
                  type="button"
                  onClick={() => handleMarkAllRoster("PRESENT")}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Mark All Present</span>
                </button>
                <div className="h-4 w-[1px] bg-slate-200" />
                <button
                  type="button"
                  onClick={() => handleMarkAllRoster("ABSENT")}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Mark All Absent</span>
                </button>
                <div className="h-4 w-[1px] bg-slate-200" />
                <button
                  type="button"
                  onClick={handleResetRoster}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Apple Primary Action Button */}
              <button
                type="button"
                onClick={handleSubmitAttendanceRegister}
                disabled={isSubmittingRegister || studentRoster.length === 0}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#0071E3] to-[#087FC4] hover:from-[#0062C4] hover:to-[#076fae] disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none text-white text-xs font-semibold flex items-center gap-2 shadow-[0_2px_8px_rgba(0,113,227,0.25)] hover:shadow-[0_4px_12px_rgba(0,113,227,0.35)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSubmittingRegister ? "Saving..." : isSessionLocked ? "Update Attendance" : "Save Attendance"}</span>
              </button>
            </div>
          </div>

          {/* Student Roster Register Table */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EEFC] overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#EDF4FB] flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-[#101C34] text-sm">Class Attendance Register</h4>
                <p className="text-xs text-[#647895] mt-0.5">
                  {selectedRegisterSubject?.name} • Session: {registerDate} • {activeBatch ? `Batch: ${activeBatch.name}` : "Full Class Roster"}
                </p>
              </div>
              {isSessionLocked && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-[#F8FBFE] border-b border-[#E2EEFC] text-[#647895] font-semibold">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Member ID</th>
                    {selectedRegisterSubject?.hasBatches && <th className="py-3 px-3">Batch</th>}
                    <th className="py-3 px-3">Attendance Status</th>
                    <th className="py-3 px-4 text-center">Action Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF4FB]">
                  {studentRoster.length > 0 ? (
                    studentRoster.map((student) => (
                      <tr key={student.userId} className="hover:bg-[#F8FBFE]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E8F2FC] text-[#087FC4] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D0E4F7]">
                              {student.userName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#101C34]">{student.userName}</p>
                              {student.email && <p className="text-[11px] text-[#647895]">{student.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#647895]">
                          {student.userEid || "WON-MB-0000"}
                        </td>
                        {selectedRegisterSubject?.hasBatches && (
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-[#F1F6FB] border border-[#DCE8F5] text-[#087FC4] font-semibold text-[10px]">
                              {student.batchName || "Batch A"}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                              student.status === "PRESENT"
                                ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/70"
                                : student.status === "ABSENT"
                                ? "bg-rose-50/80 text-rose-700 border-rose-200/70"
                                : "bg-slate-100/70 text-slate-500 border-slate-200/60"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                student.status === "PRESENT"
                                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                                  : student.status === "ABSENT"
                                  ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                                  : "bg-slate-400"
                              }`}
                            />
                            <span>{student.status === "NOT_MARKED" ? "Not Marked" : student.status === "PRESENT" ? "Present" : "Absent"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center p-0.5 bg-[#EEF4FA] border border-[#DEE7F0] rounded-full shadow-[0_1px_3px_rgba(16,28,52,0.03)]">
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.userId, "PRESENT")}
                              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                student.status === "PRESENT"
                                  ? "bg-white text-emerald-700 shadow-[0_1px_3px_rgba(16,28,52,0.1)] font-bold"
                                  : "text-slate-500 hover:text-emerald-700"
                              }`}
                              title="Mark Present (+0.25 SPK)"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.userId, "ABSENT")}
                              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                student.status === "ABSENT"
                                  ? "bg-white text-rose-700 shadow-[0_1px_3px_rgba(16,28,52,0.1)] font-bold"
                                  : "text-slate-500 hover:text-rose-700"
                              }`}
                              title="Mark Absent (-1.00 SPK)"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Absent</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={selectedRegisterSubject?.hasBatches ? 5 : 4} className="py-12 text-center text-xs text-[#647895]">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-[#101C34]">No students enrolled in this subject or batch.</p>
                        {isAdmin && (
                          <p className="text-[11px] text-[#647895] mt-1">
                            Go to <strong>Subject Management</strong> tab to enroll members into this subject track.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: STUDENT / MEMBER DAY-WISE ATTENDANCE VIEW
         ========================================================================= */}
      {activeTab === "my-attendance" && (
        <div className="space-y-6">
          {/* Top Compact Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-5 shadow-xs">
              <p className="text-[11px] uppercase font-bold text-[#647895] tracking-wider">Classes Attended</p>
              <p className="font-serif-fraunces text-2xl text-[#101C34] mt-1">
                {myAttendanceRecords.filter((r) => r.status === "PRESENT").length}
                <span className="text-sm font-sans text-[#647895] font-medium"> / {myAttendanceRecords.length}</span>
              </p>
              <p className="text-[11px] text-[#647895] mt-0.5">Total recorded sessions</p>
            </div>
            <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-5 shadow-xs">
              <p className="text-[11px] uppercase font-bold text-[#647895] tracking-wider">Attendance</p>
              <p className="font-serif-fraunces text-2xl text-emerald-700 mt-1">
                {myAttendanceRecords.length > 0
                  ? `${((myAttendanceRecords.filter((r) => r.status === "PRESENT").length / myAttendanceRecords.length) * 100).toFixed(1)}%`
                  : "0.0%"}
              </p>
              <p className="text-[11px] text-[#647895] mt-0.5">75% minimum required</p>
            </div>
            <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-5 shadow-xs">
              <p className="text-[11px] uppercase font-bold text-[#647895] tracking-wider">Spark Balance</p>
              <p className="font-serif-fraunces text-2xl text-[#087FC4] mt-1">
                {(memberDashboardData?.sparkBalance ?? user.sparkBalance).toFixed(2)} SPK
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">+0.25 Present / -1.00 Absent</p>
            </div>
          </div>

          {/* Day-Wise Calendar & Selected Day Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Month Calendar */}
            <div className="lg:col-span-5 bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EEFC] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif-fraunces text-lg text-[#101C34]">
                  {new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth((prev) =>
                        prev.month === 0
                          ? { year: prev.year - 1, month: 11 }
                          : { year: prev.year, month: prev.month - 1 }
                      )
                    }
                    className="w-8 h-8 rounded-full bg-[#F4F8FC] hover:bg-[#E7F2FD] border border-[#DCE8F5] flex items-center justify-center text-[#101C34] cursor-pointer transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth((prev) =>
                        prev.month === 11
                          ? { year: prev.year + 1, month: 0 }
                          : { year: prev.year, month: prev.month + 1 }
                      )
                    }
                    className="w-8 h-8 rounded-full bg-[#F4F8FC] hover:bg-[#E7F2FD] border border-[#DCE8F5] flex items-center justify-center text-[#101C34] cursor-pointer transition-colors"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#647895] pb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-y-2 text-center">
                {calendarCells.map((cell, idx) => {
                  if (!cell.day || !cell.isoDate) {
                    return <div key={`empty-${idx}`} className="h-9" />;
                  }
                  const stats = dayAttendanceMap[cell.isoDate];
                  const isSelected = cell.isoDate === selectedCalendarDate;
                  const isToday = cell.isoDate === todayISO;

                  let circleStyle = "text-[#101C34] hover:bg-[#F2F7FD]";
                  if (stats) {
                    if (stats.present > 0 && stats.absent === 0) {
                      circleStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold";
                    } else if (stats.absent > 0 && stats.present === 0) {
                      circleStyle = "bg-rose-50 text-rose-700 border border-rose-200 font-semibold";
                    } else {
                      circleStyle = "bg-amber-50 text-amber-700 border border-amber-200 font-semibold";
                    }
                  } else if (isToday) {
                    circleStyle = "bg-[#EBF4FD] text-[#087FC4] border border-[#CBE0F7] font-semibold";
                  }

                  return (
                    <div key={cell.isoDate} className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCalendarDate(cell.isoDate!)}
                        className={`w-9 h-9 rounded-full text-xs flex items-center justify-center transition-all cursor-pointer ${circleStyle} ${
                          isSelected ? "ring-2 ring-[#087FC4] ring-offset-1 shadow-xs" : ""
                        }`}
                      >
                        {cell.day}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-[#EDF4FB] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#647895]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Present
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Absent
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Mixed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-[#087FC4]" />
                  Selected
                </span>
              </div>
            </div>

            {/* Right: Attendance Details for Selected Day */}
            <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EEFC] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EDF4FB]">
                <div>
                  <h3 className="font-serif-fraunces text-xl text-[#101C34]">
                    Attendance Details - {formattedSelectedDateLabel}
                  </h3>
                  <p className="text-xs text-[#647895] mt-0.5">
                    {selectedDayRecords.length > 0
                      ? `${selectedDayRecords.length} class${selectedDayRecords.length > 1 ? "es" : ""} recorded on this day`
                      : "Click any highlighted date on the calendar to view your classes."}
                  </p>
                </div>
                {selectedCalendarDate !== todayISO && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCalendarDate(todayISO);
                      const now = new Date();
                      setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#F2F8FE] hover:bg-[#E7F2FD] border border-[#CFE2F7] text-[#087FC4] text-[11px] font-semibold cursor-pointer transition-colors shrink-0"
                  >
                    Today
                  </button>
                )}
              </div>

              {selectedDayRecords.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedDayRecords.map((rec) => {
                    const isPresent = rec.status === "PRESENT";
                    return (
                      <div
                        key={rec.id || (rec as any)._id}
                        className="p-4 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] flex items-center justify-between gap-3 hover:border-[#CBE0F7] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#101C34] truncate">{rec.subject}</p>
                          <p className="text-xs text-[#647895] mt-0.5 truncate">
                            {rec.timeSlot ? `${rec.timeSlot}` : "Scheduled Session"}
                            {rec.batchName ? ` • ${rec.batchName}` : ""}
                            {rec.markedByName ? ` • Marked by ${rec.markedByName}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={`text-[11px] font-mono font-semibold ${
                              isPresent ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {rec.sparkDelta > 0 ? `+${rec.sparkDelta.toFixed(2)}` : rec.sparkDelta.toFixed(2)} SPK
                          </span>
                          <span
                            className={`px-3.5 py-1 rounded-xl text-xs font-semibold border ${
                              isPresent
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isPresent ? "Present" : "Absent"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <CalendarCheck className="w-9 h-9 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-[#101C34]">No classes recorded</p>
                  <p className="text-xs text-[#647895]">
                    No attendance was marked for {formattedSelectedDateLabel}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Subject-wise Summary (Compact Cards Below) */}
          {isLoadingMemberDashboard ? (
            <div className="p-8 text-center text-xs text-[#647895]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#087FC4] mx-auto mb-2" />
              <span>Loading your subjects...</span>
            </div>
          ) : memberDashboardData && memberDashboardData.subjects.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-serif-fraunces text-xl text-[#101C34]">Your Subjects</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {memberDashboardData.subjects.map((sub) => (
                  <div key={sub.subjectId} className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-5 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#E8F2FC] text-[#087FC4] font-semibold border border-[#CCE3F8]">
                            {sub.subjectCode}
                          </span>
                          {sub.batchName && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              {sub.batchName}
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif-fraunces text-lg text-[#101C34]">{sub.subjectName}</h4>
                        <p className="text-xs text-[#647895] mt-0.5">Mentor: <strong className="text-[#101C34]">{sub.mentor}</strong> • {sub.room}</p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          sub.standing === "GOOD"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : sub.standing === "WARNING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {sub.standing === "GOOD" ? "Good" : sub.standing === "WARNING" ? "Low" : "Shortage"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#647895]">
                          Attended <strong className="text-[#101C34]">{sub.attendedSessions}</strong> of <strong className="text-[#101C34]">{sub.totalSessions}</strong> classes
                        </span>
                        <span className="font-bold text-[#087FC4]">{sub.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            sub.percentage >= sub.minRequiredPercentage
                              ? "bg-emerald-500"
                              : sub.percentage >= 65
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, sub.percentage)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#647895]">{sub.days} • {sub.timeSlot}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* =========================================================================
          TAB 3: MY SUBJECTS & BATCHES (FOR MENTORS & ADMINS)
         ========================================================================= */}
      {activeTab === "my-subjects" && !isMember && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif-fraunces text-2xl text-[#101C34]">My Teaching Subjects & Batches</h3>
              <p className="text-xs text-[#647895] mt-0.5">Assigned subjects and subdivided batches where you serve as mentor.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableSubjectsForMentor.map((sub) => (
              <div key={sub._id || sub.id} className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#E8F2FC] text-[#087FC4] font-semibold border border-[#CCE3F8]">
                      {sub.code}
                    </span>
                    <span className="text-[11px] text-[#647895] font-medium">{sub.department}</span>
                  </div>
                  <h4 className="font-serif-fraunces text-xl text-[#101C34] font-medium">{sub.name}</h4>
                  <p className="text-xs text-[#647895] mt-1 line-clamp-2">{sub.description || "Studio track in WON Agency Portal."}</p>

                  <div className="mt-4 pt-4 border-t border-[#EDF4FB] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#647895]">Enrolled Students:</span>
                      <strong className="text-[#101C34]">{sub.enrolledMembers?.length || 0} students</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#647895]">Structure:</span>
                      <span className="font-semibold text-[#087FC4]">
                        {sub.hasBatches ? `${sub.batches?.length || 0} Batches` : "Single Class"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#647895]">Schedule:</span>
                      <span className="text-[#101C34]">{sub.days} • {sub.timeSlot}</span>
                    </div>
                  </div>

                  {/* List Batches Preview if present */}
                  {sub.hasBatches && sub.batches && sub.batches.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#F8FBFE] border border-[#E5F2FF] space-y-1">
                      <p className="text-[10px] font-bold text-[#647895] uppercase">Subdivided Batches:</p>
                      {sub.batches.map((b) => (
                        <div key={b.id} className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#101C34]">{b.name}</span>
                          <span className="text-[#647895]">{b.memberIds?.length || 0} students</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterSubjectId(sub._id || sub.id || sub.name);
                      setActiveTab("register");
                    }}
                    className="w-full py-2.5 rounded-2xl bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Open Attendance Register</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SUBJECT MANAGEMENT & ENROLLMENT (ADMINS ONLY)
         ========================================================================= */}
      {activeTab === "manage-subjects" && isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Subject Management</h3>
              <p className="text-xs text-[#647895] mt-0.5">Add subjects, assign students, and organize batches.</p>
            </div>
            <button
              onClick={handleOpenCreateSubject}
              className="px-4 py-2.5 rounded-2xl bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Subject</span>
            </button>
          </div>

          <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-[#F8FBFE] border-b border-[#E2EEFC] text-[#647895] font-semibold">
                    <th className="py-3 px-4">Subject & Code</th>
                    <th className="py-3 px-3">Lead Mentor</th>
                    <th className="py-3 px-3">Enrolled Students</th>
                    <th className="py-3 px-3">Batch Structure</th>
                    <th className="py-3 px-3">Schedule & Room</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF4FB]">
                  {subjects.length > 0 ? (
                    subjects.map((sub) => {
                      const subKey = sub._id || sub.id || sub.name;
                      const hasBatches = Boolean(sub.hasBatches && sub.batches && sub.batches.length > 0);
                      const isExpanded = expandedManageSubjectId === subKey;
                      return (
                        <React.Fragment key={subKey}>
                          <tr className="hover:bg-[#F8FBFE]/60 transition-colors">
                            <td className="py-3 px-4">
                              <div>
                                <span className="font-semibold text-[#101C34] text-sm">{sub.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] text-[#087FC4] bg-[#E8F2FC] px-1.5 py-0.2 rounded border border-[#CCE3F8]">
                                    {sub.code}
                                  </span>
                                  <span className="text-[11px] text-[#647895]">{sub.department}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-[#101C34]">{sub.mentor}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-[#101C34]">{sub.enrolledMembers?.length || 0} members</span>
                            </td>
                            <td className="py-3 px-3">
                              {hasBatches ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedManageSubjectId(isExpanded ? null : subKey)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[11px] border border-purple-200 cursor-pointer transition-colors"
                                  title="Click to view or manage batches"
                                >
                                  <span>{sub.batches?.length || 0} Batches</span>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-[#F1F6FB] text-[#647895] text-[11px] border border-[#DCE8F5]">
                                  Single Class
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-[#647895]">
                              <div>{sub.days} • {sub.timeSlot}</div>
                              <div className="text-[10px] text-slate-400">{sub.room}</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSubject(sub)}
                                  className="p-1.5 rounded-xl hover:bg-slate-100 text-[#087FC4] transition-colors cursor-pointer"
                                  title="Edit Subject, Enrollment, and Batches"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubject(sub._id || sub.id || "", sub.name)}
                                  className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                                  title="Delete Subject"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {hasBatches && isExpanded && (
                            <tr className="bg-[#F8FBFE]/90">
                              <td colSpan={6} className="px-4 py-3.5">
                                <div className="flex items-center justify-between mb-2.5">
                                  <span className="text-[11px] font-bold text-[#647895] uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-[#087FC4]" />
                                    Batches in {sub.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSubject(sub)}
                                    className="text-xs text-[#087FC4] hover:underline font-semibold cursor-pointer"
                                  >
                                    Edit Batches
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {sub.batches?.map((batch) => (
                                    <div
                                      key={batch.id}
                                      onClick={() => handleOpenEditSubject(sub)}
                                      className="p-3 rounded-2xl bg-white border border-[#DCE8F5] hover:border-[#087FC4]/50 space-y-1 cursor-pointer transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[#101C34] flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-[#087FC4]" />
                                          {batch.name}
                                        </span>
                                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F2F8FE] border border-[#DCE8F5] rounded-md text-[#087FC4] font-semibold">
                                          {batch.memberIds?.length || 0} members
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-[#647895]">
                                        Mentor: <strong className="text-[#101C34]">{batch.mentorName || sub.mentor}</strong>
                                      </p>
                                      <p className="text-[10px] text-[#647895]">
                                        {batch.schedule?.days || sub.days} • {batch.schedule?.timeSlot || sub.timeSlot}
                                        {batch.schedule?.room ? ` • ${batch.schedule.room}` : ""}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#647895]">
                        No subjects created yet. Click "+ Add New Subject Track" to create your first subject.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: ATTENDANCE HISTORY & AUDIT LOG WITH CSV EXPORT
         ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EDF4FB]">
            <div>
              <h3 className="font-serif-fraunces text-xl sm:text-2xl text-[#101C34]">
                {isMember ? "My Attendance Records" : "Attendance Log"}
              </h3>
              <p className="text-xs text-[#647895] mt-0.5">
                {isMember
                  ? "History of your recorded classes."
                  : "All recorded attendance entries and Spark point updates."}
              </p>
            </div>

            {/* Export and Filters Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredHistoryRecords.length === 0}
                className="px-3.5 py-2 rounded-2xl bg-[#F4F8FC] hover:bg-[#EBF3FB] border border-[#D4E3F2] text-xs font-semibold text-[#101C34] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-[#087FC4]" />
                <span>Export CSV ({filteredHistoryRecords.length})</span>
              </button>

              {/* Status Segmented Control */}
              <div className="inline-flex items-center p-1 bg-[#F1F6FB] border border-[#E2EEFC] rounded-2xl gap-1 shadow-2xs">
                {[
                  { id: "ALL", label: "All" },
                  { id: "PRESENT", label: "Present (+0.25)" },
                  { id: "ABSENT", label: "Absent (-1.00)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryStatusFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all cursor-pointer ${
                      historyStatusFilter === tab.id
                        ? "bg-white text-[#087FC4] shadow-xs font-semibold"
                        : "text-[#647895] hover:text-[#101C34]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search & Subject Filter Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-[#647895]" />
              <input
                type="text"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                placeholder="Search by student name, subject, or date..."
                className="bg-transparent text-xs text-[#101C34] placeholder:text-[#647895] focus:outline-none w-full"
              />
            </div>

            <select
              value={historySubjectFilter}
              onChange={(e) => setHistorySubjectFilter(e.target.value)}
              className="text-xs bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl px-3 py-2 text-[#101C34] focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s._id || s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* History Records Table */}
          <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-[#E5F2FF] text-[#647895] font-semibold">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Spark Delta</th>
                  <th className="py-3 px-3">Marked By</th>
                  {isAdmin && <th className="py-3 px-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5F2FF]/60">
                {filteredHistoryRecords.length > 0 ? (
                  filteredHistoryRecords.map((rec) => (
                    <tr key={rec.id || (rec as any)._id} className="hover:bg-[#F1F7FD]/60 transition-colors">
                      <td className="py-3.5 px-3 font-medium text-[#101C34]">{rec.date}</td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-[#101C34]">{rec.userName}</p>
                        {rec.userEid && <p className="text-[10px] text-[#647895] font-mono">{rec.userEid}</p>}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[#101C34]">{rec.subject}</td>
                      <td className="py-3.5 px-3 text-[#647895]">{rec.batchName || "Main Class"}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            rec.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold">
                        <span className={rec.sparkDelta > 0 ? "text-[#087FC4]" : "text-rose-600"}>
                          {rec.sparkDelta > 0 ? `+${rec.sparkDelta.toFixed(2)}` : rec.sparkDelta.toFixed(2)} SPK
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#647895]">
                        {rec.markedByName || "Mentor"}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryRecord(rec.id || (rec as any)._id, rec.sparkDelta)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete and reconcile Spark"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-xs text-[#647895]">
                      No attendance records found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: WEEKLY TIMETABLE
         ========================================================================= */}
      {activeTab === "timetable" && (
        <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Academic Weekly Timetable</h3>
            <p className="text-xs text-[#647895] mt-0.5">Live schedule of subjects, batches, time slots, and studio rooms.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((sub) => (
              <div key={sub._id || sub.id} className="p-5 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-[#E8F2FC] text-[#087FC4] font-semibold rounded">
                    {sub.code}
                  </span>
                  <span className="text-[11px] text-[#647895]">{sub.room}</span>
                </div>
                <h4 className="font-semibold text-sm text-[#101C34]">{sub.name}</h4>
                <div className="text-xs text-[#647895] space-y-1">
                  <p>Days: <strong className="text-[#101C34]">{sub.days}</strong></p>
                  <p>Slot: <strong className="text-[#101C34]">{sub.timeSlot}</strong></p>
                  <p>Mentor: <strong className="text-[#101C34]">{sub.mentor}</strong></p>
                </div>
                {sub.hasBatches && sub.batches && (
                  <div className="pt-2 border-t border-[#EDF4FB] text-[11px] text-[#087FC4] font-semibold">
                    Divided into {sub.batches.length} batch schedules
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 8: ATTENDANCE SHORTAGE & ACCOUNTABILITY BONDS (SUBJECT-WISE)
         ========================================================================= */}
      {activeTab === "bonds" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Academic Attendance Shortage & Accountability</span>
              </div>
              <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Shortage & Accountability Bonds</h3>
              <p className="text-xs text-[#647895] mt-0.5">
                Monitor students below the 75% attendance threshold per subject track and issue formal accountability obligations directly to their portal account.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDefaulters}
                disabled={isLoadingDefaulters}
                className="px-4 py-2 rounded-2xl bg-[#F4F8FC] hover:bg-[#EEF4FA] border border-[#DCE8F5] text-xs font-semibold text-[#101C34] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#087FC4] ${isLoadingDefaulters ? "animate-spin" : ""}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(16,28,52,0.03)] grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="p-3 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span className="text-[11px] font-semibold text-slate-500 tracking-tight">Total Enrolled</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-[#101C34] tabular-nums">{defaultersList.length}</p>
            </div>

            <div className="p-3 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                <span className="text-[11px] font-semibold text-rose-700 tracking-tight">Below 75% Shortage</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-rose-700 tabular-nums">
                {defaultersList.filter((d) => d.isShortage).length}
              </p>
            </div>

            <div className="p-3 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                <span className="text-[11px] font-semibold text-amber-700 tracking-tight">Active Bonds</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-amber-800 tabular-nums">
                {bondsList.filter((b) => b.status === "ACTIVE").length}
              </p>
            </div>

            <div className="p-3 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-[11px] font-semibold text-emerald-700 tracking-tight">Resolved Bonds</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-emerald-800 tabular-nums">
                {bondsList.filter((b) => b.status === "RESOLVED").length}
              </p>
            </div>
          </div>

          {/* Subject Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setBondSubjectFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  bondSubjectFilter === "ALL"
                    ? "bg-[#087FC4] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:text-[#101C34] border border-[#DCE8F5]"
                }`}
              >
                All Subjects ({defaultersList.filter((d) => d.isShortage).length} shortages)
              </button>

              {subjects.map((sub) => {
                const subId = sub._id || sub.id || "";
                const subShortages = defaultersList.filter(
                  (d) => d.subjectId === subId && d.isShortage
                ).length;
                return (
                  <button
                    key={subId}
                    type="button"
                    onClick={() => setBondSubjectFilter(subId)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                      bondSubjectFilter === subId
                        ? "bg-[#087FC4] text-white shadow-xs"
                        : "bg-white text-slate-600 hover:text-[#101C34] border border-[#DCE8F5]"
                    }`}
                  >
                    <span>{sub.name}</span>
                    {subShortages > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {subShortages}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* View Mode Segmented Dock */}
            <div className="inline-flex items-center p-0.5 bg-[#EEF4FA] border border-[#DEE7F0] rounded-full self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDefaulterViewMode("SHORTAGE")}
                className={`px-3.5 py-1 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                  defaulterViewMode === "SHORTAGE"
                    ? "bg-white text-rose-700 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Below 75% ({defaultersList.filter((d) => (bondSubjectFilter === "ALL" || d.subjectId === bondSubjectFilter) && d.isShortage).length})
              </button>
              <button
                type="button"
                onClick={() => setDefaulterViewMode("BONDS")}
                className={`px-3.5 py-1 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                  defaulterViewMode === "BONDS"
                    ? "bg-white text-amber-700 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Active Bonds ({bondsList.length})
              </button>
              <button
                type="button"
                onClick={() => setDefaulterViewMode("ALL")}
                className={`px-3.5 py-1 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                  defaulterViewMode === "ALL"
                    ? "bg-white text-[#087FC4] shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Roster
              </button>
            </div>
          </div>

          {/* VIEW 1 & 3: Students Roster Table (Shortage or All) */}
          {(defaulterViewMode === "SHORTAGE" || defaulterViewMode === "ALL") && (
            <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] overflow-hidden shadow-xs">
              <div className="p-5 border-b border-[#EDF4FB] flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#101C34]">
                    {defaulterViewMode === "SHORTAGE" ? "Students with Attendance Below 75%" : "Subject Enrolled Roster"}
                  </h4>
                  <p className="text-xs text-[#647895] mt-0.5">
                    {defaulterViewMode === "SHORTAGE"
                      ? "Identified students who do not meet institutional attendance criteria. Click 'Send Bond' to push an accountability obligation to their profile."
                      : "Overview of all enrolled students and their attendance metrics across subject tracks."}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#F8FBFE] border-b border-[#E2EEFC] text-[#51637B]">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-[10px] uppercase tracking-wider text-slate-500">STUDENT</th>
                      <th className="py-3.5 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500">SUBJECT & BATCH</th>
                      <th className="py-3.5 px-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">CLASSES ATTENDED</th>
                      <th className="py-3.5 px-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">ATTENDANCE %</th>
                      <th className="py-3.5 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500">STANDING / ACTIVE BOND</th>
                      <th className="py-3.5 px-4 text-right font-bold text-[10px] uppercase tracking-wider text-slate-500">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F6FC]">
                    {defaultersList.filter((d) => {
                      if (bondSubjectFilter !== "ALL" && d.subjectId !== bondSubjectFilter) return false;
                      if (defaulterViewMode === "SHORTAGE") return d.isShortage;
                      return true;
                    }).length > 0 ? (
                      defaultersList
                        .filter((d) => {
                          if (bondSubjectFilter !== "ALL" && d.subjectId !== bondSubjectFilter) return false;
                          if (defaulterViewMode === "SHORTAGE") return d.isShortage;
                          return true;
                        })
                        .map((student) => {
                          const existingBond = bondsList.find(
                            (b) => b.userId === student.userId && b.status === "ACTIVE"
                          );
                          return (
                            <tr key={`${student.userId}-${student.subjectId}`} className="hover:bg-[#F9FCFF] transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#EBF4FC] text-[#087FC4] font-bold flex items-center justify-center text-xs">
                                    {student.userName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[#101C34]">{student.userName}</p>
                                    <p className="text-[10px] text-[#647895] font-mono">{student.userEid}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <p className="font-medium text-[#101C34]">{student.subjectName}</p>
                                <p className="text-[10px] text-[#647895]">
                                  {student.batchName ? `Batch: ${student.batchName}` : "Whole Subject"}
                                </p>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-[#101C34]">
                                  {student.attendedSessions}
                                </span>
                                <span className="text-slate-400"> / {student.totalSessions} sessions</span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    student.percentage < student.minRequiredPercentage
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {student.percentage}%
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {existingBond ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <FileSignature className="w-3 h-3 text-amber-600" />
                                    <span>Bond: {existingBond.title}</span>
                                  </span>
                                ) : student.isShortage ? (
                                  <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Below {student.minRequiredPercentage}% requirement</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Satisfies attendance</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSendBond(student)}
                                  className="px-3.5 py-1.5 rounded-full bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs ml-auto transition-all active:scale-95 cursor-pointer"
                                  title="Send accountability bond to student account"
                                >
                                  <FileSignature className="w-3.5 h-3.5" />
                                  <span>Send Bond</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-[#647895]">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <p className="font-semibold text-[#101C34] text-sm">
                            {defaulterViewMode === "SHORTAGE"
                              ? "No students currently below the attendance threshold!"
                              : "No enrolled students found for the selected subject."}
                          </p>
                          <p className="text-[11px] text-[#647895] mt-1">
                            {defaulterViewMode === "SHORTAGE"
                              ? "All tracked members in this subject track satisfy the institutional attendance requirement."
                              : "Enroll members via the Subject Management tab to begin tracking."}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: Issued Bonds List */}
          {defaulterViewMode === "BONDS" && (
            <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EDF4FB]">
                <div>
                  <h4 className="font-semibold text-sm text-[#101C34]">Issued Accountability Bonds ({bondsList.length})</h4>
                  <p className="text-xs text-[#647895] mt-0.5">
                    Official bonds and shortage notices active on students' accounts.
                  </p>
                </div>
              </div>

              {bondsList.length > 0 ? (
                <div className="space-y-3">
                  {bondsList.map((bond) => (
                    <div
                      key={bond.id || bond._id}
                      className="p-4 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-xs text-[#101C34]">{bond.title}</h5>
                          {bond.subjectName && (
                            <span className="px-2 py-0.5 rounded-md bg-[#E8F3FD] text-[#087FC4] text-[10px] font-semibold">
                              {bond.subjectName}
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              bond.status === "ACTIVE"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {bond.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647895]">
                          Issued to: <strong className="text-[#101C34]">{bond.userName}</strong> • Date: {bond.issuedDate}
                        </p>
                        <p className="text-xs text-[#647895]">{bond.reason}</p>
                        <p className="text-xs text-amber-800 font-medium mt-1">
                          Obligation: {bond.penaltyObligation}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {bond.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleResolveBond(bond.id || bond._id || "", bond.userName)}
                            className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBond(bond.id || bond._id || "")}
                          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Revoke bond"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#647895]">
                  <FileSignature className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-[#101C34]">No active bonds or obligations issued yet.</p>
                  <p className="text-[11px] text-[#647895] mt-1">
                    When you click "Send Bond" on any student below 75%, their active bond will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 10: OFFICIAL NOTICES
         ========================================================================= */}
      {activeTab === "notices" && (
        <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Official Notices & Announcements</h3>
            <p className="text-xs text-[#647895] mt-0.5">Institutional schedule revisions, studio milestones, and agency directives.</p>
          </div>

          <div className="space-y-3">
            {notices.map((n) => (
              <div key={n.id} className="p-4 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-[#101C34]">{n.title}</h4>
                  <span className="text-[10px] text-[#647895]">{n.publishedDate || (n as any).date || "Notice"}</span>
                </div>
                <p className="text-xs text-[#647895]">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          GUIDED MODAL: SUBJECT CREATION & ENROLLMENT (ADMINS)
         ========================================================================= */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2EEFC] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EDF4FB] flex items-center justify-between">
              <div>
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">
                  {editingSubjectId ? "Edit Subject & Curriculum Configuration" : "Create New Subject Track"}
                </h3>
                <p className="text-xs text-[#647895] mt-0.5">
                  Configure subject details, assign mentors, enroll members, and define optional groups/batches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveSubject} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-7 custom-scrollbar">
              {/* Conflict Warnings Banner */}
              {scheduleConflicts.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Scheduling Conflict Detected!</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    {scheduleConflicts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECTION 1: Subject Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#EDF4FB]">
                  <span className="w-5 h-5 rounded-full bg-[#087FC4] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                  <h4 className="font-semibold text-sm text-[#101C34]">Subject Information</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-[#647895] uppercase tracking-wider block mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Engineering & Architecture"
                      className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#647895] uppercase tracking-wider block mb-1">
                      Subject Code
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. ENG-101"
                      className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] font-mono focus:outline-none focus:border-[#087FC4]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      DEPARTMENT
                    </label>
                    <input
                      type="text"
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      placeholder="e.g. Engineering & Design"
                      className="w-full text-xs py-2.5 px-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-[#647895] uppercase tracking-wider block mb-1">
                      Description & Syllabus
                    </label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Overview of subject curriculum, learning outcomes, and expectations..."
                      className="w-full text-xs py-2 px-3 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Mentor Assignment */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#EDF4FB]">
                  <span className="w-5 h-5 rounded-full bg-[#087FC4] text-white text-[11px] font-bold flex items-center justify-center">2</span>
                  <h4 className="font-semibold text-sm text-[#101C34]">Assigned Lead Mentor</h4>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#647895] uppercase tracking-wider block mb-1">
                    Select Subject Mentor
                  </label>
                  <select
                    value={formMentorId}
                    onChange={(e) => {
                      setFormMentorId(e.target.value);
                      const found = allUsers.find((u) => u.id === e.target.value);
                      if (found) setFormMentorName(found.name);
                    }}
                    className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) • {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 3: Student Enrollment from Members Directory */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EDF4FB]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#087FC4] text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    <h4 className="font-semibold text-sm text-[#101C34]">Student Enrollment</h4>
                  </div>
                  <span className="text-xs font-semibold text-[#087FC4]">
                    {formEnrolledMembers.length} member(s) enrolled
                  </span>
                </div>

                {/* Member Search & Quick Actions */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl px-3 py-1.5">
                    <Search className="w-3.5 h-3.5 text-[#647895]" />
                    <input
                      type="text"
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      placeholder="Search member directory by name or EID..."
                      className="bg-transparent text-xs text-[#101C34] placeholder:text-[#647895] focus:outline-none w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredMembers}
                    className="text-xs font-semibold text-[#087FC4] hover:underline"
                  >
                    Select Filtered
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormEnrolledMembers([])}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                {/* Members Selection List */}
                <div className="max-h-48 overflow-y-auto border border-[#E2EEFC] rounded-2xl p-2 space-y-1 custom-scrollbar">
                  {allUsers
                    .filter((u) =>
                      u.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                      (u.eidNumber && u.eidNumber.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                    )
                    .map((u) => {
                      const isSelected = formEnrolledMembers.some((m) => m.userId === u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleToggleEnrollUser(u)}
                          className={`p-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#087FC4]/10 border border-[#087FC4]/30"
                              : "hover:bg-[#F4F8FC] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded text-[#087FC4] focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <p className={`font-semibold ${isSelected ? "text-[#087FC4]" : "text-[#101C34]"}`}>
                                {u.name}
                              </p>
                              <p className="text-[10px] text-[#647895] font-mono">{u.eidNumber || "WON-MB-0000"} • {u.department}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold ${isSelected ? "text-[#087FC4]" : "text-slate-400"}`}>
                            {isSelected ? "Enrolled" : "Not Enrolled"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* SECTION 4: Group / Batch Configuration (Optional) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EDF4FB]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#087FC4] text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    <h4 className="font-semibold text-sm text-[#101C34]">Group & Batch Subdivisions</h4>
                  </div>
                </div>

                <div className="bg-[#F8FBFE] border border-[#E5F2FF] rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#101C34]">Divide this subject into groups/batches?</p>
                      <p className="text-[11px] text-[#647895]">
                        Choose whether all members attend simultaneously or split into different batch timings.
                      </p>
                    </div>

                    <div className="inline-flex p-1 bg-slate-100/90 border border-slate-200/70 rounded-2xl gap-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => {
                          setFormHasBatches(false);
                          setFormBatches([]);
                        }}
                        className={`px-4 py-2 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
                          !formHasBatches
                            ? "bg-[#087FC4] text-white shadow-[0_2px_8px_rgba(8,127,196,0.25)]"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Single Class
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormHasBatches(true);
                          if (formBatches.length === 0) {
                            handleAddBatch();
                          }
                        }}
                        className={`px-4 py-2 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
                          formHasBatches
                            ? "bg-[#087FC4] text-white shadow-[0_2px_8px_rgba(8,127,196,0.25)]"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Multiple Batches
                      </button>
                    </div>
                  </div>

                  {/* If Batches Enabled: Batch Creator List */}
                  {formHasBatches && (
                    <div className="space-y-4 pt-4 border-t border-[#EDF4FB]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#101C34] tracking-wide">Configured Batches ({formBatches.length})</span>
                        <button
                          type="button"
                          onClick={handleAddBatch}
                          className="text-xs font-semibold text-[#087FC4] hover:underline flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-sky-100 shadow-2xs hover:bg-sky-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Batch</span>
                        </button>
                      </div>

                      {formBatches.map((batch, bIndex) => (
                        <div key={batch.id} className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-[0_2px_12px_rgba(16,28,52,0.03)] hover:border-sky-300/60 transition-all">
                          <div className="flex items-center justify-between gap-3">
                            <input
                              type="text"
                              value={batch.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormBatches((prev) =>
                                  prev.map((b) => (b.id === batch.id ? { ...b, name: val } : b))
                                );
                              }}
                              className="text-xs font-bold text-slate-800 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-1.5 focus:bg-white focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveBatch(batch.id)}
                              className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>

                          {/* Batch Schedule Details: Days, Start/End Time Slot, Location */}
                          <div className="space-y-3.5 pt-3 border-t border-slate-100">
                            {/* Days of Week for this Batch */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                  DAYS OF THE WEEK
                                </label>
                                <span className="text-[10px] font-semibold text-[#087FC4] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                                  {batch.schedule?.days || formDays || "Select Days"}
                                </span>
                              </div>
                              <div className="inline-flex p-1 bg-slate-100/80 border border-slate-200/60 rounded-xl gap-1 flex-wrap">
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                  const currentDaysStr = batch.schedule?.days || formDays || "";
                                  const daysList = currentDaysStr.split(",").map((d) => d.trim()).filter(Boolean);
                                  const isSelected = daysList.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        const updated = isSelected
                                          ? daysList.filter((d) => d !== day)
                                          : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter(
                                              (d) => daysList.includes(d) || d === day
                                            );
                                        const newDaysStr = updated.join(", ");
                                        setFormBatches((prev) =>
                                          prev.map((b) =>
                                            b.id === batch.id
                                              ? { ...b, schedule: { ...b.schedule, days: newDaysStr } }
                                              : b
                                          )
                                        );
                                      }}
                                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-[#087FC4] text-white shadow-xs"
                                          : "text-slate-600 hover:bg-white/80"
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Start Time & End Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  START TIME
                                </label>
                                <div className="relative">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="time"
                                    value={batch.schedule?.startTime || "09:00"}
                                    onChange={(e) => {
                                      const newStart = e.target.value;
                                      const currentEnd = batch.schedule?.endTime || "10:00";
                                      const formatted = formatTimeRange(newStart, currentEnd);
                                      setFormBatches((prev) =>
                                        prev.map((b) =>
                                          b.id === batch.id
                                            ? {
                                                ...b,
                                                schedule: {
                                                  ...b.schedule,
                                                  startTime: newStart,
                                                  endTime: currentEnd,
                                                  timeSlot: formatted,
                                                },
                                              }
                                            : b
                                        )
                                      );
                                    }}
                                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-semibold bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  END TIME
                                </label>
                                <div className="relative">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="time"
                                    value={batch.schedule?.endTime || "10:00"}
                                    onChange={(e) => {
                                      const currentStart = batch.schedule?.startTime || "09:00";
                                      const newEnd = e.target.value;
                                      const formatted = formatTimeRange(currentStart, newEnd);
                                      setFormBatches((prev) =>
                                        prev.map((b) =>
                                          b.id === batch.id
                                            ? {
                                                ...b,
                                                schedule: {
                                                  ...b.schedule,
                                                  startTime: currentStart,
                                                  endTime: newEnd,
                                                  timeSlot: formatted,
                                                },
                                              }
                                            : b
                                        )
                                      );
                                    }}
                                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-semibold bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Preset Buttons & Formatted Time Slot */}
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Time Slot:</span>
                                <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs font-mono">
                                  {batch.schedule?.timeSlot || "09:00 - 10:00"}
                                </span>
                              </div>
                              <div className="inline-flex p-0.5 bg-white border border-slate-200/80 rounded-lg gap-1 flex-wrap">
                                {[
                                  { s: "09:00", e: "10:00", label: "09:00 - 10:00" },
                                  { s: "11:00", e: "12:00", label: "11:00 - 12:00" },
                                  { s: "14:00", e: "15:00", label: "14:00 - 15:00" },
                                  { s: "16:00", e: "17:00", label: "16:00 - 17:00" },
                                ].map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      const formatted = formatTimeRange(preset.s, preset.e);
                                      setFormBatches((prev) =>
                                        prev.map((b) =>
                                          b.id === batch.id
                                            ? {
                                                ...b,
                                                schedule: {
                                                  ...b.schedule,
                                                  startTime: preset.s,
                                                  endTime: preset.e,
                                                  timeSlot: formatted,
                                                },
                                              }
                                            : b
                                        )
                                      );
                                    }}
                                    className="px-2 py-0.5 hover:bg-sky-50 hover:text-[#087FC4] rounded-md text-[10px] font-medium text-slate-600 transition-colors cursor-pointer"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Location / Room */}
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                ROOM / STUDIO LINK
                              </label>
                              <div className="relative">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={batch.schedule?.room || ""}
                                  placeholder="e.g. Studio Alpha / Online"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormBatches((prev) =>
                                      prev.map((b) =>
                                        b.id === batch.id
                                          ? { ...b, schedule: { ...b.schedule, room: val } }
                                          : b
                                      )
                                    );
                                  }}
                                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Assign Enrolled Members to this Batch */}
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                              ASSIGN STUDENTS TO {batch.name.toUpperCase()} ({batch.memberIds.length} ASSIGNED):
                            </p>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              {formEnrolledMembers.length > 0 ? (
                                formEnrolledMembers.map((m) => {
                                  const isAssigned = batch.memberIds.includes(m.userId);
                                  return (
                                    <button
                                      key={m.userId}
                                      type="button"
                                      onClick={() => handleToggleMemberInBatch(batch.id, m.userId)}
                                      className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                        isAssigned
                                          ? "bg-[#087FC4] text-white shadow-2xs font-semibold"
                                          : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                                      }`}
                                    >
                                      <span>{m.name}</span>
                                      {isAssigned && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">
                                  Enroll students in Step 3 above to allocate them into batches.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: Schedule Configuration (Single Class) */}
              {!formHasBatches && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#EDF4FB]">
                    <span className="w-5 h-5 rounded-full bg-[#087FC4] text-white text-[11px] font-bold flex items-center justify-center">5</span>
                    <h4 className="font-semibold text-sm text-[#101C34]">Subject Schedule</h4>
                  </div>

                  <div className="bg-[#F8FBFE] border border-[#E5F2FF] rounded-2xl p-4 sm:p-5 space-y-4">
                    {/* Days of Week Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          DAYS OF THE WEEK
                        </label>
                        {formDays && (
                          <span className="text-[10px] font-semibold text-[#087FC4] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                            {formDays}
                          </span>
                        )}
                      </div>
                      <div className="inline-flex p-1 bg-slate-100/80 border border-slate-200/60 rounded-xl gap-1 flex-wrap">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                          const activeDaysList = formDays ? formDays.split(",").map((d) => d.trim()).filter(Boolean) : [];
                          const isSelected = activeDaysList.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const updated = isSelected
                                  ? activeDaysList.filter((d) => d !== day)
                                  : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter(
                                      (d) => activeDaysList.includes(d) || d === day
                                    );
                                setFormDays(updated.join(", "));
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#087FC4] text-white shadow-xs"
                                  : "text-slate-600 hover:bg-white/80"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Slot & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              START TIME
                            </label>
                            <div className="relative">
                              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="time"
                                value={formStartTime}
                                onChange={(e) => {
                                  const newStart = e.target.value;
                                  setFormStartTime(newStart);
                                  setFormTimeSlot(formatTimeRange(newStart, formEndTime));
                                }}
                                className="w-full pl-8 pr-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-200/80 focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 rounded-xl text-slate-800 outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              END TIME
                            </label>
                            <div className="relative">
                              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="time"
                                value={formEndTime}
                                onChange={(e) => {
                                  const newEnd = e.target.value;
                                  setFormEndTime(newEnd);
                                  setFormTimeSlot(formatTimeRange(formStartTime, newEnd));
                                }}
                                className="w-full pl-8 pr-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-200/80 focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 rounded-xl text-slate-800 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Presets and formatted preview */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-white border border-slate-200/70 rounded-xl text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Slot:</span>
                            <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs font-mono">
                              {formTimeSlot || formatTimeRange(formStartTime, formEndTime)}
                            </span>
                          </div>
                          <div className="inline-flex p-0.5 bg-slate-50 border border-slate-200/80 rounded-lg gap-1 flex-wrap">
                            {[
                              { s: "09:00", e: "10:00", label: "09:00 - 10:00" },
                              { s: "11:00", e: "12:00", label: "11:00 - 12:00" },
                              { s: "14:00", e: "15:00", label: "14:00 - 15:00" },
                              { s: "16:00", e: "17:00", label: "16:00 - 17:00" },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setFormStartTime(preset.s);
                                  setFormEndTime(preset.e);
                                  setFormTimeSlot(formatTimeRange(preset.s, preset.e));
                                }}
                                className="px-2 py-0.5 hover:bg-sky-50 hover:text-[#087FC4] rounded-md text-[10px] font-medium text-slate-600 transition-colors cursor-pointer"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          ROOM / STUDIO LINK
                        </label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formRoom}
                            onChange={(e) => setFormRoom(e.target.value)}
                            placeholder="e.g. Studio Alpha / Online"
                            className="w-full pl-8 pr-3.5 py-2 text-xs bg-white border border-slate-200/80 focus:border-[#087FC4] focus:ring-2 focus:ring-sky-500/20 rounded-xl text-slate-800 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conflict Check Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={runConflictValidation}
                  disabled={isValidatingSchedule}
                  className="text-xs font-semibold text-[#087FC4] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isValidatingSchedule ? "Checking conflicts..." : "Validate Schedule Conflicts"}</span>
                </button>
              </div>

              {/* Modal Actions */}
              <div className="pt-6 border-t border-[#EDF4FB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {editingSubjectId ? "Update Subject" : "Save Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SEND ACCOUNTABILITY BOND TO STUDENT ACCOUNT
         ========================================================================= */}
      {isBondModalOpen && targetStudentForBond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2EEFC] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EDF4FB] flex items-center justify-between">
              <div>
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Send Attendance Warning</h3>
                <p className="text-xs text-[#647895] mt-0.5">
                  Send an attendance warning and next steps to this student.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBondModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitBond} className="p-6 space-y-5">
              {/* Target Student Banner */}
              <div className="p-4 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#101C34]">{targetStudentForBond.userName}</p>
                  <p className="text-[11px] text-[#647895] font-mono">
                    {targetStudentForBond.userEid} • {targetStudentForBond.subjectName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#647895] block">Attendance</span>
                  <span className="text-sm font-bold text-rose-600">
                    {targetStudentForBond.currentAttendance}% ({targetStudentForBond.attendedSessions}/{targetStudentForBond.totalSessions})
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-[11px] font-semibold text-[#647895] block mb-1.5">
                  Quick Title Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Attendance Shortage Warning",
                    "Mandatory Review Session",
                    "Lab Hours Compensation",
                    "Academic Standing Notice",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBondFormTitle(`${preset}: ${targetStudentForBond.subjectName}`)}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-[#F4F8FC] hover:bg-[#EEF4FA] border border-[#DCE8F5] text-[#101C34] font-medium transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bond Title */}
              <div>
                <label className="text-[11px] font-semibold text-[#647895] block mb-1">
                  Bond / Notice Title *
                </label>
                <input
                  type="text"
                  required
                  value={bondFormTitle}
                  onChange={(e) => setBondFormTitle(e.target.value)}
                  placeholder="e.g. Attendance Shortage Notice: Engineering"
                  className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              {/* Obligation Terms */}
              <div>
                <label className="text-[11px] font-semibold text-[#647895] block mb-1">
                  Obligation / Action Required to Clear *
                </label>
                <textarea
                  rows={3}
                  required
                  value={bondFormObligation}
                  onChange={(e) => setBondFormObligation(e.target.value)}
                  placeholder="Specify exact requirement student must complete (e.g. Attend next 2 review sessions and submit practical tasks)..."
                  className="w-full text-xs py-2 px-3 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              {/* Reason / Context */}
              <div>
                <label className="text-[11px] font-semibold text-[#647895] block mb-1">
                  Reason / Background Note
                </label>
                <input
                  type="text"
                  value={bondFormReason}
                  onChange={(e) => setBondFormReason(e.target.value)}
                  placeholder="e.g. Attendance fell below 75% requirement"
                  className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#EDF4FB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBondModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBond}
                  className="px-5 py-2 rounded-xl bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>{isSubmittingBond ? "Sending Bond..." : "Send Bond to Student Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
