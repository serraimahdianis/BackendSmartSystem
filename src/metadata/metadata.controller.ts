import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('groups')
  getGroups() {
    return this.metadataService.getGroups();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('groups')
  addGroup(@Body('name') name: string) {
    return this.metadataService.addGroup(name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.metadataService.deleteGroup(id);
  }

  @Get('specialities')
  getSpecialities() {
    return this.metadataService.getSpecialities();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('specialities')
  addSpeciality(@Body('name') name: string) {
    return this.metadataService.addSpeciality(name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('specialities/:id')
  deleteSpeciality(@Param('id') id: string) {
    return this.metadataService.deleteSpeciality(id);
  }

  @Get('years')
  getYears() {
    return this.metadataService.getYears();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('years')
  addYear(@Body('name') name: string) {
    return this.metadataService.addYear(name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('years/:id')
  deleteYear(@Param('id') id: string) {
    return this.metadataService.deleteYear(id);
  }
}
