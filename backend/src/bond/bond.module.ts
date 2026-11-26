import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BondEntity, BondSchema } from '../database/schemas/index.js';
import { BondService } from './bond.service.js';
import { BondController } from './bond.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BondEntity.name, schema: BondSchema }]),
  ],
  controllers: [BondController],
  providers: [BondService],
  exports: [BondService],
})
export class BondModule {}
