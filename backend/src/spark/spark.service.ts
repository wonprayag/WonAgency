import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SparkEntity, UserEntity } from '../database/schemas/index.js';

@Injectable()
export class SparkService {
  constructor(
    @InjectModel(SparkEntity.name) private sparkModel: Model<SparkEntity>,
    @InjectModel(UserEntity.name) private userModel: Model<UserEntity>,
  ) {}

  /**
   * TRD Section 5: Spark System Technical Logic
   * PRESENT: +0.25 Spark
   * ABSENT:  -1.00 Spark
   */
  getDelta(status: 'PRESENT' | 'ABSENT'): number {
    if (status === 'PRESENT') {
      return 0.25;
    }
    if (status === 'ABSENT') {
      return -1.0;
    }
    throw new BadRequestException(`Invalid attendance status: ${status}`);
  }

  async applyAttendanceSpark(
    userId: string | Types.ObjectId,
    status: 'PRESENT' | 'ABSENT',
    subject: string,
    attendanceId?: Types.ObjectId,
  ): Promise<{ balanceAfter: number; change: number }> {
    const delta = this.getDelta(status);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const updatedBalance = Number((user.sparkBalance + delta).toFixed(2));
    user.sparkBalance = updatedBalance;
    await user.save();

    await this.sparkModel.create({
      userId: new Types.ObjectId(userId),
      change: delta,
      balanceAfter: updatedBalance,
      reason: `${status === 'PRESENT' ? 'Attended' : 'Absent from'} ${subject}`,
      referenceAttendanceId: attendanceId,
    });

    return { balanceAfter: updatedBalance, change: delta };
  }

  async reconcileAttendanceSpark(
    userId: string | Types.ObjectId,
    oldStatus: 'PRESENT' | 'ABSENT',
    newStatus: 'PRESENT' | 'ABSENT',
    subject: string,
    attendanceId?: Types.ObjectId,
  ): Promise<{ balanceAfter: number; change: number }> {
    if (oldStatus === newStatus) {
      const user = await this.userModel.findById(userId);
      return { balanceAfter: user?.sparkBalance || 0, change: 0 };
    }

    const oldDelta = this.getDelta(oldStatus);
    const newDelta = this.getDelta(newStatus);
    const netChange = Number((newDelta - oldDelta).toFixed(2));

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const updatedBalance = Number(((user.sparkBalance || 0) + netChange).toFixed(2));
    user.sparkBalance = updatedBalance;
    await user.save();

    await this.sparkModel.create({
      userId: new Types.ObjectId(userId),
      change: netChange,
      balanceAfter: updatedBalance,
      reason: `Attendance reconciled: Changed from ${oldStatus} to ${newStatus} in ${subject}`,
      referenceAttendanceId: attendanceId,
    });

    return { balanceAfter: updatedBalance, change: netChange };
  }

  async getUserSparkHistory(userId: string | Types.ObjectId) {
    return this.sparkModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }
}
