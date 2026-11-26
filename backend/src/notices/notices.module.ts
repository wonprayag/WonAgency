import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NoticeEntity, NoticeSchema } from '../database/schemas/index.js';
import { NoticeService } from './notices.service.js';
import { NoticeController } from './notices.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: NoticeEntity.name, schema: NoticeSchema }])],
  controllers: [NoticeController],
  providers: [NoticeService],
  exports: [NoticeService],
})
export class NoticeModule {}
