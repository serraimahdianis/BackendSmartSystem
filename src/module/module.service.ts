import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AcademicModule, ModuleDocument } from './schemas/module.schema';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModuleService {
  constructor(
    @InjectModel(AcademicModule.name)
    private moduleModel: Model<ModuleDocument>,
  ) {}

  async create(createModuleDto: CreateModuleDto): Promise<AcademicModule> {
    const createdModule = new this.moduleModel(createModuleDto);
    return createdModule.save();
  }

  async findAll(): Promise<AcademicModule[]> {
    return this.moduleModel
      .find()
      .populate('teacherId', 'fullName email')
      .exec();
  }

  async findOne(id: string): Promise<AcademicModule> {
    const module = await this.moduleModel
      .findById(id)
      .populate('teacherId', 'fullName email')
      .exec();
    if (!module) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    return module;
  }

  async findByTeacher(teacherId: string): Promise<AcademicModule[]> {
    return this.moduleModel
      .find({ teacherId })
      .populate('teacherId', 'fullName email')
      .exec();
  }

  async update(
    id: string,
    updateModuleDto: UpdateModuleDto,
  ): Promise<AcademicModule> {
    const updatedModule = await this.moduleModel
      .findByIdAndUpdate(id, updateModuleDto, { new: true })
      .exec();
    if (!updatedModule) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    return updatedModule;
  }

  async remove(id: string): Promise<void> {
    const result = await this.moduleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
  }
}
