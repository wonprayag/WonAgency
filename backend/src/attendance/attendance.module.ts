import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AttendanceEntity,
  AttendanceSchema,
  UserEntity,
  UserSchema,
  SubjectEntity,
  SubjectSchema,
} from '../database/schemas/index.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { SparkModule } from '../spark/spark.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceEntity.name, schema: AttendanceSchema },
      { name: UserEntity.name, schema: UserSchema },
      { name: SubjectEntity.name, schema: SubjectSchema },
    ]),
    SparkModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
