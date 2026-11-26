import { Controller, Get, Post, Body } from '@nestjs/common';
import { TimetableService } from './timetable.service.js';

@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  async get() {
    return this.timetableService.getTimetable();
  }

  @Post()
  async create(@Body() body: any) {
    return this.timetableService.addEntry(body);
  }
}
