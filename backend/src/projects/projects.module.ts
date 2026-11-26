import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectEntity, ProjectSchema } from '../database/schemas/index.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ProjectEntity.name, schema: ProjectSchema }])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
