// WON Platform Shared API Service & Data Contracts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "LEAD";
  sparkBalance: number;
  eidNumber: string;
  department: string;
  bio?: string;
  allowedModules?: string[];
}

export interface EnrolledMember {
  userId: string;
  name: string;
  email?: string;
  eidNumber?: string;
  department?: string;
  enrolledAt?: string;
}

export interface BatchRecord {
  id: string;
  name: string; // e.g. "Batch A"
  description?: string;
  mentorId?: string;
  mentorName?: string;
  schedule?: {
    days?: string;
    startTime?: string;
    endTime?: string;
    timeSlot?: string;
    room?: string;
  };
  memberIds: string[];
  status?: string;
}

export interface SubjectRecord {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  department: string;
  mentor: string;
  mentorId?: string;
  coMentors?: string[];
  enrolledMembers?: EnrolledMember[];
  hasBatches?: boolean;
  batches?: BatchRecord[];
  timeSlot: string;
  startTime?: string;
  endTime?: string;
  room: string;
  days: string;
  status?: "ACTIVE" | "INACTIVE";
  minAttendancePercentage?: number;
  createdAt?: string;
}

export const subjectsApi = {
  async getAll(): Promise<SubjectRecord[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.map((s: any) => ({
        ...s,
        id: s.id || s._id,
        _id: s._id || s.id,
      }));
    } catch (e) {
      console.error("Failed to fetch subjects:", e);
      return [];
    }
  },

  async getById(id: string): Promise<SubjectRecord> {
    const res = await fetch(`${API_BASE_URL}/subjects/${id}`);
    if (!res.ok) throw new Error("Subject not found");
    const s = await res.json();
    return { ...s, id: s.id || s._id, _id: s._id || s.id };
  },

  async create(data: Partial<SubjectRecord>): Promise<SubjectRecord> {
    const res = await fetch(`${API_BASE_URL}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to create subject in database");
    }
    return { ...result, id: result.id || result._id, _id: result._id || result.id };
  },

  async update(id: string, data: Partial<SubjectRecord>): Promise<SubjectRecord> {
    const res = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to update subject in database");
    }
    return { ...result, id: result.id || result._id, _id: result._id || result.id };
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to delete subject");
    }
    return result;
  },

  async validateSchedule(data: {
    days: string;
    timeSlot: string;
    mentor?: string;
    mentorId?: string;
    batchName?: string;
    memberIds?: string[];
    excludeSubjectId?: string;
    excludeBatchId?: string;
  }): Promise<{ hasConflict: boolean; conflicts: string[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/validate-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { hasConflict: false, conflicts: [] };
      return await res.json();
    } catch (e) {
      return { hasConflict: false, conflicts: [] };
    }
  },
};

export const usersApi = {
  async getAll(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((u: any) => ({
        ...u,
        id: u.id || u._id,
        _id: u._id || u.id,
      }));
    } catch (e) {
      console.error("Failed to fetch users from database:", e);
      return [];
    }
  },

  async create(data: {
    name: string;
    email: string;
    pass: string;
    role: string;
    department?: string;
    sparkBalance?: number;
    eidNumber?: string;
    allowedModules?: string[];
  }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to create user in database");
    }
    return {
      ...result,
      id: result.id || result._id,
      _id: result._id || result.id,
    };
  },

  async updateScope(
    userId: string,
    allowedModules: string[]
  ): Promise<{ success: boolean; user: Partial<User> }> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${encodeURIComponent(userId)}/scope`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedModules }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to update user access");
    }
    return result;
  },

  async delete(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to delete user");
    }
    return result;
  },

  async updateProfile(
    userId: string,
    data: { name?: string; bio?: string; department?: string }
  ): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/profile/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to update profile");
    }
    return {
      ...result,
      id: result.id || result._id,
      _id: result._id || result.id,
    };
  },
};

export const authApi = {
  async login(email: string, pass: string): Promise<{ accessToken: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pass }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Invalid credentials. Please verify your email and password.");
    }
    return data;
  },

  async forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Could not send password reset code.");
    }
    return data;
  },

  async resetPassword(email: string, code: string, newPass: string): Promise<{ ok: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPass }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Could not reset password.");
    }
    return data;
  },

  async changePassword(
    email: string,
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, currentPass, newPass }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to update password in database.");
    }
    return data;
  },

  async register(data: {
    email: string;
    pass: string;
    name: string;
    department?: string;
    role?: string;
  }): Promise<{ id: string; email: string; name: string; role: string; eidNumber: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to register new account.");
    }
    return result;
  },
};

