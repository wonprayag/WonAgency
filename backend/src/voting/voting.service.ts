import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VoteEntity, FeedbackEntity } from '../database/schemas/index.js';

@Injectable()
export class VotingService {
  constructor(
    @InjectModel(VoteEntity.name) private voteModel: Model<VoteEntity>,
    @InjectModel(FeedbackEntity.name) private feedbackModel: Model<FeedbackEntity>,
  ) {}

  // ==================== POLLS ====================
  async getPolls() {
    const list = await this.voteModel.find().sort({ createdAt: -1 }).exec();
    return list.map((p) => ({
      id: p._id.toString(),
      _id: p._id.toString(),
      title: p.title,
      description: p.description,
      category: p.category || 'Governance',
      targetType: p.targetType || 'ALL',
      targetTeams: p.targetTeams || [],
      targetUserIds: p.targetUserIds || [],
      isAnonymousAllowed: p.isAnonymousAllowed ?? true,
      options: p.options || [],
      questions: p.questions && p.questions.length > 0
        ? p.questions
        : (p.options && p.options.length > 0 ? [{ id: 'q-default', questionText: p.title, options: p.options }] : []),
      userVotes: p.userVotes || [],
      expiresAt: p.expiresAt,
      createdBy: p.createdBy,
    }));
  }

  async getPollById(id: string) {
    const p = await this.voteModel.findById(id).exec();
    if (!p) throw new NotFoundException('Poll not found');
    return {
      id: p._id.toString(),
      _id: p._id.toString(),
      title: p.title,
      description: p.description,
      category: p.category,
      targetType: p.targetType,
      targetTeams: p.targetTeams,
      targetUserIds: p.targetUserIds,
      isAnonymousAllowed: p.isAnonymousAllowed,
      options: p.options || [],
      questions: p.questions && p.questions.length > 0
        ? p.questions
        : (p.options && p.options.length > 0 ? [{ id: 'q-default', questionText: p.title, options: p.options }] : []),
      userVotes: p.userVotes || [],
      expiresAt: p.expiresAt,
      createdBy: p.createdBy,
    };
  }

  async createPoll(data: any) {
    if (!data.title) {
      throw new BadRequestException('Poll title is required');
    }

    let questions: any[] = [];
    if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
      questions = data.questions.map((q: any, qIdx: number) => ({
        id: q.id || `pq-${Date.now()}-${qIdx}`,
        questionText: q.questionText || q.title || `Question ${qIdx + 1}`,
        options: (q.options || []).map((opt: any, oIdx: number) => ({
          id: opt.id || `opt-${Date.now()}-${qIdx}-${oIdx}`,
          text: typeof opt === 'string' ? opt : opt.text,
          votesCount: 0,
        })),
      }));
    } else if (data.options && data.options.length >= 2) {
      const opts = data.options.map((opt: any, idx: number) => ({
        id: opt.id || `opt-${Date.now()}-${idx}`,
        text: typeof opt === 'string' ? opt : opt.text,
        votesCount: 0,
      }));
      questions = [
        {
          id: `pq-${Date.now()}-0`,
          questionText: data.title.trim(),
          options: opts,
        },
      ];
    } else {
      throw new BadRequestException('Poll must have at least one question with two or more options');
    }

    const flatOptions = questions.flatMap((q) => q.options);

