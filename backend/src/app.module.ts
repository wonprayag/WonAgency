import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { BondModule } from './bond/bond.module.js';
import { SparkModule } from './spark/spark.module.js';
import { ReaderModule } from './reader/reader.module.js';
import { TimetableModule } from './timetable/timetable.module.js';
import { NoticeModule } from './notices/notices.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ContributorsModule } from './contributors/contributors.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { CertificatesModule } from './certificates/certificates.module.js';
import { MembersModule } from './members/members.module.js';
import { VotingModule } from './voting/voting.module.js';
import { IdeationModule } from './ideation/ideation.module.js';
import { FundsModule } from './funds/funds.module.js';
import { MailModule } from './mail/mail.module.js';
import { TeamsModule } from './teams/teams.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://127.0.0.1:27017/won_agency',
      }),
      inject: [ConfigService],
    }),
    MailModule,
    AuthModule,
    TeamsModule,
    AttendanceModule,
    BondModule,
    SparkModule,
    ReaderModule,
    TimetableModule,
    NoticeModule,
    ProjectsModule,
    ContributorsModule,
    DocumentsModule,
    CertificatesModule,
    MembersModule,
    VotingModule,
    IdeationModule,
    FundsModule,
  ],
})
export class AppModule {}