export const noticesApi = {
  async getAll(): Promise<NoticeRecord[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/notices`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.map((n: any) => ({ ...n, id: n.id || n._id, _id: n._id || n.id }));
    } catch (e) {
      console.error("Failed to fetch notices:", e);
      return [];
    }
  },

  async publish(data: {
    title: string;
    content: string;
    authorityName: string;
    authorityRole: string;
    virtualSignatureHash?: string;
  }): Promise<NoticeRecord> {
    const res = await fetch(`${API_BASE_URL}/notices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        virtualSignatureHash: data.virtualSignatureHash || `SIG-WON-${Date.now().toString(36).toUpperCase()}`,
      }),
    });
    const result = await res.json();
    return { ...result, id: result.id || result._id, _id: result._id || result.id };
  },

  async sendEmail(payload: {
    toEmails: string[];
    title: string;
    salutation?: string;
    subject?: string;
    leadStatement: string;
    bullets?: Array<{ heading?: string; bodyText: string }>;
    calloutLinkText?: string;
    signoffGreeting?: string;
    signoffTeam?: string;
    footerCopyright?: string;
    footerDisclaimer?: string;
  }): Promise<{ success: boolean; emailId?: string; count?: number; error?: string }> {
    try {
      // 1. Try local Next.js Route Handler first
      const res = await fetch("/api/send-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return await res.json();
      }

      // 2. If Next.js route fails, try NestJS backend endpoint
      const backendRes = await fetch(`${API_BASE_URL}/notices/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (backendRes.ok) {
        return await backendRes.json();
      }

      const errData = await backendRes.json().catch(() => null);
      throw new Error(errData?.error || errData?.message || "Failed to dispatch email");
    } catch (err: any) {
      console.error("Failed to send notice email:", err);
      return { success: false, error: err.message || "Email dispatch failed" };
    }
  },
};

export interface AttendanceRecord {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  userEid?: string;
  subject: string;
  subjectId?: string;
  batchId?: string;
  batchName?: string;
  date: string;
  timeSlot?: string;
  status: "PRESENT" | "ABSENT";
  sparkDelta: number; // +0.25 or -1.00
  markedByUserId?: string;
  markedByName?: string;
  remarks?: string;
  createdAt?: string;
}

export interface MemberSubjectSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  department: string;
  mentor: string;
  timeSlot: string;
  days: string;
  room: string;
  hasBatches?: boolean;
  batchName?: string;
  batchId?: string;
  totalSessions: number;
  attendedSessions: number;
  missedSessions: number;
  percentage: number;
  minRequiredPercentage: number;
  standing: "GOOD" | "WARNING" | "CRITICAL";
  records: Array<{
    id: string;
    date: string;
    status: "PRESENT" | "ABSENT";
    sparkDelta: number;
    timeSlot?: string;
    batchName?: string;
    markedByName?: string;
    createdAt?: string;
  }>;
}

export interface MemberAttendanceDashboard {
  userId: string;
  userName: string;
  eidNumber: string;
  sparkBalance: number;
  subjects: MemberSubjectSummary[];
}

export interface BondRecord {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  title: string;
  reason: string;
  penaltyObligation: string; // Non-monetary fine/accountability mechanism
  subjectName?: string;
  subjectId?: string;
  status: "ACTIVE" | "COMPLETED" | "RESOLVED";
  issuedDate: string;
}

export interface SparkTransaction {
  id: string;
  userId: string;
  change: number; // +0.25 or -1.00
  balanceAfter: number;
  reason: string;
  timestamp: string;
}

export interface TimetableEntry {
  id: string;
  subject: string;
  dayOfWeek: string;
  timeSlot: string;
  room: string;
  mentor: string;
}

export interface NoticeRecord {
  id: string;
  title: string;
  content: string;
  publishedDate: string;
  authorityName: string;
  authorityRole: string;
  virtualSignatureHash: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  contributionType: "Core Development" | "Client Project" | "Bounty / Sprint" | "R&D";
  companyDetails: {
    clientName: string;
    domain: string;
    contactEmail: string;
  };
  description: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  contributorSlots: number;
  filledSlots: number;
}

export interface ContributorApplication {
  id: string;
  projectId: string;
  projectTitle: string;
  userId: string;
  userName: string;
  roleProposed: string;
  statement: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
}

export interface DocumentCategory {
  id: string;
  _id?: string;
  name: string;
}

export interface DocumentRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  category: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface CertificateRecord {
  id: string;
  recipientName: string;
  recipientEid: string;
  projectName: string;
  contributionRole: string;
  issueDate: string;
  certificateNumber: string;
  qrVerificationUrl: string;
}

export interface MemberRecord {
  id: string;
  name: string;
  email?: string;
  role: string;
  department: string;
  eidNumber: string;
  sparkBalance: number;
  bio?: string;
  avatarUrl?: string;
  links: {
    github?: string;
    portfolio?: string;
    linkedin?: string;
  };
  timeline: {
    event: "JOINED" | "PROMOTED" | "CONTRIBUTION_MILESTONE" | "LEFT" | "FOUNDED" | "EXECUTIVE_OVERSIGHT";
    title: string;
    date: string;
    details: string;
  }[];
}

export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
}

export interface PollQuestion {
  id: string;
  questionText: string;
  options: PollOption[];
}

export interface VotingPoll {
  id: string;
  _id?: string;
  title: string;
  description: string;
  category: string;
  targetType?: "ALL" | "TEAMS" | "USERS" | "ANONYMOUS";
  targetTeams?: string[];
  targetUserIds?: string[];
  isAnonymousAllowed?: boolean;
  options: PollOption[];
  questions?: PollQuestion[];
  userVotes?: { userId?: string; questionId?: string; optionId: string; isAnonymous?: boolean }[];
  userVotedOptionId?: string;
  expiresAt: string;
  createdBy?: string;
}

export interface FeedbackQuestion {
  id: string;
  questionText: string;
  type: "TEXT" | "PARAGRAPH" | "RATING" | "MULTIPLE_CHOICE" | "CHECKBOXES";
  options?: string[];
  required?: boolean;
}

export interface FeedbackResponse {
  userId?: string;
  userName?: string;
  isAnonymous?: boolean;
  answers: { [questionId: string]: any };
  submittedAt: string;
}

export interface FeedbackForm {
  id: string;
  _id?: string;
  title: string;
  targetCategory: string;
  description: string;
  targetType?: "ALL" | "TEAMS" | "USERS" | "ANONYMOUS";
  targetTeams?: string[];
  targetUserIds?: string[];
  isAnonymousAllowed?: boolean;
  questions: FeedbackQuestion[];
  responses?: FeedbackResponse[];
  submitted?: boolean;
  createdBy?: string;
}

export interface ProposalCategory {
  id: string;
  _id?: string;
  name: string;
}

export interface IdeationRecord {
  id: string;
  _id?: string;
  problemStatement: string;
  proposedSolution: string;
  raisedBy: string;
  upvotes: number;
  category: string;
  status: "OPEN" | "UNDER_REVIEW" | "APPROVED" | "IMPLEMENTED";
  createdAt?: string;
  createdAtDate?: string;
}

export interface FundInflow {
  id: string;
  _id?: string;
  amount: number;
  source: string;
  depositedBy: string;
  depositedById?: string;
  date: string;
  notes?: string;
  receiptRef: string;
  createdAt?: string;
}

export interface FundRequest {
  id: string;
  _id?: string;
  title: string;
  amount: number;
  reason: string;
  workProject: string;
  requestedBy: string;
  requestedById: string;
  userEid?: string;
  urgency: "NORMAL" | "URGENT";
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISBURSED";
  reviewedBy?: string;
  reviewNotes?: string;
  disbursedDate?: string;
  receiptRef?: string;
  createdAt?: string;
}

export interface ExpenseReceipt {
  id: string;
  _id?: string;
  receiptRef: string;
  title: string;
  amount: number;
  usedBy: string;
  usedById?: string;
  workProject: string;
  category: string;
  date: string;
  notes?: string;
  proofUrl?: string;
  approvedBy?: string;
  fundRequestId?: string;
  createdAt?: string;
}

export interface FundSummary {
  totalBalance: number;
  totalInflow: number;
  totalDisbursed: number;
  currency: string;
  targetRaiseAmount?: number;
  currentRaisedAmount?: number;
  totalInvestedAmount?: number;
  investments?: {
    id: string;
    investor: string;
    amount: number;
    category: string;
    date: string;
    receiptRef: string;
  }[];
}

export interface TeamMember {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  eidNumber: string;
  department: string;
  sparkBalance: number;
}

export interface Team {
  id: string;
  _id?: string;
  name: string;
  description: string;
  leadName: string;
  color?: string;
  memberIds: string[];
  members: TeamMember[];
  memberCount: number;
}

export const teamsApi = {
  getAll: async (): Promise<Team[]> => {
    const res = await fetch(`${API_BASE_URL}/teams`);
    if (!res.ok) throw new Error("Failed to fetch teams");
    return res.json();
  },
  create: async (data: { name: string; description?: string; leadName?: string; color?: string }): Promise<Team> => {
    const res = await fetch(`${API_BASE_URL}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create team");
    }
    return res.json();
  },
  delete: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/teams/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete team");
    }
    return res.json();
  },
  addMember: async (teamId: string, userId: string): Promise<Team[]> => {
    const res = await fetch(`${API_BASE_URL}/teams/${encodeURIComponent(teamId)}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to add member to team");
    }
    return res.json();
  },
  removeMember: async (teamId: string, userId: string): Promise<Team[]> => {
    const res = await fetch(`${API_BASE_URL}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to remove member from team");
    }
    return res.json();
  },
};

