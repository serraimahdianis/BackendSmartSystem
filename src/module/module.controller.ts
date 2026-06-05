import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
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
  @ApiOperation({
    summary: 'Create a new academic module',
    description:
      'Creates a new academic module/subject. Requires admin or teacher role.',
  })
  @ApiCreatedResponse({
    description: 'Module created successfully',
    type: CreateModuleDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data (e.g., invalid teacher ID format)',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (admin or teacher)',
  })
  @ApiBody({ type: CreateModuleDto })
  create(@Body() createModuleDto: CreateModuleDto) {
    return this.moduleService.create(createModuleDto);
  }

  @Get()
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({
    summary: 'Get all modules',
    description:
      'Retrieves a list of all academic modules. Accessible by all authenticated users.',
  })
  @ApiOkResponse({
    description: 'List of all modules retrieved successfully',
    type: [CreateModuleDto],
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);
    return this.moduleService.findAll(page, limit);
  }

  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({
    summary: 'Get a module by ID',
    description:
      'Retrieves a single academic module by its MongoDB ObjectId. Accessible by all authenticated users.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the module',
    example: '60d5ec49f1b2c72b9c8e4a1a',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Module found and retrieved successfully',
    type: CreateModuleDto,
  })
  @ApiNotFoundResponse({
    description: 'Module not found (invalid ID or module does not exist)',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid module ID format (must be a valid 24-character hex string)',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role',
  })
  findOne(@Param('id') id: string) {
    return this.moduleService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Update a module',
    description:
      'Updates an existing academic module by its ID. Only provided fields will be updated. Requires admin or teacher role.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the module to update',
    example: '60d5ec49f1b2c72b9c8e4a1a',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Module updated successfully',
    type: CreateModuleDto,
  })
  @ApiNotFoundResponse({
    description: 'Module not found (invalid ID or module does not exist)',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or module ID format',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (admin or teacher)',
  })
  @ApiBody({ type: UpdateModuleDto })
  update(@Param('id') id: string, @Body() updateModuleDto: UpdateModuleDto) {
    return this.moduleService.update(id, updateModuleDto);
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Delete a module',
    description:
      'Permanently deletes an academic module by its ID. This action cannot be undone. Requires admin or teacher role.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the module to delete',
    example: '60d5ec49f1b2c72b9c8e4a1a',
    type: 'string',
  })
  @ApiOkResponse({ description: 'Module deleted successfully' })
  @ApiNotFoundResponse({
    description: 'Module not found (invalid ID or module does not exist)',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid module ID format (must be a valid 24-character hex string)',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (admin or teacher)',
  })
  remove(@Param('id') id: string) {
    return this.moduleService.remove(id);
  }
}
