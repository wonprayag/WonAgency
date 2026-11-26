import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; pass: string }) {
    return this.authService.login(body.email, body.pass);
  }

  @Post('change-password')
  async changePassword(
    @Body() body: { email: string; currentPass: string; newPass: string },
  ) {
    return this.authService.changePassword(
      body.email,
      body.currentPass,
      body.newPass,
    );
  }

  @Get('users')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Post('users')
  async createUser(
    @Body()
    body: {
      name: string;
      email: string;
      pass: string;
      role: string;
      department?: string;
      sparkBalance?: number;
      eidNumber?: string;
      allowedModules?: string[];
    },
  ) {
    return this.authService.createUser(body);
  }

  @Put('users/:id/scope')
  async updateScope(
    @Param('id') id: string,
    @Body() body: { allowedModules: string[] },
  ) {
    return this.authService.updateUserScope(id, body.allowedModules);
  }

  @Put('profile/:id')
  async updateProfile(
    @Param('id') id: string,
    @Body() body: { name?: string; bio?: string; department?: string },
  ) {
    return this.authService.updateProfile(id, body);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }

  @Get('health')
  health() {
    return {
      status: 'healthy',
      platform: 'WON Originals Backend',
      database: 'MongoDB Atlas',
      version: '1.0.0',
    };
  }
}
