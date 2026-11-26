import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';
import {
  TeamEntity,
  TeamSchema,
  UserEntity,
  UserSchema,
} from '../database/schemas/index.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamEntity.name, schema: TeamSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
