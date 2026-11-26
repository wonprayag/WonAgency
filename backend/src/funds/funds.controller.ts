import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FundsService } from './funds.service.js';

@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get('summary')
  async getSummary() {
    return this.fundsService.getSummary();
  }

  // Inflows / Deposits
  @Get('inflows')
  async getInflows() {
    return this.fundsService.getInflows();
  }

  @Post('deposit')
  async recordDeposit(
    @Body()
    body: {
      amount: number;
      source: string;
      depositedBy: string;
      depositedById?: string;
      notes?: string;
      date?: string;
    },
  ) {
    return this.fundsService.recordDeposit(body);
  }

  // Fund Requests
  @Get('requests')
  async getFundRequests(@Query('userId') userId?: string) {
    return this.fundsService.getFundRequests(userId);
  }

  @Post('requests')
  async createFundRequest(
    @Body()
    body: {
      title: string;
      amount: number;
      reason: string;
      workProject: string;
      requestedBy: string;
      requestedById: string;
      userEid?: string;
      urgency?: string;
    },
  ) {
    return this.fundsService.createFundRequest(body);
  }

  @Patch('requests/:id/review')
  async reviewFundRequest(
    @Param('id') id: string,
    @Body()
    body: {
      status: 'APPROVED' | 'REJECTED';
      reviewedBy: string;
      reviewNotes?: string;
    },
  ) {
    return this.fundsService.reviewFundRequest(id, body);
  }

  @Post('requests/:id/disburse')
  async disburseFundRequest(
    @Param('id') id: string,
    @Body() body: { disbursedBy: string; notes?: string },
  ) {
    return this.fundsService.disburseFundRequest(id, body);
  }

  // Expenses & Utilization Receipts
  @Get('expenses')
  async getExpenses(@Query('workProject') workProject?: string) {
    return this.fundsService.getExpenses(workProject);
  }

  @Post('expenses')
  async createExpenseReceipt(
    @Body()
    body: {
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
    },
  ) {
    return this.fundsService.createExpenseReceipt(body);
  }

  @Get('verify/:ref')
  async verifyReceipt(@Param('ref') ref: string) {
    return this.fundsService.verifyReceipt(ref);
  }

  // Legacy fallback
  @Post('invest')
  async recordInvestment(
    @Body() body: { investor: string; amount: number; category: string },
  ) {
    return this.fundsService.recordInvestment(body);
  }
}