export const projectsApi = {
  getAll: async (): Promise<ProjectRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/projects`);
    if (!res.ok) throw new Error("Failed to fetch projects");
    return res.json();
  },
  create: async (data: Partial<ProjectRecord>): Promise<ProjectRecord> => {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create project");
    }
    return res.json();
  },
  update: async (id: string, data: Partial<ProjectRecord>): Promise<ProjectRecord> => {
    const res = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update project");
    }
    return res.json();
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete project");
    }
    return res.json();
  },
};

export const contributorsApi = {
  getAll: async (): Promise<ContributorApplication[]> => {
    const res = await fetch(`${API_BASE_URL}/contributors/all`);
    if (!res.ok) throw new Error("Failed to fetch applications");
    return res.json();
  },
  apply: async (data: {
    projectId: string;
    projectTitle: string;
    userId?: string;
    userName: string;
    roleProposed: string;
    statement: string;
  }): Promise<ContributorApplication> => {
    const res = await fetch(`${API_BASE_URL}/contributors/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to submit application");
    }
    return res.json();
  },
  updateStatus: async (id: string, status: "APPROVED" | "REJECTED"): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/contributors/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update application status");
    }
    return res.json();
  },
  delete: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/contributors/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete application");
    }
    return res.json();
  },
};

