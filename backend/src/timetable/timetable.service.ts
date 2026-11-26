import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TimetableEntity, SubjectEntity } from '../database/schemas/index.js';

function normalizeDays(daysStr?: string): string[] {
  if (!daysStr) return [];
  const map: Record<string, string> = {
    mon: 'mon', monday: 'mon',
    tue: 'tue', tues: 'tue', tuesday: 'tue',
    wed: 'wed', wednesday: 'wed',
    thu: 'thu', thur: 'thu', thurs: 'thu', thursday: 'thu',
    fri: 'fri', friday: 'fri',
    sat: 'sat', saturday: 'sat',
    sun: 'sun', sunday: 'sun',
  };
  return daysStr
    .toLowerCase()
    .split(/[\s,]+/)
    .map((s) => map[s] || s)
    .filter(Boolean);
}

function daysOverlap(daysA?: string, daysB?: string): boolean {
  const a = normalizeDays(daysA);
  const b = normalizeDays(daysB);
  return a.some((d) => b.includes(d));
}

function timeSlotOverlap(slotA?: string, slotB?: string): boolean {
  if (!slotA || !slotB) return false;
  const cleanA = slotA.replace(/\s+/g, '').toLowerCase();
  const cleanB = slotB.replace(/\s+/g, '').toLowerCase();
  if (cleanA === cleanB) return true;
  return cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

@Injectable()
export class TimetableService {
  constructor(
    @InjectModel(TimetableEntity.name) private timetableModel: Model<TimetableEntity>,
    @InjectModel(SubjectEntity.name) private subjectModel: Model<SubjectEntity>,
  ) {}

  async getTimetable() {
    return this.timetableModel.find().exec();
  }

  async addEntry(data: Partial<TimetableEntity>) {
    return this.timetableModel.create(data);
  }

  async getAllSubjects() {
    return this.subjectModel.find().sort({ createdAt: -1 }).exec();
  }

  async getSubjectById(id: string) {
    const subject = await this.subjectModel.findById(id).exec();
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async createSubject(data: {
    name: string;
    code?: string;
    description?: string;
    department?: string;
    mentor?: string;
    mentorId?: string;
    coMentors?: string[];
    enrolledMembers?: any[];
    hasBatches?: boolean;
    batches?: any[];
    timeSlot?: string;
    startTime?: string;
    endTime?: string;
    room?: string;
    days?: string;
    status?: string;
    minAttendancePercentage?: number;
  }) {
    if (!data.name || !data.name.trim()) {
      throw new ConflictException('Subject name is required');
    }

    const trimmedName = data.name.trim();
    const existing = await this.subjectModel.findOne({ name: trimmedName });
    if (existing) {
      throw new ConflictException(`Subject "${trimmedName}" already exists`);
    }

    const code = data.code?.trim() || `SUB-${Math.floor(100 + Math.random() * 900)}`;

    const subject = await this.subjectModel.create({
      name: trimmedName,
      code,
      description: data.description || '',
      department: data.department || 'Engineering & Design',
      mentor: data.mentor || 'Lead Mentor',
      mentorId: data.mentorId || '',
      coMentors: data.coMentors || [],
      enrolledMembers: data.enrolledMembers || [],
      hasBatches: Boolean(data.hasBatches),
      batches: data.batches || [],
      timeSlot: data.timeSlot || '',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      room: data.room || '',
      days: data.days || '',
      status: data.status || 'ACTIVE',
      minAttendancePercentage: data.minAttendancePercentage || 75,
    });

    await this.syncTimetable(subject);

    return subject;
  }

  async updateSubject(id: string, data: any) {
    const subject = await this.subjectModel.findById(id);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (data.name && data.name.trim() !== subject.name) {
      const existing = await this.subjectModel.findOne({ name: data.name.trim() });
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException(`Subject "${data.name.trim()}" already exists`);
      }
      subject.name = data.name.trim();
    }

    if (data.code !== undefined) subject.code = data.code;
    if (data.description !== undefined) subject.description = data.description;
    if (data.department !== undefined) subject.department = data.department;
    if (data.mentor !== undefined) subject.mentor = data.mentor;
    if (data.mentorId !== undefined) subject.mentorId = data.mentorId;
    if (data.coMentors !== undefined) subject.coMentors = data.coMentors;
    if (data.enrolledMembers !== undefined) subject.enrolledMembers = data.enrolledMembers;
    if (data.hasBatches !== undefined) subject.hasBatches = Boolean(data.hasBatches);
    if (data.batches !== undefined) subject.batches = data.batches;
    if (data.timeSlot !== undefined) subject.timeSlot = data.timeSlot;
    if (data.startTime !== undefined) subject.startTime = data.startTime;
    if (data.endTime !== undefined) subject.endTime = data.endTime;
    if (data.room !== undefined) subject.room = data.room;
    if (data.days !== undefined) subject.days = data.days;
    if (data.status !== undefined) subject.status = data.status;
    if (data.minAttendancePercentage !== undefined)
      subject.minAttendancePercentage = data.minAttendancePercentage;

    await subject.save();
    await this.syncTimetable(subject);

    return subject;
  }

  async syncTimetable(subject: any) {
    try {
      // Remove previous entries for this subject
      await this.timetableModel.deleteMany({
        $or: [
          { subject: subject.name },
          { subject: { $regex: new RegExp(`^${escapeRegex(subject.name)}\\s*\\(`, 'i') } },
        ],
      });

      if (subject.hasBatches && subject.batches && subject.batches.length > 0) {
        for (const batch of subject.batches) {
          await this.timetableModel.create({
            subject: `${subject.name} (${batch.name})`,
            dayOfWeek: batch.schedule?.days || subject.days,
            timeSlot: batch.schedule?.timeSlot || subject.timeSlot,
            room: batch.schedule?.room || subject.room,
            mentor: batch.mentorName || subject.mentor,
          });
        }
      } else {
        await this.timetableModel.create({
          subject: subject.name,
          dayOfWeek: subject.days,
          timeSlot: subject.timeSlot,
          room: subject.room,
          mentor: subject.mentor,
        });
      }
    } catch (e) {
      console.warn('Timetable sync warning:', e);
    }
  }

  async deleteSubject(id: string) {
    const deleted = await this.subjectModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Subject not found');
    }
    // Remove from timetable
    await this.timetableModel.deleteMany({
      $or: [
        { subject: deleted.name },
        { subject: { $regex: new RegExp(`^${escapeRegex(deleted.name)}\\s*\\(`, 'i') } },
      ],
    });
    return { success: true, message: `Subject "${deleted.name}" removed` };
  }

  /**
   * Conflict Detection Engine
   * Validates potential collisions for mentors, batches, and enrolled members
   */
  async validateSchedule(candidate: {
    days: string;
    timeSlot: string;
    mentor?: string;
    mentorId?: string;
    batchName?: string;
    memberIds?: string[];
    excludeSubjectId?: string;
    excludeBatchId?: string;
  }): Promise<{ hasConflict: boolean; conflicts: string[] }> {
    const conflicts: string[] = [];
    const subjects = await this.subjectModel.find({ status: 'ACTIVE' }).exec();

    for (const sub of subjects) {
      if (candidate.excludeSubjectId && sub._id.toString() === candidate.excludeSubjectId) {
        // If checking a batch within the same subject, compare against other batches in this subject
        if (sub.hasBatches && sub.batches) {
          for (const b of sub.batches) {
            if (candidate.excludeBatchId && b.id === candidate.excludeBatchId) continue;
            const bDays = b.schedule?.days || sub.days;
            const bSlot = b.schedule?.timeSlot || sub.timeSlot;

            if (daysOverlap(candidate.days, bDays) && timeSlotOverlap(candidate.timeSlot, bSlot)) {
              // Check mentor conflict
              if (
                candidate.mentor &&
                b.mentorName &&
                candidate.mentor.trim().toLowerCase() === b.mentorName.trim().toLowerCase()
              ) {
                conflicts.push(
                  `Mentor "${candidate.mentor}" is already scheduled with batch "${b.name}" in "${sub.name}" at ${bSlot} on ${bDays}`,
                );
              }
              // Check member conflict
              if (candidate.memberIds && candidate.memberIds.length > 0 && b.memberIds) {
                const common = candidate.memberIds.filter((m) => b.memberIds.includes(m));
                if (common.length > 0) {
                  conflicts.push(
                    `${common.length} student(s) are double-booked between batch "${candidate.batchName || 'current'}" and batch "${b.name}" at ${bSlot} on ${bDays}`,
                  );
                }
              }
            }
          }
        }
        continue;
      }

      // Check against subject level or its batches
      if (sub.hasBatches && sub.batches && sub.batches.length > 0) {
        for (const b of sub.batches) {
          const bDays = b.schedule?.days || sub.days;
          const bSlot = b.schedule?.timeSlot || sub.timeSlot;

          if (daysOverlap(candidate.days, bDays) && timeSlotOverlap(candidate.timeSlot, bSlot)) {
            // Mentor conflict
            const bMentor = b.mentorName || sub.mentor;
            if (
              candidate.mentor &&
              bMentor &&
              candidate.mentor.trim().toLowerCase() === bMentor.trim().toLowerCase()
            ) {
              conflicts.push(
                `Mentor "${candidate.mentor}" is already teaching "${sub.name} (${b.name})" at ${bSlot} on ${bDays}`,
              );
            }
            // Member conflict
            if (candidate.memberIds && candidate.memberIds.length > 0 && b.memberIds) {
              const common = candidate.memberIds.filter((m) => b.memberIds.includes(m));
              if (common.length > 0) {
                conflicts.push(
                  `${common.length} student(s) are already scheduled in "${sub.name} (${b.name})" at ${bSlot} on ${bDays}`,
                );
              }
            }
          }
        }
      } else {
        // Single roster subject
        if (daysOverlap(candidate.days, sub.days) && timeSlotOverlap(candidate.timeSlot, sub.timeSlot)) {
          // Mentor conflict
          if (
            candidate.mentor &&
            sub.mentor &&
            candidate.mentor.trim().toLowerCase() === sub.mentor.trim().toLowerCase()
          ) {
            conflicts.push(
              `Mentor "${candidate.mentor}" is already teaching "${sub.name}" at ${sub.timeSlot} on ${sub.days}`,
            );
          }
          // Member conflict
          if (candidate.memberIds && candidate.memberIds.length > 0 && sub.enrolledMembers) {
            const subMemberIds = sub.enrolledMembers.map((em: any) => em.userId || em.id);
            const common = candidate.memberIds.filter((m) => subMemberIds.includes(m));
            if (common.length > 0) {
              conflicts.push(
                `${common.length} student(s) are already scheduled in "${sub.name}" at ${sub.timeSlot} on ${sub.days}`,
              );
            }
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }
}

function escapeRegex(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
