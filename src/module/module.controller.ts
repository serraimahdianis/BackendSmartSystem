import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModuleService } from './module.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('modules')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create a new academic module' })
  @ApiResponse({ status: 201, description: 'Module created successfully' })
  create(@Body() createModuleDto: CreateModuleDto) {
    return this.moduleService.create(createModuleDto);
  }

  @Get()
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get all modules (with teacher info)' })
  @ApiResponse({ status: 200, description: 'List of all modules' })
  findAll() {
    return this.moduleService.findAll();
  }

  @Get('teacher/:teacherId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get all modules by teacher ID' })
  @ApiResponse({ status: 200, description: 'Modules for the given teacher' })
  findByTeacher(@Param('teacherId') teacherId: string) {
    return this.moduleService.findByTeacher(teacherId);
  }

  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get a module by ID' })
  @ApiResponse({ status: 200, description: 'Module found' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  findOne(@Param('id') id: string) {
    return this.moduleService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update a module' })
  @ApiResponse({ status: 200, description: 'Module updated successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  update(@Param('id') id: string, @Body() updateModuleDto: UpdateModuleDto) {
    return this.moduleService.update(id, updateModuleDto);
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete a module' })
  @ApiResponse({ status: 200, description: 'Module deleted successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  remove(@Param('id') id: string) {
    return this.moduleService.remove(id);
  }
}
