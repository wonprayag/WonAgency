import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MemberEntity,
  EidCardEntity,
  MemberTimelineEntity,
  UserEntity,
} from '../database/schemas/index.js';
import QRCode from 'qrcode';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(MemberEntity.name) private memberModel: Model<MemberEntity>,
    @InjectModel(EidCardEntity.name) private eidCardModel: Model<EidCardEntity>,
    @InjectModel(MemberTimelineEntity.name) private timelineModel: Model<MemberTimelineEntity>,
    @InjectModel(UserEntity.name) private userModel: Model<UserEntity>,
  ) {}

  async getAll() {
    return this.memberModel.find().exec();
  }

  async getMemberProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    const member = await this.memberModel.findOne({ userId: new Types.ObjectId(userId) });
    const timeline = await this.timelineModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ date: 1 });
    const eidCard = await this.eidCardModel.findOne({ userId: new Types.ObjectId(userId) });

    return {
      user,
      member,
      timeline,
      eidCard,
    };
  }

  async generateEidPass(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const qrDataUrl = await QRCode.toDataURL(
      JSON.stringify({
        eid: user.eidNumber,
        name: user.name,
        role: user.role,
        issuer: 'WON-ORIGINALS',
      }),
    );

    return {
      eidNumber: user.eidNumber,
      name: user.name,
      role: user.role,
      department: user.department,
      qrDataUrl,
    };
  }
}
