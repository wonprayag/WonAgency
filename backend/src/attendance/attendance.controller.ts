import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('session/submit')
  async submitSessionAttendance(
    @Body()
    body: {
      subjectId?: string;
      subjectName: string;
      batchId?: string;
      batchName?: string;
      date: string;
      timeSlot?: string;
      room?: string;
      markedByUserId: string;
      markedByName?: string;
      records: Array<{
        userId: string;
        userName: string;
        userEid?: string;
        status: 'PRESENT' | 'ABSENT';
        remarks?: string;
      }>;
    },
  ) {
    return this.attendanceService.submitSessionAttendance(body);
  }

  @Get('session')
  async getSessionAttendance(
    @Query('subject') subject: string,
    @Query('date') date: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.attendanceService.getSessionAttendance(subject, date, batchId);
  }

  @Get('defaulters')
  async getDefaulters(@Query('subjectId') subjectId?: string) {
    return this.attendanceService.getAttendanceDefaulters(subjectId);
  }

  @Get('member-summary/:userId')
  async getMemberAttendanceSummary(@Param('userId') userId: string) {
    return this.attendanceService.getMemberAttendanceSummary(userId);
  }

  @Post('mark')
  async mark(
    @Body()
    body: {
      userId: string;
      subject: string;
      date: string;
      status: 'PRESENT' | 'ABSENT';
      markedByUserId?: string;
    },
  ) {
    return this.attendanceService.markAttendance(body);
  }

  @Get('user/:userId')
  async getUserAttendance(@Param('userId') userId: string) {
    return this.attendanceService.getAttendanceByUser(userId);
  }

  @Get('all')
  async getAll(
    @Query('subject') subject?: string,
    @Query('batchId') batchId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendanceService.getAllAttendance({
      subject,
      batchId,
      userId,
      status,
      dateFrom,
      dateTo,
    });
  }

  @Delete(':id')
  async deleteAttendance(@Param('id') id: string) {
    return this.attendanceService.deleteAttendance(id);
  }
}