export const documentsApi = {
  getCategories: async (): Promise<DocumentCategory[]> => {
    const res = await fetch(`${API_BASE_URL}/documents/categories`);
    if (!res.ok) throw new Error("Failed to fetch document categories");
    return res.json();
  },
  createCategory: async (name: string): Promise<DocumentCategory> => {
    const res = await fetch(`${API_BASE_URL}/documents/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create category");
    }
    return res.json();
  },
  deleteCategory: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/documents/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete category");
    }
    return res.json();
  },
  getAll: async (): Promise<DocumentRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/documents`);
    if (!res.ok) throw new Error("Failed to fetch documents");
    return res.json();
  },
  create: async (data: {
    title: string;
    projectId?: string;
    projectTitle?: string;
    category?: string;
    fileUrl?: string;
  }): Promise<DocumentRecord> => {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create document");
    }
    return res.json();
  },
  delete: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete document");
    }
    return res.json();
  },
};

export const certificatesApi = {
  getAll: async (): Promise<CertificateRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/certificates/all`);
    if (!res.ok) throw new Error("Failed to fetch certificates");
    return res.json();
  },
  issue: async (data: {
    recipientName: string;
    recipientEid: string;
    projectName: string;
    contributionRole: string;
  }): Promise<CertificateRecord> => {
    const res = await fetch(`${API_BASE_URL}/certificates/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to issue certificate");
    }
    return res.json();
  },
  delete: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/certificates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete certificate");
    }
    return res.json();
  },
};

