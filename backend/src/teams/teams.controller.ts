import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { TeamsService } from './teams.service.js';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getAll() {
    return this.teamsService.getAll();
  }

  @Post()
  async createTeam(
    @Body()
    body: {
      name: string;
      description?: string;
      leadName?: string;
      color?: string;
    },
  ) {
    return this.teamsService.createTeam(body);
  }

  @Delete(':id')
  async deleteTeam(@Param('id') id: string) {
    return this.teamsService.deleteTeam(id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.teamsService.addMember(id, body.userId);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(id, userId);
  }
}
