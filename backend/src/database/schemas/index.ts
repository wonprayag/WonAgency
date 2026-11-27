import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// 1. users
@Schema({ timestamps: true })
export class UserEntity extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 'MEMBER', enum: ['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'LEAD'] })
  role: string;

  @Prop({ required: true, default: 0.0 })
  sparkBalance: number;

  @Prop({ required: true, unique: true })
  eidNumber: string;

  @Prop({ default: 'Engineering & Design' })
  department: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({
    type: [String],
    default: ['dashboard', 'attendance', 'projects', 'members', 'voting', 'ideation', 'funds'],
  })
  allowedModules: string[];
}
export const UserSchema = SchemaFactory.createForClass(UserEntity);

// 1.1 subjects & batches
@Schema({ timestamps: true })
export class SubjectEntity extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 'Engineering & Design' })
  department: string;

  @Prop({ default: 'Lead Mentor' })
  mentor: string;

  @Prop({ default: '' })
  mentorId: string;

  @Prop({ type: [String], default: [] })
  coMentors: string[];

  // Enrolled members list: [{ userId, name, email, eidNumber, department, enrolledAt }]
  @Prop({ type: [Object], default: [] })
  enrolledMembers: Array<{
    userId: string;
    name: string;
    email?: string;
    eidNumber?: string;
    department?: string;
    enrolledAt?: string;
  }>;

  @Prop({ default: false })
  hasBatches: boolean;

  // Batches / Groups: [{ id, name, description, mentorId, mentorName, schedule, memberIds, status }]
  @Prop({ type: [Object], default: [] })
  batches: Array<{
    id: string;
    name: string;
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
  }>;

  @Prop({ default: '' })
  timeSlot: string;

  @Prop({ default: '' })
  startTime: string;

  @Prop({ default: '' })
  endTime: string;

  @Prop({ default: '' })
  room: string;

  @Prop({ default: '' })
  days: string;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  status: string;

  @Prop({ default: 75 })
  minAttendancePercentage: number;
}
export const SubjectSchema = SchemaFactory.createForClass(SubjectEntity);

// 2. attendance
@Schema({ timestamps: true })
export class AttendanceEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ default: '' })
  userEid: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ default: '' })
  subjectId: string;

  @Prop({ default: '' })
  batchId: string;

  @Prop({ default: '' })
  batchName: string;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ default: '' })
  timeSlot: string;

  @Prop({ required: true, enum: ['PRESENT', 'ABSENT'] })
  status: string;

  @Prop({ required: true })
  sparkDelta: number; // +0.25 for PRESENT, -1.00 for ABSENT

  @Prop({ default: '' })
  markedByUserId: string;

  @Prop({ default: '' })
  markedByName: string;

  @Prop({ default: '' })
  remarks: string;
}
export const AttendanceSchema = SchemaFactory.createForClass(AttendanceEntity);
AttendanceSchema.index({ userId: 1, subject: 1, date: 1, batchId: 1 }, { unique: true });

// 3. bonds
@Schema({ timestamps: true })
export class BondEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  penaltyObligation: string; // Non-monetary fine / accountability mechanism

  @Prop({ default: '' })
  subjectName: string;

  @Prop({ default: '' })
  subjectId: string;

  @Prop({ required: true, default: 'ACTIVE', enum: ['ACTIVE', 'COMPLETED', 'RESOLVED'] })
  status: string;

  @Prop({ required: true })
  issuedDate: string;
}
export const BondSchema = SchemaFactory.createForClass(BondEntity);

// 4. sparks
@Schema({ timestamps: true })
export class SparkEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  change: number; // +0.25 or -1.00

  @Prop({ required: true })
  balanceAfter: number;

  @Prop({ required: true })
  reason: string;

  @Prop()
  referenceAttendanceId?: Types.ObjectId;
}
export const SparkSchema = SchemaFactory.createForClass(SparkEntity);

// 5. reader
@Schema({ timestamps: true })
export class ReaderEntity extends Document {
  @Prop({ required: true })
  readerNodeId: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  status: string; // ONLINE, BUSY, OFFLINE

  @Prop()
  lastScannedEid?: string;
}
export const ReaderSchema = SchemaFactory.createForClass(ReaderEntity);

// 6. timetables
@Schema({ timestamps: true })
export class TimetableEntity extends Document {
  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  dayOfWeek: string;

  @Prop({ required: true })
  timeSlot: string;

  @Prop({ required: true })
  room: string;

  @Prop({ required: true })
  mentor: string;
}
export const TimetableSchema = SchemaFactory.createForClass(TimetableEntity);

// 7. notices
@Schema({ timestamps: true })
export class NoticeEntity extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  publishedDate: string;

  @Prop({ required: true })
  authorityName: string;

  @Prop({ required: true })
  authorityRole: string;

  @Prop({ required: true })
  virtualSignatureHash: string; // Cryptographic virtual signature
}
export const NoticeSchema = SchemaFactory.createForClass(NoticeEntity);

