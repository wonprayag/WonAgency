import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentEntity,
  DocumentSchema,
  DocumentCategoryEntity,
  DocumentCategorySchema,
} from '../database/schemas/index.js';
import { DocumentsService } from './documents.service.js';
import { DocumentsController } from './documents.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentSchema },
      { name: DocumentCategoryEntity.name, schema: DocumentCategorySchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
