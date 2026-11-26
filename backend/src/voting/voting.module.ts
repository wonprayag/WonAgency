import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  VoteEntity,
  VoteSchema,
  FeedbackEntity,
  FeedbackSchema,
} from '../database/schemas/index.js';
import { VotingService } from './voting.service.js';
import { VotingController } from './voting.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VoteEntity.name, schema: VoteSchema },
      { name: FeedbackEntity.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [VotingController],
  providers: [VotingService],
  exports: [VotingService],
})
export class VotingModule {}
