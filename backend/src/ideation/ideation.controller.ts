import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { IdeationService } from './ideation.service.js';

@Controller('ideation')
export class IdeationController {
  constructor(private readonly ideationService: IdeationService) {}

  // ==================== CATEGORIES ====================
  @Get('categories')
  async getCategories() {
    return this.ideationService.getCategories();
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string }) {
    return this.ideationService.createCategory(body.name);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.ideationService.deleteCategory(id);
  }

  // ==================== IDEATIONS / PROPOSALS ====================
  @Get()
  async getAll() {
    return this.ideationService.getAll();
  }

  @Post()
  async raiseProblem(
    @Body()
    body: {
      problemStatement: string;
      proposedSolution: string;
      raisedBy: string;
      category: string;
    },
  ) {
    return this.ideationService.raiseProblem(body);
  }

  @Post(':id/upvote')
  async upvote(@Param('id') id: string) {
    return this.ideationService.upvote(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.ideationService.delete(id);
  }
}
