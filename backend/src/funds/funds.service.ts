import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import crypto from 'node:crypto';
import {
  FundEntity,
  ReceiptEntity,
  FundInflowEntity,
  FundRequestEntity,
} from '../database/schemas/index.js';

@Injectable()
export class FundsService {
  constructor(
    @InjectModel(FundEntity.name) private fundModel: Model<FundEntity>,
    @InjectModel(ReceiptEntity.name) private receiptModel: Model<ReceiptEntity>,
    @InjectModel(FundInflowEntity.name) private inflowModel: Model<FundInflowEntity>,
    @InjectModel(FundRequestEntity.name) private requestModel: Model<FundRequestEntity>,
  ) {}

  private generateUniqueTxnId(_prefix?: 'DEP' | 'REQ' | 'REL'): string {
    // 15-digit pure numeric ITR Acknowledgement format (no hyphens or hashes)
    const tsDigits = Date.now().toString().slice(-10);
    const randDigits = crypto.randomInt(10000, 99999).toString();
    return `${tsDigits}${randDigits}`;
  }

  private async getOrCreateFund() {
    let fund = await this.fundModel.findOne();
    if (!fund) {
      fund = await this.fundModel.create({
        totalBalance: 0,
        totalInflow: 0,
        totalDisbursed: 0,
        currency: 'INR',
        targetRaiseAmount: 0,
        currentRaisedAmount: 0,
        totalInvestedAmount: 0,
      });
    }
    return fund;
  }

  async getSummary() {
    const fund = await this.getOrCreateFund();
    const recentInflows = await this.inflowModel.find().sort({ createdAt: -1 }).limit(10).exec();
    const recentExpenses = await this.receiptModel.find().sort({ createdAt: -1 }).limit(20).exec();
    const pendingRequestsCount = await this.requestModel.countDocuments({ status: 'PENDING' });
    const totalRequestsCount = await this.requestModel.countDocuments();

    return {
      fund,
      recentInflows,
      recentExpenses,
      pendingRequestsCount,
      totalRequestsCount,
    };
  }

  // 1. INFLOWS / CAPITAL DEPOSITS
  async getInflows() {
    return this.inflowModel.find().sort({ createdAt: -1 }).exec();
  }

  async recordDeposit(data: {
    amount: number;
    source: string;
    depositedBy: string;
    depositedById?: string;
    notes?: string;
    date?: string;
  }) {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    const receiptRef = this.generateUniqueTxnId('DEP');
    const inflow = await this.inflowModel.create({
      amount: Number(data.amount),
      source: data.source.trim(),
      depositedBy: data.depositedBy.trim(),
      depositedById: data.depositedById ? String(data.depositedById) : '',
      notes: data.notes?.trim() || '',
      date: data.date || new Date().toISOString().split('T')[0],
      receiptRef,
    });

    const fund = await this.getOrCreateFund();
    fund.totalBalance = Number(((fund.totalBalance || 0) + Number(data.amount)).toFixed(2));
    fund.totalInflow = Number(((fund.totalInflow || 0) + Number(data.amount)).toFixed(2));
    fund.currentRaisedAmount = fund.totalInflow;
    await fund.save();

    return { inflow, fund };
  }

  // 2. FUND REQUESTS (MEMBERS NEEDING MONEY)
  async getFundRequests(userId?: string) {
    const query = userId ? { requestedById: String(userId) } : {};
    return this.requestModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async createFundRequest(data: {
    title: string;
    amount: number;
    reason: string;
    workProject: string;
    requestedBy: string;
    requestedById: string;
    userEid?: string;
    urgency?: string;
  }) {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Requested amount must be greater than zero');
    }
    if (!data.reason || !data.reason.trim()) {
      throw new BadRequestException('Please provide the reason / justification for requesting funds');
    }

    return this.requestModel.create({
      title: data.title.trim(),
      amount: Number(data.amount),
      reason: data.reason.trim(),
      workProject: data.workProject.trim() || 'General Operations',
      requestedBy: data.requestedBy.trim(),
      requestedById: data.requestedById ? String(data.requestedById) : '',
      userEid: data.userEid || 'WON-MB-0000',
      urgency: data.urgency === 'URGENT' ? 'URGENT' : 'NORMAL',
      status: 'PENDING',
      receiptRef: this.generateUniqueTxnId('REQ'),
    });
  }

  async reviewFundRequest(
    id: string,
    data: {
      status: 'APPROVED' | 'REJECTED';
      reviewedBy: string;
      reviewNotes?: string;
    },
  ) {
    const req = await this.requestModel.findById(id);
    if (!req) throw new NotFoundException('Fund request not found');

    req.status = data.status;
    req.reviewedBy = data.reviewedBy;
    if (data.reviewNotes) req.reviewNotes = data.reviewNotes;
    await req.save();

    return req;
  }

