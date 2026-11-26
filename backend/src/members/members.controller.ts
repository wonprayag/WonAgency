import { Controller, Get, Param } from '@nestjs/common';
import { MembersService } from './members.service.js';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('all')
  async getAll() {
    return this.membersService.getAll();
  }

  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    return this.membersService.getMemberProfile(userId);
  }

  @Get('eid-pass/:userId')
  async getEidPass(@Param('userId') userId: string) {
    return this.membersService.generateEidPass(userId);
  }
}
