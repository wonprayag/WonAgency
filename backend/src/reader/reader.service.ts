import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReaderEntity } from '../database/schemas/index.js';

@Injectable()
export class ReaderService {
  constructor(@InjectModel(ReaderEntity.name) private readerModel: Model<ReaderEntity>) {}

  async listNodes() {
    return this.readerModel.find().exec();
  }

  async registerScan(nodeId: string, eid: string) {
    return this.readerModel.findOneAndUpdate(
      { readerNodeId: nodeId },
      { lastScannedEid: eid, status: 'ONLINE' },
      { new: true, upsert: true },
    );
  }
}
