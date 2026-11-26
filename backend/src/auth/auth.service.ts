import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserEntity } from '../database/schemas/index.js';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

const ALL_MODULES = [
  'dashboard',
  'attendance',
  'projects',
  'members',
  'voting',
  'ideation',
  'funds',
];

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel(UserEntity.name) private userModel: Model<UserEntity>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedUsersIfEmpty();
  }

  /**
   * Initializes users in MongoDB if the collection is empty.
   * All credentials, roles, and accessible modules are stored directly in MongoDB.
   */
  async seedUsersIfEmpty() {
    try {
      const count = await this.userModel.countDocuments();
      if (count === 0) {
        console.log('⚡ Initializing MongoDB user collection with initial accounts...');
        const superAdminHash = await bcrypt.hash('Prayagkaushik4', 10);

        await this.userModel.insertMany([
          {
            email: 'byprayag@gmail.com',
            passwordHash: superAdminHash,
            name: 'Prayag Kaushik',
            role: 'SUPER_ADMIN',
            sparkBalance: 999.0,
            eidNumber: 'WON-SA-0001',
            department: 'Executive Leadership / Super Admin',
            allowedModules: ALL_MODULES,
          },
        ]);
        console.log('✅ Initial MongoDB accounts successfully created and persisted.');
      } else {
        // Ensure existing users have allowedModules set if they were seeded before this update
        await this.userModel.updateMany(
          { allowedModules: { $exists: false } },
          { $set: { allowedModules: ALL_MODULES } },
        );
      }
    } catch (err: any) {
      console.error('Failed to seed initial MongoDB users:', err.message);
    }
  }

  /**
   * Authenticates user directly against MongoDB database records.
   * Returns accessible modules / permissions.
   */
  async login(email: string, pass: string) {
    if (!email || !pass) {
      throw new BadRequestException('Email and password are required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email: cleanEmail });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const modules =
      user.allowedModules && user.allowedModules.length > 0
        ? user.allowedModules
        : ALL_MODULES;

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      eid: user.eidNumber,
      allowedModules: modules,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        sparkBalance: user.sparkBalance,
        eidNumber: user.eidNumber,
        department: user.department,
        bio: user.bio || '',
        allowedModules: modules,
      },
    };
  }

  /**
   * Updates password directly in MongoDB.
   */
  async changePassword(email: string, currentPass: string, newPass: string) {
    if (!email || !currentPass || !newPass) {
      throw new BadRequestException('All fields are required');
    }

    if (newPass.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email: cleanEmail });

    if (!user) {
      throw new NotFoundException('User account not found in database');
    }

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match records');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    user.passwordHash = newHash;
    await user.save();

    return {
      success: true,
      message: 'Password updated successfully in MongoDB database.',
    };
  }

  /**
   * List all user credentials and scopes from MongoDB with mapped string IDs.
   */
  async getAllUsers() {
    const users = await this.userModel
      .find({}, { passwordHash: 0 })
      .sort({ createdAt: -1 })
      .exec();

    return users.map((u) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      sparkBalance: u.sparkBalance,
      eidNumber: u.eidNumber,
      department: u.department,
      bio: u.bio || '',
      allowedModules:
        u.allowedModules && u.allowedModules.length > 0
          ? u.allowedModules
          : ALL_MODULES,
      createdAt: u.get('createdAt'),
    }));
  }

  /**
   * Provisions a brand new account and credentials directly into MongoDB.
   * Allows setting custom scope / allowedModules.
   */
  async createUser(data: {
    name: string;
    email: string;
    pass: string;
    role: string;
    department?: string;
    sparkBalance?: number;
    eidNumber?: string;
    allowedModules?: string[];
  }) {
    if (!data.name || !data.email || !data.pass) {
      throw new BadRequestException('Name, email, and password are required');
    }

    if (data.pass.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email: cleanEmail });
    if (existing) {
      throw new ConflictException(`User with email "${cleanEmail}" already exists`);
    }

    const hash = await bcrypt.hash(data.pass, 10);
    const eid =
      data.eidNumber?.trim() || `WON-${Math.floor(1000 + Math.random() * 9000)}`;

    const modules =
      data.allowedModules && data.allowedModules.length > 0
        ? data.allowedModules
        : ['dashboard', 'attendance', 'projects'];

    const user = await this.userModel.create({
      email: cleanEmail,
      passwordHash: hash,
      name: data.name.trim(),
      role: data.role || 'MEMBER',
      sparkBalance: data.sparkBalance ?? 0.0,
      eidNumber: eid,
      department: data.department || 'Engineering & Design',
      allowedModules: modules,
    });

    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      sparkBalance: user.sparkBalance,
      eidNumber: user.eidNumber,
      department: user.department,
      allowedModules: user.allowedModules,
    };
  }

  /**
   * Updates accessible tabs / scope for a user by ObjectId or email.
   */
  async updateUserScope(idOrEmail: string, allowedModules: string[]) {
    let user = null;
    if (Types.ObjectId.isValid(idOrEmail)) {
      user = await this.userModel.findById(idOrEmail);
    }
    if (!user) {
      user = await this.userModel.findOne({ email: idOrEmail.toLowerCase().trim() });
    }
    if (!user) {
      throw new NotFoundException('Account not found in database');
    }

    user.allowedModules = allowedModules;
    await user.save();

    return {
      success: true,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        allowedModules: user.allowedModules,
      },
    };
  }

  /**
   * Removes an account from MongoDB by ObjectId or email.
   * Protects the Super Admin account.
   */
  async deleteUser(idOrEmail: string) {
    if (!idOrEmail) {
      throw new BadRequestException('User ID or email is required');
    }

    let user = null;
    if (Types.ObjectId.isValid(idOrEmail)) {
      user = await this.userModel.findById(idOrEmail);
    }
    if (!user) {
      user = await this.userModel.findOne({ email: idOrEmail.toLowerCase().trim() });
    }
    if (!user) {
      throw new NotFoundException('Account not found in database');
    }
    if (user.role === 'SUPER_ADMIN' || user.email.toLowerCase() === 'byprayag@gmail.com') {
      throw new BadRequestException('Cannot delete Super Admin account');
    }

    await this.userModel.findByIdAndDelete(user._id);
    return { success: true, message: `Account for ${user.name} (${user.email}) deleted successfully.` };
  }

  /**
   * Updates user personal profile information (name, bio, department) in MongoDB.
   */
  async updateProfile(
    idOrEmail: string,
    data: { name?: string; bio?: string; department?: string },
  ) {
    if (!idOrEmail) {
      throw new BadRequestException('User ID or email is required');
    }

    let user = null;
    if (Types.ObjectId.isValid(idOrEmail)) {
      user = await this.userModel.findById(idOrEmail);
    }
    if (!user) {
      user = await this.userModel.findOne({ email: idOrEmail.toLowerCase().trim() });
    }
    if (!user) {
      throw new NotFoundException('Account not found in database');
    }

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.bio !== undefined) user.bio = data.bio.trim();
    if (data.department !== undefined) user.department = data.department.trim();

    await user.save();

    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      sparkBalance: user.sparkBalance,
      eidNumber: user.eidNumber,
      department: user.department,
      bio: user.bio,
      allowedModules: user.allowedModules,
    };
  }
}