// 8. projects
@Schema({ timestamps: true })
export class ProjectEntity extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ['Core Development', 'Client Project', 'Bounty / Sprint', 'R&D'] })
  contributionType: string;

  @Prop({ type: Object, required: true })
  companyDetails: {
    clientName: string;
    domain: string;
    contactEmail: string;
  };

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, default: 'ACTIVE', enum: ['PLANNING', 'ACTIVE', 'COMPLETED'] })
  status: string;

  @Prop({ required: true, default: 5 })
  contributorSlots: number;

  @Prop({ required: true, default: 0 })
  filledSlots: number;
}
export const ProjectSchema = SchemaFactory.createForClass(ProjectEntity);

// 9. contributors
@Schema({ timestamps: true })
export class ContributorEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ProjectEntity', required: false })
  projectId?: Types.ObjectId;

  @Prop({ required: true })
  projectTitle: string;

  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  roleProposed: string;

  @Prop({ required: true })
  statement: string;

  @Prop({ required: true, default: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @Prop({ required: true })
  submittedAt: string;
}
export const ContributorSchema = SchemaFactory.createForClass(ContributorEntity);

// 10. documents
@Schema({ timestamps: true })
export class DocumentEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ProjectEntity', required: false })
  projectId?: Types.ObjectId;

  @Prop({ required: true })
  projectTitle: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ required: true })
  uploadedAt: string;

  @Prop({ required: false })
  createdById?: string;

  @Prop({ required: false })
  createdByEmail?: string;

  @Prop({ type: [String], default: [] })
  sharedWithEmails?: string[];

  @Prop({ required: false, default: 'PROJECT' })
  docType?: string;

  @Prop({ required: false })
  payloadJson?: string;
}
export const DocumentSchema = SchemaFactory.createForClass(DocumentEntity);

// 10b. document categories
@Schema({ timestamps: true })
export class DocumentCategoryEntity extends Document {
  @Prop({ required: true, unique: true })
  name: string;
}
export const DocumentCategorySchema = SchemaFactory.createForClass(DocumentCategoryEntity);

// 11. certificates
@Schema({ timestamps: true })
export class CertificateEntity extends Document {
  @Prop({ required: true })
  recipientName: string;

  @Prop({ required: true })
  recipientEid: string;

  @Prop({ required: true })
  projectName: string;

  @Prop({ required: true })
  contributionRole: string;

  @Prop({ required: true })
  issueDate: string;

  @Prop({ required: true, unique: true })
  certificateNumber: string;

  @Prop({ required: true })
  qrVerificationUrl: string;
}
export const CertificateSchema = SchemaFactory.createForClass(CertificateEntity);

// 12. members
@Schema({ timestamps: true })
export class MemberEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  eidNumber: string;

  @Prop({ type: Object, default: {} })
  links: {
    github?: string;
    portfolio?: string;
    linkedin?: string;
  };
}
export const MemberSchema = SchemaFactory.createForClass(MemberEntity);

// 13. eid_cards
@Schema({ timestamps: true })
export class EidCardEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  eidNumber: string;

  @Prop({ required: true, default: 'ACTIVE' })
  status: string;

  @Prop({ required: true })
  issuedDate: string;

  @Prop({ required: true })
  expiryDate: string;

  @Prop()
  qrPayload: string;
}
export const EidCardSchema = SchemaFactory.createForClass(EidCardEntity);

// 14. member_timelines
@Schema({ timestamps: true })
export class MemberTimelineEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['JOINED', 'PROMOTED', 'CONTRIBUTION_MILESTONE', 'LEFT'] })
  event: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  details: string;
}
export const MemberTimelineSchema = SchemaFactory.createForClass(MemberTimelineEntity);

// 15. votes
@Schema({ timestamps: true })
export class VoteEntity extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, default: 'Governance' })
  category: string;

  @Prop({ required: true, default: 'ALL', enum: ['ALL', 'TEAMS', 'USERS', 'ANONYMOUS'] })
  targetType: string;

  @Prop({ type: [String], default: [] })
  targetTeams: string[];

  @Prop({ type: [String], default: [] })
  targetUserIds: string[];

  @Prop({ required: true, default: true })
  isAnonymousAllowed: boolean;

  @Prop({ type: [Object], default: [] })
  options: { id: string; text: string; votesCount: number }[];

  @Prop({ type: [Object], default: [] })
  questions: {
    id: string;
    questionText: string;
    options: { id: string; text: string; votesCount: number }[];
  }[];

  @Prop({ type: [Object], default: [] })
  userVotes: { userId?: string; questionId?: string; optionId: string; isAnonymous?: boolean }[];

  @Prop({ required: true, default: () => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] })
  expiresAt: string;

  @Prop({ default: 'Studio Administration' })
  createdBy: string;
}
export const VoteSchema = SchemaFactory.createForClass(VoteEntity);

