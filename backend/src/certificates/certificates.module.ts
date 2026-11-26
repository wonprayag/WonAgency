import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CertificateEntity, CertificateSchema } from '../database/schemas/index.js';
import { CertificatesService } from './certificates.service.js';
import { CertificatesController } from './certificates.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CertificateEntity.name, schema: CertificateSchema }]),
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
