import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { BondService } from './bond.service.js';

@Controller('bonds')
export class BondController {
  constructor(private readonly bondService: BondService) {}

  @Post('issue')
  async issue(
    @Body()
    body: {
      userId: string;
      userName: string;
      title: string;
      reason: string;
      penaltyObligation: string;
      subjectName?: string;
      subjectId?: string;
    },
  ) {
    return this.bondService.issueBond(body);
  }

  @Post(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.bondService.resolveBond(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.bondService.deleteBond(id);
  }

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.bondService.getBondsByUser(userId);
  }

  @Get('all')
  async getAll() {
    return this.bondService.getAllBonds();
  }
}
