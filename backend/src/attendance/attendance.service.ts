import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AttendanceEntity, UserEntity, SubjectEntity } from '../database/schemas/index.js';
import { SparkService } from '../spark/spark.service.js';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceEntity.name) private attendanceModel: Model<AttendanceEntity>,
    @InjectModel(UserEntity.name) private userModel: Model<UserEntity>,
    @InjectModel(SubjectEntity.name) private subjectModel: Model<SubjectEntity>,
    private sparkService: SparkService,
  ) {}

  /**
   * Helper to verify if caller is an authorized mentor or admin
   */
  async verifyMentorOrAdmin(callerUserId: string, subject: SubjectEntity, batchId?: string): Promise<UserEntity> {
    const caller = await this.userModel.findById(callerUserId);
    if (!caller) {
      throw new NotFoundException('Caller user account not found');
    }

    if (caller.role === 'SUPER_ADMIN' || caller.role === 'ADMIN') {
      return caller;
    }

    // Check mentor match
    const isSubjectMentor =
      (subject.mentorId && subject.mentorId === callerUserId) ||
      (subject.mentor && subject.mentor.trim().toLowerCase() === caller.name.trim().toLowerCase()) ||
      (subject.coMentors && subject.coMentors.includes(caller.name));

    if (isSubjectMentor) {
      return caller;
    }

    if (batchId && subject.hasBatches && subject.batches) {
      const batch = subject.batches.find((b) => b.id === batchId);
      if (batch) {
        const isBatchMentor =
          (batch.mentorId && batch.mentorId === callerUserId) ||
          (batch.mentorName && batch.mentorName.trim().toLowerCase() === caller.name.trim().toLowerCase());
        if (isBatchMentor) {
          return caller;
        }
      }
    }

    throw new ForbiddenException(
      'Unauthorized: Attendance can only be recorded by an assigned mentor or system administrator.',
    );
  }

  /**
   * Collegiate Multi-Student Session Attendance Submission
   */
  async submitSessionAttendance(dto: {
    subjectId?: string;
    subjectName: string;
    batchId?: string;
    batchName?: string;
    date: string; // YYYY-MM-DD
    timeSlot?: string;
    room?: string;
    markedByUserId: string;
    markedByName?: string;
    records: Array<{
      userId: string;
      userName: string;
      userEid?: string;
      status: 'PRESENT' | 'ABSENT';
      remarks?: string;
    }>;
  }) {
    if (!dto.subjectName || !dto.date) {
      throw new BadRequestException('Subject name and session date are required');
    }
    if (!dto.records || dto.records.length === 0) {
      throw new BadRequestException('No student records provided for attendance');
    }

    // Look up subject
    let subject: SubjectEntity | null = null;
    if (dto.subjectId) {
      subject = await this.subjectModel.findById(dto.subjectId);
    }
    if (!subject) {
      subject = await this.subjectModel.findOne({ name: dto.subjectName });
    }
    if (!subject) {
      throw new NotFoundException(`Subject "${dto.subjectName}" not found`);
    }

    // Verify caller permissions
    const caller = await this.verifyMentorOrAdmin(dto.markedByUserId, subject, dto.batchId);
    const markerName = dto.markedByName || caller.name;

    const savedRecords: AttendanceEntity[] = [];
    const updatedBalances: Record<string, number> = {};
    const batchIdVal = dto.batchId || '';
    const batchNameVal = dto.batchName || '';

    for (const item of dto.records) {
      if (!item.userId) continue;

      const user = await this.userModel.findById(item.userId);
      if (!user) continue;

      // Check if attendance record already exists for this student + subject + date + batch
      const existing = await this.attendanceModel.findOne({
        userId: new Types.ObjectId(item.userId),
        subject: subject.name,
        date: dto.date,
        batchId: batchIdVal,
      });

      if (existing) {
        // Record exists: check if status changed
        if (existing.status !== item.status) {
          // Reconcile Spark ledger atomically
          const sparkRes = await this.sparkService.reconcileAttendanceSpark(
            item.userId,
            existing.status as 'PRESENT' | 'ABSENT',
            item.status,
            subject.name,
            existing._id as Types.ObjectId,
          );
          updatedBalances[item.userId] = sparkRes.balanceAfter;

          existing.status = item.status;
          existing.sparkDelta = this.sparkService.getDelta(item.status);
          existing.markedByUserId = caller._id.toString();
          existing.markedByName = markerName;
          if (item.remarks) existing.remarks = item.remarks;
          await existing.save();
          savedRecords.push(existing);
        } else {
          // Status unchanged: zero duplicate spark adjustments!
          if (item.remarks) {
            existing.remarks = item.remarks;
            await existing.save();
          }
          savedRecords.push(existing);
        }
      } else {
        // Create new attendance record
        const delta = this.sparkService.getDelta(item.status);
        const newRecord = await this.attendanceModel.create({
          userId: new Types.ObjectId(item.userId),
          userName: item.userName || user.name,
          userEid: item.userEid || user.eidNumber || '',
          subject: subject.name,
          subjectId: subject._id.toString(),
          batchId: batchIdVal,
          batchName: batchNameVal,
          date: dto.date,
          timeSlot: dto.timeSlot || subject.timeSlot || '',
          status: item.status,
          sparkDelta: delta,
          markedByUserId: caller._id.toString(),
          markedByName: markerName,
          remarks: item.remarks || '',
        });

        // Apply Spark reward/deduction
        const sparkRes = await this.sparkService.applyAttendanceSpark(
          item.userId,
          item.status,
          subject.name,
          newRecord._id as Types.ObjectId,
        );
        updatedBalances[item.userId] = sparkRes.balanceAfter;

        savedRecords.push(newRecord);
      }
    }

    return {
      success: true,
      message: `Successfully recorded attendance for ${savedRecords.length} students in "${subject.name}"`,
      subject: subject.name,
      batch: batchNameVal,
      date: dto.date,
      count: savedRecords.length,
      records: savedRecords,
      updatedBalances,
    };
  }

  /**
   * Get attendance records for a specific session (subject + date + optional batch)
   */
  async getSessionAttendance(subjectName: string, date: string, batchId?: string) {
    const filter: any = {
      subject: subjectName,
      date,
    };
    if (batchId) {
      filter.batchId = batchId;
    }
    return this.attendanceModel.find(filter).exec();
  }

  /**
   * Legacy single mark endpoint with authorization check
   */
  async markAttendance(dto: {
    userId: string;
    subject: string;
    date: string;
    status: 'PRESENT' | 'ABSENT';
    markedByUserId?: string;
  }) {
    const user = await this.userModel.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subject = await this.subjectModel.findOne({ name: dto.subject });
    if (!subject) {
      throw new NotFoundException(`Subject "${dto.subject}" not found`);
    }

    if (dto.markedByUserId) {
      await this.verifyMentorOrAdmin(dto.markedByUserId, subject);
    }

    // Duplicate check
    const existing = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(dto.userId),
      subject: dto.subject,
      date: dto.date,
    });

    if (existing) {
      if (existing.status !== dto.status) {
        const sparkRes = await this.sparkService.reconcileAttendanceSpark(
          dto.userId,
          existing.status as 'PRESENT' | 'ABSENT',
          dto.status,
          dto.subject,
          existing._id as Types.ObjectId,
        );
        existing.status = dto.status;
        existing.sparkDelta = this.sparkService.getDelta(dto.status);
        await existing.save();
        return {
          attendance: existing,
          sparkBalance: sparkRes.balanceAfter,
          sparkDelta: sparkRes.change,
        };
      }
      throw new ConflictException(
        `Attendance for ${dto.subject} on ${dto.date} already recorded.`,
      );
    }

    const delta = this.sparkService.getDelta(dto.status);

    const record = await this.attendanceModel.create({
      userId: new Types.ObjectId(dto.userId),
      userName: user.name,
      userEid: user.eidNumber || '',
      subject: dto.subject,
      subjectId: subject._id.toString(),
      date: dto.date,
      status: dto.status,
      sparkDelta: delta,
      markedByUserId: dto.markedByUserId || '',
    });

    // Update spark balance atomically
    const sparkResult = await this.sparkService.applyAttendanceSpark(
      dto.userId,
      dto.status,
      dto.subject,
      record._id as Types.ObjectId,
    );

    return {
      attendance: record,
      sparkBalance: sparkResult.balanceAfter,
      sparkDelta: sparkResult.change,
    };
  }

  /**
   * Member-facing personal attendance overview
   * Returns subject-by-subject percentage, total sessions, attended, missed, and standing
   */
  async getMemberAttendanceSummary(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const allSubjects = await this.subjectModel.find({ status: 'ACTIVE' }).exec();
    const enrolledSubjects = allSubjects.filter((s) =>
      s.enrolledMembers && s.enrolledMembers.some((em: any) => em.userId === userId || em.id === userId),
    );

    const summaries = [];

    for (const sub of enrolledSubjects) {
      // Check batch enrollment
      let assignedBatch: any = null;
      if (sub.hasBatches && sub.batches) {
        assignedBatch = sub.batches.find((b) => b.memberIds && b.memberIds.includes(userId));
      }

      // Query student's records for this subject
      const records = await this.attendanceModel
        .find({
          userId: new Types.ObjectId(userId),
          subject: sub.name,
        })
        .sort({ date: -1 })
        .exec();

      const total = records.length;
      const attended = records.filter((r) => r.status === 'PRESENT').length;
      const missed = records.filter((r) => r.status === 'ABSENT').length;
      const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 100;

      const minRequired = sub.minAttendancePercentage || 75;
      let standing: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
      if (percentage < minRequired - 10) {
        standing = 'CRITICAL';
      } else if (percentage < minRequired) {
        standing = 'WARNING';
      }

      summaries.push({
        subjectId: sub._id.toString(),
        subjectName: sub.name,
        subjectCode: sub.code,
        department: sub.department,
        mentor: assignedBatch?.mentorName || sub.mentor,
        timeSlot: assignedBatch?.schedule?.timeSlot || sub.timeSlot,
        days: assignedBatch?.schedule?.days || sub.days,
        room: assignedBatch?.schedule?.room || sub.room,
        hasBatches: sub.hasBatches,
        batchName: assignedBatch?.name || '',
        batchId: assignedBatch?.id || '',
        totalSessions: total,
        attendedSessions: attended,
        missedSessions: missed,
        percentage,
        minRequiredPercentage: minRequired,
        standing,
        records: records.map((r) => ({
          id: r._id.toString(),
          date: r.date,
          status: r.status,
          sparkDelta: r.sparkDelta,
          timeSlot: r.timeSlot,
          batchName: r.batchName,
          markedByName: r.markedByName,
          createdAt: (r as any).createdAt,
        })),
      });
    }

    return {
      userId,
      userName: user.name,
      eidNumber: user.eidNumber,
      sparkBalance: user.sparkBalance,
      subjects: summaries,
    };
  }

  async getAttendanceByUser(userId: string) {
    return this.attendanceModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ date: -1 })
      .exec();
  }

  async getAllAttendance(filters?: {
    subject?: string;
    batchId?: string;
    userId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query: any = {};
    if (filters?.subject) query.subject = filters.subject;
    if (filters?.batchId) query.batchId = filters.batchId;
    if (filters?.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters?.status && filters.status !== 'ALL') query.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = filters.dateFrom;
      if (filters.dateTo) query.date.$lte = filters.dateTo;
    }

    return this.attendanceModel.find(query).sort({ date: -1, createdAt: -1 }).limit(300).exec();
  }

  async deleteAttendance(id: string) {
    const record = await this.attendanceModel.findById(id);
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    if (record.userId) {
      const user = await this.userModel.findById(record.userId);
      if (user) {
        user.sparkBalance = Number(((user.sparkBalance || 0) - (record.sparkDelta || 0)).toFixed(2));
        await user.save();
      }
    }
    await this.attendanceModel.findByIdAndDelete(id);
    return { success: true, message: 'Attendance record deleted successfully' };
  }

  async getAttendanceDefaulters(subjectId?: string) {
    let subjects: any[] = [];
    if (subjectId) {
      const s = await this.subjectModel.findById(subjectId).exec();
      if (s) subjects = [s];
    } else {
      subjects = await this.subjectModel.find({ status: 'ACTIVE' }).exec();
    }

    const results: any[] = [];

    for (const sub of subjects) {
      if (!sub.enrolledMembers || sub.enrolledMembers.length === 0) continue;

      const minRequired = sub.minAttendancePercentage || 75;

      for (const member of sub.enrolledMembers) {
        const userId = member.userId || (member as any).id;
        if (!userId) continue;

        let query: any = { subject: sub.name };
        try {
          query.userId = new Types.ObjectId(userId);
        } catch {
          query.userEid = member.eidNumber;
        }

        const records = await this.attendanceModel.find(query).exec();
        const total = records.length;
        const attended = records.filter((r) => r.status === 'PRESENT').length;
        const missed = records.filter((r) => r.status === 'ABSENT').length;
        const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 100;

        let batchName = '';
        if (sub.hasBatches && sub.batches) {
          const b = sub.batches.find((b: any) => b.memberIds && b.memberIds.includes(userId));
          if (b) batchName = b.name;
        }

        results.push({
          userId: userId.toString(),
          userName: member.name,
          userEid: member.eidNumber || 'WON-MB-0000',
          department: member.department || sub.department || '',
          subjectId: sub._id.toString(),
          subjectName: sub.name,
          subjectCode: sub.code,
          batchName,
          totalSessions: total,
          attendedSessions: attended,
          missedSessions: missed,
          percentage,
          minRequiredPercentage: minRequired,
          isShortage: total > 0 ? percentage < minRequired : false,
        });
      }
    }

    return results;
  }
}
