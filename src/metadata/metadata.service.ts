import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from './schemas/group.schema';
import { Speciality } from './schemas/speciality.schema';
import { Year } from './schemas/year.schema';

@Injectable()
export class MetadataService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(Speciality.name) private specialityModel: Model<Speciality>,
    @InjectModel(Year.name) private yearModel: Model<Year>,
  ) {}

  // Groups
  async getGroups(): Promise<Group[]> {
    return this.groupModel.find().exec();
  }

  async addGroup(name: string): Promise<Group> {
    const newGroup = new this.groupModel({ name });
    return newGroup.save();
  }

  async deleteGroup(id: string): Promise<void> {
    await this.groupModel.findByIdAndDelete(id).exec();
  }

  // Specialities
  async getSpecialities(): Promise<Speciality[]> {
    return this.specialityModel.find().exec();
  }

  async addSpeciality(name: string): Promise<Speciality> {
    const newSpec = new this.specialityModel({ name });
    return newSpec.save();
  }

  async deleteSpeciality(id: string): Promise<void> {
    await this.specialityModel.findByIdAndDelete(id).exec();
  }

  // Years
  async getYears(): Promise<Year[]> {
    return this.yearModel.find().exec();
  }

  async addYear(name: string): Promise<Year> {
    const newYear = new this.yearModel({ name });
    return newYear.save();
  }

  async deleteYear(id: string): Promise<void> {
    await this.yearModel.findByIdAndDelete(id).exec();
  }
}
