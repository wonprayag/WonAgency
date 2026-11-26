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
  FundSummary
} from "./api";

export const superAdminUser: User = {
  id: "usr-sa-01",
  name: "Prayag Kaushik",
  email: "byprayag@gmail.com",
  role: "SUPER_ADMIN",
  sparkBalance: 999.00,
  eidNumber: "WON-SA-0001",
  department: "Executive Leadership / Super Admin"
};

export const adminUser: User | null = null as any;
export const leadUser: User | null = null as any;
export const initialUser: User = superAdminUser;

export const initialAttendance: AttendanceRecord[] = [];
export const initialBonds: BondRecord[] = [];
export const initialSparks: SparkTransaction[] = [];
export const initialTimetable: TimetableEntry[] = [];
export const initialNotices: NoticeRecord[] = [];
export const initialProjects: ProjectRecord[] = [];
export const initialApplications: ContributorApplication[] = [];
export const initialDocuments: DocumentRecord[] = [];
export const initialCertificates: CertificateRecord[] = [];
export const initialMembers: MemberRecord[] = [];
export const initialVotes: VotingPoll[] = [];
export const initialFeedback: FeedbackForm[] = [];
export const initialIdeations: IdeationRecord[] = [];
export const initialFunds: FundSummary = {
  totalBalance: 0,
  totalInflow: 0,
  totalDisbursed: 0,
  targetRaiseAmount: 0,
  currentRaisedAmount: 0,
  totalInvestedAmount: 0,
  currency: "INR",
};
