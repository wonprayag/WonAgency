import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { CertificatesService } from './certificates.service.js';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('issue')
  async issue(@Body() body: any) {
    return this.certificatesService.issueCertificate(body);
  }

  @Get('all')
  async getAll() {
    return this.certificatesService.getAll();
  }

  @Get('verify/:certNumber')
  async verify(@Param('certNumber') certNumber: string) {
    return this.certificatesService.verify(certNumber);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.certificatesService.delete(id);
  }
}
