import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AcademicModule, ModuleDocument } from './schemas/module.schema';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<AcademicModule>> {
    const total = await this.moduleModel.countDocuments().exec();
    const data = await this.moduleModel
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<AcademicModule> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    const module = await this.moduleModel
      .findById(id)
      .exec();
    if (!module) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    return module;
  }

  async update(
    id: string,
    updateModuleDto: UpdateModuleDto,
  ): Promise<AcademicModule> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    const updatedModule = await this.moduleModel
      .findByIdAndUpdate(id, updateModuleDto, { returnDocument: 'after' })
      .exec();
    if (!updatedModule) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    return updatedModule;
  }

  async remove(id: string): Promise<void> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    const result = await this.moduleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
  }
}
