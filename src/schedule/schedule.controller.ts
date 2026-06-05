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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create a new schedule entry' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.scheduleService.create(createScheduleDto);
  }

  @Get()
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get all schedules. Students only see schedules matching their year/group/speciality.' })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: { user: { userId: string; role: string } },
  ) {
    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);

    if (req?.user?.role === 'student') {
      return this.scheduleService.findForStudent(req.user.userId, page, limit);
    }

    return this.scheduleService.findAll(page, limit);
  }

  @Get('teacher/:teacherId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get all schedules for a teacher' })
  @ApiResponse({ status: 200, description: 'Schedules for the given teacher' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);
    return this.scheduleService.findByTeacher(teacherId, page, limit);
  }

  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get a schedule by ID' })
  @ApiResponse({ status: 200, description: 'Schedule found' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update a schedule entry' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    return this.scheduleService.update(
      id,
      updateScheduleDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete a schedule entry' })
  @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  remove(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    return this.scheduleService.remove(id, req.user.userId, req.user.role);
  }
}
