import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IdeationEntity, ProposalCategoryEntity } from '../database/schemas/index.js';

@Injectable()
export class IdeationService {
  constructor(
    @InjectModel(IdeationEntity.name) private ideationModel: Model<IdeationEntity>,
    @InjectModel(ProposalCategoryEntity.name) private categoryModel: Model<ProposalCategoryEntity>,
  ) {}

  // ==================== CATEGORIES ====================
  async getCategories() {
    const list = await this.categoryModel.find().sort({ createdAt: 1 }).exec();
    if (list.length === 0) {
      // Seed default categories for proposals & ideas
      const defaults = [
        'Platform & Tooling',
        'Workflow & Operations',
        'Agency Culture',
        'Client Deliverables',
      ];
      const created = await Promise.all(
        defaults.map((name) => this.categoryModel.create({ name })),
      );
      return created.map((c) => ({
        id: c._id.toString(),
        _id: c._id.toString(),
        name: c.name,
      }));
    }

    return list.map((c) => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      name: c.name,
    }));
  }

  async createCategory(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new BadRequestException('Category name cannot be empty');

    const existing = await this.categoryModel.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
    });
    if (existing) {
      return {
        id: existing._id.toString(),
        _id: existing._id.toString(),
        name: existing.name,
      };
    }

    const created = await this.categoryModel.create({ name: trimmed });
    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      name: created.name,
    };
  }

  async deleteCategory(id: string) {
    await this.categoryModel.findByIdAndDelete(id).exec();
    return { success: true, message: 'Category deleted successfully' };
  }

  // ==================== IDEATIONS / PROPOSALS ====================
  async getAll() {
    const items = await this.ideationModel.find().sort({ upvotes: -1, createdAt: -1 }).exec();
    return items.map((i) => ({
      id: i._id.toString(),
      _id: i._id.toString(),
      problemStatement: i.problemStatement,
      proposedSolution: i.proposedSolution,
      raisedBy: i.raisedBy,
      upvotes: i.upvotes,
      category: i.category,
      status: i.status,
      createdAt: i.createdAtDate,
      createdAtDate: i.createdAtDate,
    }));
  }

  async raiseProblem(data: {
    problemStatement: string;
    proposedSolution: string;
    raisedBy: string;
    category: string;
  }) {
    if (!data.problemStatement || !data.proposedSolution) {
      throw new BadRequestException('Problem statement and proposed solution are required');
    }

    const created = await this.ideationModel.create({
      problemStatement: data.problemStatement.trim(),
      proposedSolution: data.proposedSolution.trim(),
      raisedBy: data.raisedBy || 'Studio Member',
      upvotes: 1,
      category: data.category || 'General',
      status: 'OPEN',
      createdAtDate: new Date().toISOString().split('T')[0],
    });

    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      problemStatement: created.problemStatement,
      proposedSolution: created.proposedSolution,
      raisedBy: created.raisedBy,
      upvotes: created.upvotes,
      category: created.category,
      status: created.status,
      createdAt: created.createdAtDate,
      createdAtDate: created.createdAtDate,
    };
  }

  async upvote(id: string) {
    const item = await this.ideationModel.findById(id);
    if (!item) throw new NotFoundException('Ideation entry not found');
    item.upvotes += 1;
    await item.save();
    return {
      id: item._id.toString(),
      _id: item._id.toString(),
      problemStatement: item.problemStatement,
      proposedSolution: item.proposedSolution,
      raisedBy: item.raisedBy,
      upvotes: item.upvotes,
      category: item.category,
      status: item.status,
      createdAt: item.createdAtDate,
      createdAtDate: item.createdAtDate,
    };
  }

  async delete(id: string) {
    await this.ideationModel.findByIdAndDelete(id).exec();
    return { success: true, message: 'Suggestion removed from board' };
  }
}
