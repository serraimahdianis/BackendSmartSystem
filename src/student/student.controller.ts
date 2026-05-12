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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Student } from './schemas/student.schema';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary:
      'Register a new student (Admin only — password auto-generated from birthday)',
  })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentService.create(createStudentDto);
  }

  @Get()
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get students (Teachers only see their assigned students)',
  })
  @ApiResponse({ status: 200, description: 'List of students' })
  @ApiQuery({ name: 'group', required: false, example: '2A' })
  @ApiQuery({ name: 'year', required: false, example: 'L2' })
  async findAll(
    @Query('group') group?: string,
    @Query('year') year?: string,
    @Request() req?: { user: { userId: string; role: string } },
  ) {
    let students: Student[];

    // 1. Get base list of students
    if (req?.user?.role === 'teacher') {
      students = await this.studentService.findForTeacher(req.user.userId);
    } else {
      students = await this.studentService.findAll();
    }

    // 2. Apply query filters if provided
    if (year) {
      students = students.filter((s) => s.year === year);
    }
    if (group) {
      students = students.filter((s) => s.group === group);
    }

    return students;
  }

  @Get('rfid/:rfidCode')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Find student by RFID code' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findByRfid(
    @Param('rfidCode') rfidCode: string,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    if (req.user.role === 'teacher') {
      const allowed = await this.studentService.isRfidAssignedToTeacher(
        rfidCode,
        req.user.userId,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'You do not have permission to access this student.',
        );
      }
    }
    return this.studentService.findByRfid(rfidCode);
  }

  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    if (req.user.role === 'teacher') {
      const allowed = await this.studentService.isAssignedToTeacher(
        id,
        req.user.userId,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'You do not have permission to access this student.',
        );
      }
    }
    return this.studentService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a student (Admin only)' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a student (Admin only)' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  remove(@Param('id') id: string) {
    return this.studentService.remove(id);
  }
}
