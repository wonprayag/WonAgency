import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NoticeEntity } from '../database/schemas/index.js';

@Injectable()
export class NoticeService {
  constructor(@InjectModel(NoticeEntity.name) private noticeModel: Model<NoticeEntity>) {}

  async getNotices() {
    return this.noticeModel.find().sort({ publishedDate: -1 }).exec();
  }

  async publishNotice(data: {
    title: string;
    content: string;
    authorityName: string;
    authorityRole: string;
    virtualSignatureHash: string;
  }) {
    return this.noticeModel.create({
      ...data,
      publishedDate: new Date().toISOString().split('T')[0],
    });
  }
}
