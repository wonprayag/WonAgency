import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ContributorEntity,
  ContributorSchema,
  ProjectEntity,
  ProjectSchema,
} from '../database/schemas/index.js';
import { ContributorsService } from './contributors.service.js';
import { ContributorsController } from './contributors.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContributorEntity.name, schema: ContributorSchema },
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [ContributorsController],
  providers: [ContributorsService],
  exports: [ContributorsService],
})
export class ContributorsModule {}