    const created = await this.voteModel.create({
      title: data.title.trim(),
      description: data.description?.trim() || '',
      category: data.category || 'Governance',
      targetType: data.targetType || 'ALL',
      targetTeams: data.targetTeams || [],
      targetUserIds: data.targetUserIds || [],
      isAnonymousAllowed: data.isAnonymousAllowed ?? true,
      options: flatOptions,
      questions,
      userVotes: [],
      expiresAt: data.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdBy: data.createdBy || 'Studio Administration',
    });

    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      title: created.title,
      description: created.description,
      category: created.category,
      targetType: created.targetType,
      targetTeams: created.targetTeams,
      targetUserIds: created.targetUserIds,
      isAnonymousAllowed: created.isAnonymousAllowed,
      options: created.options,
      questions: created.questions,
      userVotes: created.userVotes,
      expiresAt: created.expiresAt,
      createdBy: created.createdBy,
    };
  }

  async castVote(pollId: string, userId: string | undefined, optionId: string, isAnonymous = false, questionId?: string) {
    const poll = await this.voteModel.findById(pollId);
    if (!poll) throw new NotFoundException('Poll not found');

    const voterId = isAnonymous ? `anon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` : userId;

    let targetQ = poll.questions?.find((q) => q.id === questionId || q.options.some((o) => o.id === optionId));
    const effectiveQuestionId = targetQ?.id || questionId || 'q-default';

    if (!isAnonymous && userId) {
      const oldVoteIndex = poll.userVotes.findIndex(
        (uv) => uv.userId === userId && (uv.questionId ? uv.questionId === effectiveQuestionId : true)
      );

      if (oldVoteIndex > -1) {
        const oldVote = poll.userVotes[oldVoteIndex];
        if (oldVote.optionId === optionId) {
          return poll;
        }

        if (poll.questions && poll.questions.length > 0) {
          poll.questions = poll.questions.map((q) => ({
            ...q,
            options: q.options.map((opt) => {
              if (opt.id === oldVote.optionId) return { ...opt, votesCount: Math.max(0, opt.votesCount - 1) };
              if (opt.id === optionId) return { ...opt, votesCount: opt.votesCount + 1 };
              return opt;
            }),
          }));
        }

        poll.options = (poll.options || []).map((opt) => {
          if (opt.id === oldVote.optionId) return { ...opt, votesCount: Math.max(0, opt.votesCount - 1) };
          if (opt.id === optionId) return { ...opt, votesCount: opt.votesCount + 1 };
          return opt;
        });

        poll.userVotes[oldVoteIndex] = { userId, questionId: effectiveQuestionId, optionId, isAnonymous };
        await poll.save();
        return poll;
      }
    }

    if (poll.questions && poll.questions.length > 0) {
      poll.questions = poll.questions.map((q) => ({
        ...q,
        options: q.options.map((opt) => {
          if (opt.id === optionId) return { ...opt, votesCount: opt.votesCount + 1 };
          return opt;
        }),
      }));
    }

    poll.options = (poll.options || []).map((opt) => {
      if (opt.id === optionId) return { ...opt, votesCount: opt.votesCount + 1 };
      return opt;
    });

    poll.userVotes.push({ userId: voterId, questionId: effectiveQuestionId, optionId, isAnonymous });
    await poll.save();
    return poll;
  }

  async deletePoll(id: string) {
    await this.voteModel.findByIdAndDelete(id).exec();
    return { success: true };
  }

  // ==================== FEEDBACK FORMS ====================
  async getFeedbackForms() {
    const list = await this.feedbackModel.find().sort({ createdAt: -1 }).exec();
    return list.map((f) => ({
      id: f._id.toString(),
      _id: f._id.toString(),
      title: f.title,
      targetCategory: f.targetCategory || 'Operational Feedback',
      description: f.description,
      targetType: f.targetType || 'ALL',
      targetTeams: f.targetTeams || [],
      targetUserIds: f.targetUserIds || [],
      isAnonymousAllowed: f.isAnonymousAllowed ?? true,
      questions: f.questions || [],
      responses: f.responses || [],
      createdBy: f.createdBy,
    }));
  }

  async getFeedbackFormById(id: string) {
    const f = await this.feedbackModel.findById(id).exec();
    if (!f) throw new NotFoundException('Feedback form not found');
    return {
      id: f._id.toString(),
      _id: f._id.toString(),
      title: f.title,
      targetCategory: f.targetCategory,
      description: f.description,
      targetType: f.targetType,
      targetTeams: f.targetTeams,
      targetUserIds: f.targetUserIds,
      isAnonymousAllowed: f.isAnonymousAllowed,
      questions: f.questions,
      responses: f.responses,
      createdBy: f.createdBy,
    };
  }

  async createFeedbackForm(data: any) {
    if (!data.title || !data.questions || data.questions.length === 0) {
      throw new BadRequestException('Form title and at least one question are required');
    }

    const questions = data.questions.map((q: any, idx: number) => ({
      id: q.id || `q-${Date.now()}-${idx}`,
      questionText: q.questionText.trim(),
      type: q.type || 'TEXT',
      options: q.options || [],
      required: q.required ?? true,
    }));

    const created = await this.feedbackModel.create({
      title: data.title.trim(),
      targetCategory: data.targetCategory?.trim() || 'Operational Feedback',
      description: data.description?.trim() || '',
      targetType: data.targetType || 'ALL',
      targetTeams: data.targetTeams || [],
      targetUserIds: data.targetUserIds || [],
      isAnonymousAllowed: data.isAnonymousAllowed ?? true,
      questions,
      responses: [],
      createdBy: data.createdBy || 'Studio Administration',
    });

    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      title: created.title,
      targetCategory: created.targetCategory,
      description: created.description,
      targetType: created.targetType,
      targetTeams: created.targetTeams,
      targetUserIds: created.targetUserIds,
      isAnonymousAllowed: created.isAnonymousAllowed,
      questions: created.questions,
      responses: created.responses,
      createdBy: created.createdBy,
    };
  }

  async submitFeedback(formId: string, data: { userId?: string; userName?: string; isAnonymous?: boolean; answers: any }) {
    const form = await this.feedbackModel.findById(formId);
    if (!form) throw new NotFoundException('Form not found');

    const isAnonymous = data.isAnonymous ?? false;
    const voterId = isAnonymous ? `anon-${Date.now()}` : data.userId;
    const voterName = isAnonymous ? 'Anonymous Contributor' : (data.userName || 'Studio Member');

    form.responses.push({
      userId: voterId,
      userName: voterName,
      isAnonymous,
      answers: data.answers,
      submittedAt: new Date().toISOString(),
    });

    await form.save();
    return { success: true, message: 'Response recorded successfully in MongoDB.' };
  }

  async deleteFeedbackForm(id: string) {
    await this.feedbackModel.findByIdAndDelete(id).exec();
    return { success: true };
  }
}