  async disburseFundRequest(id: string, data: { disbursedBy: string; notes?: string }) {
    const req = await this.requestModel.findById(id);
    if (!req) throw new NotFoundException('Fund request not found');

    if (req.status === 'DISBURSED') {
      throw new BadRequestException('This fund request has already been disbursed');
    }

    const fund = await this.getOrCreateFund();
    if (fund.totalBalance < req.amount) {
      throw new BadRequestException(
        `Insufficient treasury balance. Available: ₹${fund.totalBalance.toLocaleString('en-IN')}, Requested: ₹${req.amount.toLocaleString('en-IN')}`,
      );
    }

    const receiptRef = this.generateUniqueTxnId('REL');
    const receipt = await this.receiptModel.create({
      receiptRef,
      title: req.title,
      amount: req.amount,
      usedBy: req.requestedBy,
      usedById: req.requestedById,
      workProject: req.workProject,
      category: 'Disbursed Allocation',
      date: new Date().toISOString().split('T')[0],
      notes: data.notes?.trim() || req.reason,
      approvedBy: data.disbursedBy,
      fundRequestId: req._id.toString(),
      investor: req.requestedBy,
    });

    req.status = 'DISBURSED';
    req.disbursedDate = new Date().toISOString().split('T')[0];
    req.receiptRef = receiptRef;
    if (data.disbursedBy) req.reviewedBy = data.disbursedBy;
    await req.save();

    fund.totalBalance = Number(((fund.totalBalance || 0) - req.amount).toFixed(2));
    fund.totalDisbursed = Number(((fund.totalDisbursed || 0) + req.amount).toFixed(2));
    await fund.save();

    return { request: req, receipt, fund };
  }

  // 3. EXPENSES & RECEIPTS
  async getExpenses(workProject?: string) {
    const query = workProject ? { workProject } : {};
    return this.receiptModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async createExpenseReceipt(data: {
    title: string;
    amount: number;
    usedBy: string;
    usedById?: string;
    workProject: string;
    category?: string;
    date?: string;
    notes?: string;
    proofUrl?: string;
    approvedBy?: string;
  }) {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than zero');
    }

    const fund = await this.getOrCreateFund();
    if (fund.totalBalance < data.amount) {
      throw new BadRequestException(
        `Insufficient treasury balance to log this expenditure. Available: ₹${fund.totalBalance.toLocaleString('en-IN')}`,
      );
    }

    const receiptRef = this.generateUniqueTxnId('REL');
    const receipt = await this.receiptModel.create({
      receiptRef,
      title: data.title.trim(),
      amount: Number(data.amount),
      usedBy: data.usedBy.trim(),
      usedById: data.usedById ? String(data.usedById) : '',
      workProject: data.workProject.trim() || 'General Operations',
      category: data.category?.trim() || 'General Operations',
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes?.trim() || '',
      proofUrl: data.proofUrl?.trim() || '',
      approvedBy: data.approvedBy || '',
      investor: data.usedBy.trim(),
    });

    fund.totalBalance = Number(((fund.totalBalance || 0) - Number(data.amount)).toFixed(2));
    fund.totalDisbursed = Number(((fund.totalDisbursed || 0) + Number(data.amount)).toFixed(2));
    await fund.save();

    return { receipt, fund };
  }

  // 4. VERIFY RECEIPT / TRANSACTION BY ITR ID OR MONGO ID
  async verifyReceipt(ref: string) {
    const cleanRef = decodeURIComponent(ref || '').trim();
    if (!cleanRef) return { verified: false };

    const isObjId = Types.ObjectId.isValid(cleanRef);

    // Check Fund Release / Expense Receipt
    const receipt = await this.receiptModel
      .findOne(isObjId ? { $or: [{ receiptRef: cleanRef }, { _id: cleanRef }] } : { receiptRef: cleanRef })
      .exec();
    if (receipt) {
      return {
        verified: true,
        type: 'RELEASE',
        receiptRef: receipt.receiptRef,
        title: receipt.title,
        amount: receipt.amount,
        status: 'RELEASED',
        person: receipt.usedBy,
        project: receipt.workProject,
        category: receipt.category,
        date: receipt.date,
        approvedBy: receipt.approvedBy || 'Admin',
        notes: receipt.notes,
        proofUrl: receipt.proofUrl,
      };
    }

    // Check Capital Deposit
    const inflow = await this.inflowModel
      .findOne(isObjId ? { $or: [{ receiptRef: cleanRef }, { _id: cleanRef }] } : { receiptRef: cleanRef })
      .exec();
    if (inflow) {
      return {
        verified: true,
        type: 'DEPOSIT',
        receiptRef: inflow.receiptRef,
        title: inflow.source,
        amount: inflow.amount,
        status: 'COMPLETED',
        person: inflow.depositedBy,
        project: 'Treasury Deposit',
        category: 'Capital Inflow',
        date: inflow.date,
        approvedBy: inflow.depositedBy,
        notes: inflow.notes,
      };
    }

    // Check Fund Request
    const request = await this.requestModel
      .findOne(isObjId ? { $or: [{ receiptRef: cleanRef }, { _id: cleanRef }] } : { receiptRef: cleanRef })
      .exec();
    if (request) {
      return {
        verified: true,
        type: 'REQUEST',
        receiptRef: request.receiptRef || request._id.toString(),
        title: request.title,
        amount: request.amount,
        status: request.status,
        person: request.requestedBy,
        project: request.workProject,
        category: request.urgency === 'URGENT' ? 'Urgent Request' : 'Fund Request',
        date: request.disbursedDate || new Date((request as any).createdAt || Date.now()).toISOString().split('T')[0],
        approvedBy: request.reviewedBy || (request.status === 'PENDING' ? 'Awaiting Review' : 'Admin'),
        notes: request.reason,
      };
    }

    return { verified: false, receiptRef: cleanRef };
  }

  // Legacy fallback
  async recordInvestment(data: { investor: string; amount: number; category: string }) {
    return this.recordDeposit({
      amount: data.amount,
      source: data.category || 'Investment',
      depositedBy: data.investor,
    });
  }
}
