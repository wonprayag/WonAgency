import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FundEntity,
  FundSchema,
  ReceiptEntity,
  ReceiptSchema,
  FundInflowEntity,
  FundInflowSchema,
  FundRequestEntity,
  FundRequestSchema,
} from '../database/schemas/index.js';
import { FundsService } from './funds.service.js';
import { FundsController } from './funds.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FundEntity.name, schema: FundSchema },
      { name: ReceiptEntity.name, schema: ReceiptSchema },
      { name: FundInflowEntity.name, schema: FundInflowSchema },
      { name: FundRequestEntity.name, schema: FundRequestSchema },
    ]),
  ],
  controllers: [FundsController],
  providers: [FundsService],
  exports: [FundsService],
})
export class FundsModule {}