export const votingApi = {
  getPolls: async (): Promise<VotingPoll[]> => {
    const res = await fetch(`${API_BASE_URL}/voting/polls`);
    if (!res.ok) throw new Error("Failed to fetch polls");
    return res.json();
  },
  getPollById: async (id: string): Promise<VotingPoll> => {
    const res = await fetch(`${API_BASE_URL}/voting/polls/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to fetch poll");
    return res.json();
  },
  createPoll: async (data: any): Promise<VotingPoll> => {
    const res = await fetch(`${API_BASE_URL}/voting/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create poll");
    }
    return res.json();
  },
  vote: async (
    pollId: string,
    data: { userId?: string; optionId: string; isAnonymous?: boolean; questionId?: string }
  ): Promise<VotingPoll> => {
    const res = await fetch(`${API_BASE_URL}/voting/polls/${encodeURIComponent(pollId)}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to submit vote");
    }
    return res.json();
  },
  deletePoll: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/voting/polls/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete poll");
    }
    return res.json();
  },
  getFeedbackForms: async (): Promise<FeedbackForm[]> => {
    const res = await fetch(`${API_BASE_URL}/voting/feedback/forms`);
    if (!res.ok) throw new Error("Failed to fetch feedback forms");
    return res.json();
  },
  getFeedbackFormById: async (id: string): Promise<FeedbackForm> => {
    const res = await fetch(`${API_BASE_URL}/voting/feedback/forms/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to fetch feedback form");
    return res.json();
  },
  createFeedbackForm: async (data: any): Promise<FeedbackForm> => {
    const res = await fetch(`${API_BASE_URL}/voting/feedback/forms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create feedback form");
    }
    return res.json();
  },
  submitFeedback: async (
    formId: string,
    data: { userId?: string; userName?: string; isAnonymous?: boolean; answers: any }
  ): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/voting/feedback/${encodeURIComponent(formId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to submit feedback response");
    }
    return res.json();
  },
  deleteFeedbackForm: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/voting/feedback/forms/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete feedback form");
    }
    return res.json();
  },
};

export const ideationsApi = {
  getAll: async (): Promise<IdeationRecord[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/ideation`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        ...d,
        id: d.id || d._id,
        _id: d._id || d.id,
        createdAt: d.createdAt || d.createdAtDate,
      }));
    } catch (e) {
      console.error("Failed to fetch suggestions:", e);
      return [];
    }
  },
  getCategories: async (): Promise<ProposalCategory[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/ideation/categories`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("Failed to fetch proposal categories:", e);
      return [];
    }
  },
  createCategory: async (name: string): Promise<ProposalCategory> => {
    const res = await fetch(`${API_BASE_URL}/ideation/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create category");
    }
    return res.json();
  },
  deleteCategory: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/ideation/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete category");
    }
    return res.json();
  },
  create: async (data: {
    problemStatement: string;
    proposedSolution: string;
    raisedBy: string;
    category: string;
  }): Promise<IdeationRecord> => {
    const res = await fetch(`${API_BASE_URL}/ideation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to record idea");
    }
    const item = await res.json();
    return {
      ...item,
      id: item.id || item._id,
      _id: item._id || item.id,
      createdAt: item.createdAt || item.createdAtDate,
    };
  },
  upvote: async (id: string): Promise<IdeationRecord> => {
    const res = await fetch(`${API_BASE_URL}/ideation/${encodeURIComponent(id)}/upvote`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to upvote suggestion");
    }
    const item = await res.json();
    return {
      ...item,
      id: item.id || item._id,
      _id: item._id || item.id,
      createdAt: item.createdAt || item.createdAtDate,
    };
  },
  delete: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/ideation/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete suggestion");
    }
    return res.json();
  },
};

export const attendanceApi = {
  getAll: async (filters?: {
    subject?: string;
    batchId?: string;
    userId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AttendanceRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.subject) params.set("subject", filters.subject);
    if (filters?.batchId) params.set("batchId", filters.batchId);
    if (filters?.userId) params.set("userId", filters.userId);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/attendance/all${qs}`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((item: any) => ({
      ...item,
      id: item.id || item._id,
      _id: item._id || item.id,
    }));
  },

  getByUser: async (userId: string): Promise<AttendanceRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/attendance/user/${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((item: any) => ({
      ...item,
      id: item.id || item._id,
      _id: item._id || item.id,
    }));
  },

  getSession: async (subject: string, date: string, batchId?: string): Promise<AttendanceRecord[]> => {
    const params = new URLSearchParams({ subject, date });
    if (batchId) params.set("batchId", batchId);
    const res = await fetch(`${API_BASE_URL}/attendance/session?${params.toString()}`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((item: any) => ({
      ...item,
      id: item.id || item._id,
      _id: item._id || item.id,
    }));
  },

  getMemberSummary: async (userId: string): Promise<MemberAttendanceDashboard> => {
    const res = await fetch(`${API_BASE_URL}/attendance/member-summary/${encodeURIComponent(userId)}`);
    if (!res.ok) {
      throw new Error("Failed to load member attendance summary");
    }
    return res.json();
  },

  submitSession: async (data: {
    subjectId?: string;
    subjectName: string;
    batchId?: string;
    batchName?: string;
    date: string;
    timeSlot?: string;
    room?: string;
    markedByUserId: string;
    markedByName?: string;
    records: Array<{
      userId: string;
      userName: string;
      userEid?: string;
      status: "PRESENT" | "ABSENT";
      remarks?: string;
    }>;
  }): Promise<{
    success: boolean;
    message: string;
    count: number;
    records: AttendanceRecord[];
    updatedBalances?: Record<string, number>;
  }> => {
    const res = await fetch(`${API_BASE_URL}/attendance/session/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to submit attendance register");
    }
    return result;
  },

  mark: async (data: {
    userId: string;
    subject: string;
    date: string;
    status: "PRESENT" | "ABSENT";
    markedByUserId?: string;
  }): Promise<{ attendance: AttendanceRecord; sparkBalance: number; sparkDelta: number }> => {
    const res = await fetch(`${API_BASE_URL}/attendance/mark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to mark attendance");
    }
    const result = await res.json();
    return {
      ...result,
      attendance: {
        ...result.attendance,
        id: result.attendance.id || result.attendance._id,
        _id: result.attendance._id || result.attendance.id,
      },
    };
  },

  delete: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/attendance/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete attendance record");
    }
    return res.json();
  },

  getDefaulters: async (
    subjectId?: string
  ): Promise<
    Array<{
      userId: string;
      userName: string;
      userEid: string;
      department?: string;
      subjectId: string;
      subjectName: string;
      subjectCode?: string;
      batchName?: string;
      totalSessions: number;
      attendedSessions: number;
      missedSessions: number;
      percentage: number;
      minRequiredPercentage: number;
      isShortage: boolean;
    }>
  > => {
    const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
    const res = await fetch(`${API_BASE_URL}/attendance/defaulters${qs}`);
    if (!res.ok) return [];
    return res.json();
  },
};