// 16. feedback
@Schema({ timestamps: true })
export class FeedbackEntity extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, default: 'Operational Feedback' })
  targetCategory: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, default: 'ALL', enum: ['ALL', 'TEAMS', 'USERS', 'ANONYMOUS'] })
  targetType: string;

  @Prop({ type: [String], default: [] })
  targetTeams: string[];

  @Prop({ type: [String], default: [] })
  targetUserIds: string[];

  @Prop({ required: true, default: true })
  isAnonymousAllowed: boolean;

  @Prop({ type: [Object], required: true })
  questions: { id: string; questionText: string; type: string; options?: string[]; required?: boolean }[];

  @Prop({ type: [Object], default: [] })
  responses: { userId?: string; userName?: string; isAnonymous?: boolean; answers: any; submittedAt: string }[];

  @Prop({ default: 'Studio Administration' })
  createdBy: string;
}
export const FeedbackSchema = SchemaFactory.createForClass(FeedbackEntity);

// 17. ideations & proposal categories
@Schema({ timestamps: true })
export class ProposalCategoryEntity extends Document {
  @Prop({ required: true, unique: true })
  name: string;
}
export const ProposalCategorySchema = SchemaFactory.createForClass(ProposalCategoryEntity);

@Schema({ timestamps: true })
export class IdeationEntity extends Document {
  @Prop({ required: true })
  problemStatement: string;

  @Prop({ required: true })
  proposedSolution: string;

  @Prop({ required: true })
  raisedBy: string;

  @Prop({ required: true, default: 0 })
  upvotes: number;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, default: 'OPEN', enum: ['OPEN', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED'] })
  status: string;

  @Prop({ required: true, default: () => new Date().toISOString().split('T')[0] })
  createdAtDate: string;
}
export const IdeationSchema = SchemaFactory.createForClass(IdeationEntity);

// 18. funds
@Schema({ timestamps: true })
export class FundEntity extends Document {
  @Prop({ required: true, default: 0 })
  totalBalance: number;

  @Prop({ required: true, default: 0 })
  totalInflow: number;

  @Prop({ required: true, default: 0 })
  totalDisbursed: number;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  @Prop({ default: 0 })
  targetRaiseAmount: number;

  @Prop({ default: 0 })
  currentRaisedAmount: number;

  @Prop({ default: 0 })
  totalInvestedAmount: number;
}
export const FundSchema = SchemaFactory.createForClass(FundEntity);

// 19. receipts (expense utilization vouchers)
@Schema({ timestamps: true })
export class ReceiptEntity extends Document {
  @Prop({ required: true, unique: true })
  receiptRef: string;

  @Prop({ required: true, default: 'Agency Expenditure' })
  title: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  usedBy: string; // used by whom

  @Prop({ default: '' })
  usedById: string;

  @Prop({ required: true, default: 'General Operations' })
  workProject: string; // which work / project

  @Prop({ required: true, default: 'General Operations' })
  category: string;

  @Prop({ required: true })
  date: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ default: '' })
  proofUrl: string;

  @Prop({ default: '' })
  approvedBy: string;

  @Prop({ default: '' })
  fundRequestId: string;

  @Prop({ default: '' })
  investor: string;
}
export const ReceiptSchema = SchemaFactory.createForClass(ReceiptEntity);

// 19b. fund inflows (capital added into treasury)
@Schema({ timestamps: true })
export class FundInflowEntity extends Document {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  source: string; // e.g. Client Payment, Founder Inflow, Grant

  @Prop({ required: true })
  depositedBy: string;

  @Prop({ default: '' })
  depositedById: string;

  @Prop({ required: true })
  date: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ required: true, unique: true })
  receiptRef: string;
}
export const FundInflowSchema = SchemaFactory.createForClass(FundInflowEntity);

// 19c. fund requests (money needed from treasury raised by members)
@Schema({ timestamps: true })
export class FundRequestEntity extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  reason: string; // why they need the money

  @Prop({ required: true })
  workProject: string; // which work / project

  @Prop({ required: true })
  requestedBy: string;

  @Prop({ default: '' })
  requestedById: string;

  @Prop({ default: 'WON-MB-0000' })
  userEid: string;

  @Prop({ default: 'NORMAL', enum: ['NORMAL', 'URGENT'] })
  urgency: string;

  @Prop({ default: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED', 'DISBURSED'] })
  status: string;

  @Prop({ default: '' })
  reviewedBy: string;

  @Prop({ default: '' })
  reviewNotes: string;

  @Prop({ default: '' })
  disbursedDate: string;

  @Prop({ default: '' })
  receiptRef: string;
}
export const FundRequestSchema = SchemaFactory.createForClass(FundRequestEntity);

// 20. teams
@Schema({ timestamps: true })
export class TeamEntity extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 'Team Lead' })
  leadName: string;

  @Prop({ type: [String], default: [] })
  memberIds: string[];

  @Prop({ default: '#087FC4' })
  color: string;
}
export const TeamSchema = SchemaFactory.createForClass(TeamEntity);

