import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentEntity, DocumentCategoryEntity } from '../database/schemas/index.js';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name) private documentModel: Model<DocumentEntity>,
    @InjectModel(DocumentCategoryEntity.name)
    private categoryModel: Model<DocumentCategoryEntity>,
  ) {}

  async getAll(email?: string, userId?: string, docType?: string) {
    const query: any = {};
    if (docType) {
      query.docType = docType;
    }
    if (email || userId) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const orClauses: any[] = [];
      if (cleanEmail) {
        orClauses.push({ createdByEmail: cleanEmail });
        orClauses.push({ sharedWithEmails: cleanEmail });
      }
      if (userId) {
        orClauses.push({ createdById: userId });
      }
      if (docType !== 'STUDIO') {
        orClauses.push({ createdByEmail: { $exists: false } });
      }
      if (orClauses.length > 0) {
        query.$or = orClauses;
      }
    }
    const list = await this.documentModel.find(query).sort({ createdAt: -1 }).exec();
    return list.map((d) => ({
      id: d._id.toString(),
      _id: d._id.toString(),
      projectId: d.projectId ? d.projectId.toString() : '',
      projectTitle: d.projectTitle || 'General Documentation',
      title: d.title,
      category: d.category,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt,
      createdById: d.createdById || '',
      createdByEmail: d.createdByEmail || '',
      sharedWithEmails: d.sharedWithEmails || [],
      docType: d.docType || 'PROJECT',
      payloadJson: d.payloadJson || '',
    }));
  }

  async getByProject(projectId: string) {
    const query: any = {};
    if (Types.ObjectId.isValid(projectId)) {
      query.projectId = new Types.ObjectId(projectId);
    } else {
      query.projectTitle = projectId;
    }
    const list = await this.documentModel.find(query).sort({ createdAt: -1 }).exec();
    return list.map((d) => ({
      id: d._id.toString(),
      _id: d._id.toString(),
      projectId: d.projectId ? d.projectId.toString() : '',
      projectTitle: d.projectTitle,
      title: d.title,
      category: d.category,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt,
    }));
  }

  async addDocument(data: {
    title: string;
    projectId?: string;
    projectTitle?: string;
    category?: string;
    fileUrl?: string;
    createdById?: string;
    createdByEmail?: string;
    sharedWithEmails?: string[];
    docType?: string;
    payloadJson?: string;
  }) {
    const cleanShared = Array.isArray(data.sharedWithEmails)
      ? data.sharedWithEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [];
    const docData: any = {
      projectTitle: data.projectTitle || 'General',
      title: data.title.trim(),
      category: data.category || 'Specification',
      fileUrl: data.fileUrl || '#',
      uploadedAt: new Date().toISOString().split('T')[0],
      createdById: data.createdById || '',
      createdByEmail: (data.createdByEmail || '').trim().toLowerCase(),
      sharedWithEmails: cleanShared,
      docType: data.docType || 'PROJECT',
      payloadJson: data.payloadJson || '',
    };
    if (data.projectId && Types.ObjectId.isValid(data.projectId)) {
      docData.projectId = new Types.ObjectId(data.projectId);
    }
    const created = await this.documentModel.create(docData);
    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      projectId: data.projectId || '',
      projectTitle: created.projectTitle,
      title: created.title,
      category: created.category,
      fileUrl: created.fileUrl,
      uploadedAt: created.uploadedAt,
      createdById: created.createdById || '',
      createdByEmail: created.createdByEmail || '',
      sharedWithEmails: created.sharedWithEmails || [],
      docType: created.docType || 'PROJECT',
      payloadJson: created.payloadJson || '',
    };
  }

  async delete(id: string) {
    const res = await this.documentModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Document not found');
    return { success: true };
  }

  // ==========================================
  // DYNAMIC CATEGORY MANAGEMENT
  // ==========================================
  async getCategories() {
    let cats = await this.categoryModel.find().sort({ createdAt: 1 }).exec();
    if (cats.length === 0) {
      // Seed initial standard categories
      const defaults = ['Specification', 'Report', 'Design', 'Architecture'];
      for (const name of defaults) {
        await this.categoryModel.create({ name }).catch(() => {});
      }
      cats = await this.categoryModel.find().sort({ createdAt: 1 }).exec();
    }
    return cats.map((c) => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      name: c.name,
    }));
  }

  async createCategory(name: string) {
    if (!name || !name.trim()) throw new BadRequestException('Category name is required');
    const cleanName = name.trim();
    const existing = await this.categoryModel.findOne({ name: cleanName });
    if (existing) {
      return { id: existing._id.toString(), _id: existing._id.toString(), name: existing.name };
    }
    const created = await this.categoryModel.create({ name: cleanName });
    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      name: created.name,
    };
  }

  async deleteCategory(idOrName: string) {
    if (!idOrName) throw new BadRequestException('Category ID or name is required');
    if (Types.ObjectId.isValid(idOrName)) {
      await this.categoryModel.findByIdAndDelete(idOrName);
    } else {
      await this.categoryModel.findOneAndDelete({ name: idOrName });
    }
    return { success: true };
  }
}