export const bondsApi = {
  getAll: async (): Promise<BondRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/bonds/all`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((b: any) => ({
      ...b,
      id: b.id || b._id,
      _id: b._id || b.id,
    }));
  },

  getByUser: async (userId: string): Promise<BondRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/bonds/user/${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((b: any) => ({
      ...b,
      id: b.id || b._id,
      _id: b._id || b.id,
    }));
  },

  issue: async (data: {
    userId: string;
    userName: string;
    title: string;
    reason: string;
    penaltyObligation: string;
    subjectName?: string;
    subjectId?: string;
  }): Promise<BondRecord> => {
    const res = await fetch(`${API_BASE_URL}/bonds/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to issue bond");
    }
    const item = await res.json();
    return {
      ...item,
      id: item.id || item._id,
      _id: item._id || item.id,
    };
  },

  resolve: async (id: string): Promise<BondRecord> => {
    const res = await fetch(`${API_BASE_URL}/bonds/${encodeURIComponent(id)}/resolve`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to resolve bond");
    }
    return res.json();
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE_URL}/bonds/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete bond");
    }
    return res.json();
  },
};

export const fundsApi = {
  getSummary: async (): Promise<{
    fund: FundSummary;
    recentInflows: FundInflow[];
    recentExpenses: ExpenseReceipt[];
    pendingRequestsCount: number;
    totalRequestsCount: number;
  }> => {
    const res = await fetch(`${API_BASE_URL}/funds/summary`);
    if (!res.ok) throw new Error("Failed to load treasury summary");
    const data = await res.json();
    return {
      ...data,
      fund: {
        ...data.fund,
        totalBalance: data.fund.totalBalance ?? 0,
        totalInflow: data.fund.totalInflow ?? 0,
        totalDisbursed: data.fund.totalDisbursed ?? 0,
      },
      recentInflows: (data.recentInflows || []).map((item: any) => ({ ...item, id: item.id || item._id })),
      recentExpenses: (data.recentExpenses || []).map((item: any) => ({ ...item, id: item.id || item._id })),
    };
  },

  getInflows: async (): Promise<FundInflow[]> => {
    const res = await fetch(`${API_BASE_URL}/funds/inflows`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((item: any) => ({ ...item, id: item.id || item._id }));
  },

  deposit: async (data: {
    amount: number;
    source: string;
    depositedBy: string;
    depositedById?: string;
    notes?: string;
    date?: string;
  }): Promise<{ inflow: FundInflow; fund: FundSummary }> => {
    const res = await fetch(`${API_BASE_URL}/funds/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to add funds to treasury");
    }
    return res.json();
  },

  getRequests: async (userId?: string): Promise<FundRequest[]> => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await fetch(`${API_BASE_URL}/funds/requests${qs}`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((item: any) => ({ ...item, id: item.id || item._id }));
  },

  createRequest: async (data: {
    title: string;
    amount: number;
    reason: string;
    workProject: string;
    requestedBy: string;
    requestedById: string;
    userEid?: string;
    urgency?: string;
  }): Promise<FundRequest> => {
    const res = await fetch(`${API_BASE_URL}/funds/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to submit fund request");
    }
    const item = await res.json();
    return { ...item, id: item.id || item._id };
  },

  reviewRequest: async (
    id: string,
    data: { status: "APPROVED" | "REJECTED"; reviewedBy: string; reviewNotes?: string }
  ): Promise<FundRequest> => {
    const res = await fetch(`${API_BASE_URL}/funds/requests/${encodeURIComponent(id)}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update fund request");
    }
    return res.json();
  },

  disburseRequest: async (
    id: string,
    data: { disbursedBy: string; notes?: string }
  ): Promise<{ request: FundRequest; receipt: ExpenseReceipt; fund: FundSummary }> => {
    const res = await fetch(`${API_BASE_URL}/funds/requests/${encodeURIComponent(id)}/disburse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to disburse funds");
    }
    return res.json();
  },

  getExpenses: async (workProject?: string): Promise<ExpenseReceipt[]> => {
    const qs = workProject ? `?workProject=${encodeURIComponent(workProject)}` : "";
    const res = await fetch(`${API_BASE_URL}/funds/expenses${qs}`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map((item: any) => ({ ...item, id: item.id || item._id }));
  },

  createExpense: async (data: {
    title: string;
    amount: number;
    usedBy: string;
    usedById?: string;
    workProject: string;
    category?: string;
    date?: string;
    notes?: string;
    proofUrl?: string;
    approvedBy?: string;
  }): Promise<{ receipt: ExpenseReceipt; fund: FundSummary }> => {
    const res = await fetch(`${API_BASE_URL}/funds/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to log expense receipt");
    }
    return res.json();
  },
};

export const sparkApi = {
  async getHistory(userId: string): Promise<SparkTransaction[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/spark/${encodeURIComponent(userId)}`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.map((s: any) => ({
        id: s.id || s._id,
        userId: s.userId,
        change: Number(s.change || 0),
        balanceAfter: Number(s.balanceAfter || 0),
        reason: s.reason || "",
        timestamp: s.createdAt
          ? new Date(s.createdAt).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      }));
    } catch (e) {
      console.error("Failed to fetch spark history:", e);
      return [];
    }
  },
};
