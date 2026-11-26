import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReaderService } from './reader.service.js';

@Controller('reader')
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  @Get('nodes')
  async getNodes() {
    return this.readerService.listNodes();
  }

  @Post('scan')
  async scan(@Body() body: { nodeId: string; eid: string }) {
    return this.readerService.registerScan(body.nodeId, body.eid);
  }
}
