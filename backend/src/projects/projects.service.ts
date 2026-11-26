import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectEntity } from '../database/schemas/index.js';

@Injectable()
export class ProjectsService {
  constructor(@InjectModel(ProjectEntity.name) private projectModel: Model<ProjectEntity>) {}

  async getAll() {
    const list = await this.projectModel.find().sort({ createdAt: -1 }).exec();
    return list.map((p) => ({
      id: p._id.toString(),
      _id: p._id.toString(),
      title: p.title,
      contributionType: p.contributionType,
      companyDetails: p.companyDetails || {
        clientName: 'WON Studio',
        domain: 'Internal',
        contactEmail: 'contact@wonoriginals.agency',
      },
      description: p.description,
      status: p.status,
      contributorSlots: p.contributorSlots,
      filledSlots: p.filledSlots || 0,
      createdAt: (p as any).createdAt,
    }));
  }

  async getById(id: string) {
    const p = await this.projectModel.findById(id).exec();
    if (!p) throw new NotFoundException('Project not found');
    return {
      id: p._id.toString(),
      _id: p._id.toString(),
      title: p.title,
      contributionType: p.contributionType,
      companyDetails: p.companyDetails,
      description: p.description,
      status: p.status,
      contributorSlots: p.contributorSlots,
      filledSlots: p.filledSlots || 0,
    };
  }

  async create(data: {
    title: string;
    contributionType?: string;
    companyDetails?: { clientName: string; domain: string; contactEmail: string };
    clientName?: string;
    domain?: string;
    contactEmail?: string;
    description: string;
    status?: string;
    contributorSlots?: number;
    filledSlots?: number;
  }) {
    const clientName = data.companyDetails?.clientName || data.clientName || 'WON Partner';
    const domain = data.companyDetails?.domain || data.domain || 'Technology & Creative';
    const contactEmail = data.companyDetails?.contactEmail || data.contactEmail || 'partner@wonoriginals.agency';

    const created = await this.projectModel.create({
      title: data.title.trim(),
      contributionType: data.contributionType || 'Client Project',
      companyDetails: {
        clientName: clientName.trim(),
        domain: domain.trim(),
        contactEmail: contactEmail.trim(),
      },
      description: (data.description || '').trim(),
      status: data.status || 'ACTIVE',
      contributorSlots: Number(data.contributorSlots) || 5,
      filledSlots: Number(data.filledSlots) || 0,
    });

    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      title: created.title,
      contributionType: created.contributionType,
      companyDetails: created.companyDetails,
      description: created.description,
      status: created.status,
      contributorSlots: created.contributorSlots,
      filledSlots: created.filledSlots,
    };
  }

  async update(id: string, data: any) {
    const updated = await this.projectModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!updated) throw new NotFoundException('Project not found');
    return {
      id: updated._id.toString(),
      _id: updated._id.toString(),
      title: updated.title,
      contributionType: updated.contributionType,
      companyDetails: updated.companyDetails,
      description: updated.description,
      status: updated.status,
      contributorSlots: updated.contributorSlots,
      filledSlots: updated.filledSlots,
    };
  }

  async delete(id: string) {
    const res = await this.projectModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Project not found');
    return { success: true, message: 'Project removed successfully from MongoDB Atlas' };
  }
}
