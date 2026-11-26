import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TeamEntity, UserEntity } from '../database/schemas/index.js';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(TeamEntity.name) private teamModel: Model<TeamEntity>,
    @InjectModel(UserEntity.name) private userModel: Model<UserEntity>,
  ) {}

  async getAll() {
    const teams = await this.teamModel.find().sort({ createdAt: -1 }).lean().exec();
    const allUsers = await this.userModel.find().lean().exec();
    const userMap = new Map(allUsers.map((u) => [u._id.toString(), u]));

    return teams.map((team) => {
      const members = (team.memberIds || [])
        .map((id) => userMap.get(id))
        .filter(Boolean)
        .map((u) => ({
          id: u!._id.toString(),
          _id: u!._id.toString(),
          name: u!.name,
          email: u!.email,
          role: u!.role,
          eidNumber: u!.eidNumber,
          department: u!.department,
          sparkBalance: u!.sparkBalance,
        }));

      return {
        id: team._id.toString(),
        _id: team._id.toString(),
        name: team.name,
        description: team.description || '',
        leadName: team.leadName || '',
        color: team.color || '#087FC4',
        memberIds: team.memberIds || [],
        members,
        memberCount: members.length,
      };
    });
  }

  async createTeam(data: { name: string; description?: string; leadName?: string; color?: string }) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Team name is required.');
    }
    const cleanName = data.name.trim();
    const existing = await this.teamModel.findOne({ name: cleanName });
    if (existing) {
      throw new BadRequestException(`Team "${cleanName}" already exists.`);
    }

    const created = await this.teamModel.create({
      name: cleanName,
      description: data.description?.trim() || '',
      leadName: data.leadName?.trim() || '',
      color: data.color || '#087FC4',
      memberIds: [],
    });

    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      name: created.name,
      description: created.description,
      leadName: created.leadName,
      color: created.color,
      memberIds: [],
      members: [],
      memberCount: 0,
    };
  }

  async deleteTeam(idOrName: string) {
    let team = null;
    if (Types.ObjectId.isValid(idOrName)) {
      team = await this.teamModel.findById(idOrName);
    }
    if (!team) {
      team = await this.teamModel.findOne({ name: idOrName });
    }
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    const teamName = team.name;
    const teamId = team._id;

    await this.teamModel.findByIdAndDelete(teamId);

    // Reset department for any user who was in this deleted team
    await this.userModel.updateMany({ department: teamName }, { department: '' });

    return { success: true, message: `Team "${teamName}" deleted successfully.` };
  }

  async addMember(teamId: string, userIdOrEmail: string) {
    let team = null;
    if (Types.ObjectId.isValid(teamId)) {
      team = await this.teamModel.findById(teamId);
    }
    if (!team) {
      team = await this.teamModel.findOne({ name: teamId });
    }
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    let user = null;
    if (Types.ObjectId.isValid(userIdOrEmail)) {
      user = await this.userModel.findById(userIdOrEmail);
    }
    if (!user) {
      user = await this.userModel.findOne({ email: userIdOrEmail.toLowerCase().trim() });
    }
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const uid = user._id.toString();

    if (!team.memberIds.includes(uid)) {
      team.memberIds.push(uid);
      await team.save();
    }

    user.department = team.name;
    await user.save();

    return this.getAll();
  }

  async removeMember(teamId: string, userIdOrEmail: string) {
    let team = null;
    if (Types.ObjectId.isValid(teamId)) {
      team = await this.teamModel.findById(teamId);
    }
    if (!team) {
      team = await this.teamModel.findOne({ name: teamId });
    }
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    let user = null;
    if (Types.ObjectId.isValid(userIdOrEmail)) {
      user = await this.userModel.findById(userIdOrEmail);
    }
    if (!user) {
      user = await this.userModel.findOne({ email: userIdOrEmail.toLowerCase().trim() });
    }

    const uid = user ? user._id.toString() : userIdOrEmail;

    team.memberIds = team.memberIds.filter((id) => id !== uid && (user ? id !== user.email : true));
    await team.save();

    if (user && user.department === team.name) {
      user.department = '';
      await user.save();
    }

    return this.getAll();
  }
}
