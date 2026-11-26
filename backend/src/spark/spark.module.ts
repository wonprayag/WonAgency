import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SparkEntity, SparkSchema, UserEntity, UserSchema } from '../database/schemas/index.js';
import { SparkService } from './spark.service.js';
import { SparkController } from './spark.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SparkEntity.name, schema: SparkSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
  ],
  controllers: [SparkController],
  providers: [SparkService],
  exports: [SparkService],
})
export class SparkModule {}
