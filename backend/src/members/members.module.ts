import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MemberEntity,
  MemberSchema,
  EidCardEntity,
  EidCardSchema,
  MemberTimelineEntity,
  MemberTimelineSchema,
  UserEntity,
  UserSchema,
} from '../database/schemas/index.js';
import { MembersService } from './members.service.js';
import { MembersController } from './members.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberEntity.name, schema: MemberSchema },
      { name: EidCardEntity.name, schema: EidCardSchema },
      { name: MemberTimelineEntity.name, schema: MemberTimelineSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
