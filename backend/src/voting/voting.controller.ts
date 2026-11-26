import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { VotingService } from './voting.service.js';

@Controller('voting')
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  // ==================== POLLS ====================
  @Get('polls')
  async getPolls() {
    return this.votingService.getPolls();
  }

  @Get('polls/:id')
  async getPollById(@Param('id') id: string) {
    return this.votingService.getPollById(id);
  }

  @Post('polls')
  async createPoll(@Body() body: any) {
    return this.votingService.createPoll(body);
  }

  @Post('polls/:id/vote')
  async vote(
    @Param('id') pollId: string,
    @Body() body: { userId?: string; optionId: string; isAnonymous?: boolean; questionId?: string },
  ) {
    return this.votingService.castVote(pollId, body.userId, body.optionId, body.isAnonymous, body.questionId);
  }

  @Delete('polls/:id')
  async deletePoll(@Param('id') id: string) {
    return this.votingService.deletePoll(id);
  }

  // ==================== FEEDBACK FORMS ====================
  @Get('feedback/forms')
  async getFeedback() {
    return this.votingService.getFeedbackForms();
  }

  @Get('feedback/forms/:id')
  async getFeedbackById(@Param('id') id: string) {
    return this.votingService.getFeedbackFormById(id);
  }

  @Post('feedback/forms')
  async createFeedbackForm(@Body() body: any) {
    return this.votingService.createFeedbackForm(body);
  }

  @Post('feedback/:id/submit')
  async submitFeedback(
    @Param('id') formId: string,
    @Body() body: { userId?: string; userName?: string; isAnonymous?: boolean; answers: any },
  ) {
    return this.votingService.submitFeedback(formId, body);
  }

  @Delete('feedback/forms/:id')
  async deleteFeedbackForm(@Param('id') id: string) {
    return this.votingService.deleteFeedbackForm(id);
  }
}
