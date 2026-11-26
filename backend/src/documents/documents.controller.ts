import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('categories')
  async getCategories() {
    return this.documentsService.getCategories();
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string }) {
    return this.documentsService.createCategory(body.name);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.documentsService.deleteCategory(id);
  }

  @Get()
  async getAll() {
    return this.documentsService.getAll();
  }

  @Get('project/:projectId')
  async getByProject(@Param('projectId') projectId: string) {
    return this.documentsService.getByProject(projectId);
  }

  @Post()
  async add(@Body() body: any) {
    return this.documentsService.addDocument(body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
