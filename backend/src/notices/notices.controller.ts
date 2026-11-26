import { Controller, Get, Post, Body } from '@nestjs/common';
import { NoticeService } from './notices.service.js';
import { EmailService } from '../mail/email.service.js';

@Controller('notices')
export class NoticeController {
  constructor(
    private readonly noticeService: NoticeService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  async get() {
    return this.noticeService.getNotices();
  }

  @Post()
  async publish(@Body() body: any) {
    return this.noticeService.publishNotice(body);
  }

  @Post('send-email')
  async sendEmail(@Body() body: any) {
    return this.emailService.sendNoticeEmail(body);
  }
}
