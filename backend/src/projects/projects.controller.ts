import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getAll() {
    return this.projectsService.getAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.projectsService.getById(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.projectsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.projectsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }
}
