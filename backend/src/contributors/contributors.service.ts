import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContributorEntity, ProjectEntity } from '../database/schemas/index.js';

@Injectable()
export class ContributorsService {
  constructor(
    @InjectModel(ContributorEntity.name) private contributorModel: Model<ContributorEntity>,
    @InjectModel(ProjectEntity.name) private projectModel: Model<ProjectEntity>,
  ) {}

  async apply(data: {
    projectId: string;
    projectTitle: string;
    userId?: string;
    userName: string;
    roleProposed: string;
    statement: string;
  }) {
    const docData: any = {
      projectTitle: data.projectTitle,
      userName: data.userName,
      roleProposed: data.roleProposed,
      statement: data.statement,
      status: 'PENDING',
      submittedAt: new Date().toISOString().split('T')[0],
    };

    if (data.projectId && Types.ObjectId.isValid(data.projectId)) {
      docData.projectId = new Types.ObjectId(data.projectId);
    }
    if (data.userId && Types.ObjectId.isValid(data.userId)) {
      docData.userId = new Types.ObjectId(data.userId);
    }

    const created = await this.contributorModel.create(docData);
    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      projectId: data.projectId,
      projectTitle: created.projectTitle,
      userId: data.userId,
      userName: created.userName,
      roleProposed: created.roleProposed,
      statement: created.statement,
      status: created.status,
      submittedAt: created.submittedAt,
    };
  }

  async getAll() {
    const list = await this.contributorModel.find().sort({ createdAt: -1 }).exec();
    return list.map((c) => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      projectId: c.projectId ? c.projectId.toString() : '',
      projectTitle: c.projectTitle,
      userId: c.userId ? c.userId.toString() : '',
      userName: c.userName,
      roleProposed: c.roleProposed,
      statement: c.statement,
      status: c.status,
      submittedAt: c.submittedAt,
    }));
  }

  async getByUser(userId: string) {
    const query: any = {};
    if (Types.ObjectId.isValid(userId)) {
      query.userId = new Types.ObjectId(userId);
    } else {
      query.userName = userId;
    }
    const list = await this.contributorModel.find(query).sort({ createdAt: -1 }).exec();
    return list.map((c) => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      projectId: c.projectId ? c.projectId.toString() : '',
      projectTitle: c.projectTitle,
      userId: c.userId ? c.userId.toString() : '',
      userName: c.userName,
      roleProposed: c.roleProposed,
      statement: c.statement,
      status: c.status,
      submittedAt: c.submittedAt,
    }));
  }

  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    const item = await this.contributorModel.findById(id);
    if (!item) throw new NotFoundException('Application not found');
    item.status = status;
    await item.save();

    if (status === 'APPROVED' && item.projectId) {
      await this.projectModel.findByIdAndUpdate(item.projectId, {
        $inc: { filledSlots: 1 },
      });
    }

    return {
      id: item._id.toString(),
      _id: item._id.toString(),
      status: item.status,
      success: true,
    };
  }

  async delete(id: string) {
    await this.contributorModel.findByIdAndDelete(id).exec();
    return { success: true };
  }
}
