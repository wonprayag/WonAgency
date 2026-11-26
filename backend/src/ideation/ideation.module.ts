import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  IdeationEntity,
  IdeationSchema,
  ProposalCategoryEntity,
  ProposalCategorySchema,
} from '../database/schemas/index.js';
import { IdeationService } from './ideation.service.js';
import { IdeationController } from './ideation.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IdeationEntity.name, schema: IdeationSchema },
      { name: ProposalCategoryEntity.name, schema: ProposalCategorySchema },
    ]),
  ],
  controllers: [IdeationController],
  providers: [IdeationService],
  exports: [IdeationService],
})
export class IdeationModule {}
