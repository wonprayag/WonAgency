import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TimetableEntity,
  TimetableSchema,
  SubjectEntity,
  SubjectSchema,
} from '../database/schemas/index.js';
import { TimetableService } from './timetable.service.js';
import { TimetableController } from './timetable.controller.js';
import { SubjectsController } from './subjects.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TimetableEntity.name, schema: TimetableSchema },
      { name: SubjectEntity.name, schema: SubjectSchema },
    ]),
  ],
  controllers: [TimetableController, SubjectsController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
