import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReaderEntity, ReaderSchema } from '../database/schemas/index.js';
import { ReaderService } from './reader.service.js';
import { ReaderController } from './reader.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ReaderEntity.name, schema: ReaderSchema }])],
  controllers: [ReaderController],
  providers: [ReaderService],
  exports: [ReaderService],
})
export class ReaderModule {}
