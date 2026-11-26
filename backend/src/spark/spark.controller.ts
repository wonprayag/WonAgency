import { Controller, Get, Param } from '@nestjs/common';
import { SparkService } from './spark.service.js';

@Controller('spark')
export class SparkController {
  constructor(private readonly sparkService: SparkService) {}

  @Get(':userId')
  async getHistory(@Param('userId') userId: string) {
    return this.sparkService.getUserSparkHistory(userId);
  }
}
