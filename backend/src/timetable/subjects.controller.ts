import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { TimetableService } from './timetable.service.js';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  async getSubjects() {
    return this.timetableService.getAllSubjects();
  }

  @Get(':id')
  async getSubjectById(@Param('id') id: string) {
    return this.timetableService.getSubjectById(id);
  }

  @Post()
  async createSubject(@Body() body: any) {
    return this.timetableService.createSubject(body);
  }

  @Put(':id')
  async updateSubject(@Param('id') id: string, @Body() body: any) {
    return this.timetableService.updateSubject(id, body);
  }

  @Delete(':id')
  async deleteSubject(@Param('id') id: string) {
    return this.timetableService.deleteSubject(id);
  }

  @Post('validate-schedule')
  async validateSchedule(@Body() body: any) {
    return this.timetableService.validateSchedule(body);
  }
}
