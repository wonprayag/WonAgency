import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BondEntity } from '../database/schemas/index.js';

@Injectable()
export class BondService {
  constructor(
    @InjectModel(BondEntity.name) private bondModel: Model<BondEntity>,
  ) {}

  async issueBond(data: {
    userId: string;
    userName: string;
    title: string;
    reason: string;
    penaltyObligation: string;
    subjectName?: string;
    subjectId?: string;
  }) {
    return this.bondModel.create({
      userId: new Types.ObjectId(data.userId),
      userName: data.userName,
      title: data.title,
      reason: data.reason,
      penaltyObligation: data.penaltyObligation,
      subjectName: data.subjectName || '',
      subjectId: data.subjectId || '',
      status: 'ACTIVE',
      issuedDate: new Date().toISOString().split('T')[0],
    });
  }

  async resolveBond(id: string) {
    return this.bondModel.findByIdAndUpdate(id, { status: 'RESOLVED' }, { new: true }).exec();
  }

  async deleteBond(id: string) {
    await this.bondModel.findByIdAndDelete(id).exec();
    return { success: true };
  }

  async getBondsByUser(userId: string) {
    return this.bondModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async getAllBonds() {
    return this.bondModel.find().sort({ createdAt: -1 }).exec();
  }
}
