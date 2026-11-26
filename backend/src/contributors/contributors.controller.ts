import { Controller, Post, Put, Delete, Get, Body, Param } from '@nestjs/common';
import { ContributorsService } from './contributors.service.js';

@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  @Post('apply')
  async apply(@Body() body: any) {
    return this.contributorsService.apply(body);
  }

  @Get('all')
  async getAll() {
    return this.contributorsService.getAll();
  }

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.contributorsService.getByUser(userId);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' },
  ) {
    return this.contributorsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.contributorsService.delete(id);
  }
}
