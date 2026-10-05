import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { HerdsService } from './herds.service';
import { CreateHerdDto } from './dto/create-herd.dto';
import { HerdEventDto } from './dto/herd-event.dto';

@ApiTags('herds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('herds')
export class HerdsController {
  constructor(private herds: HerdsService) {}

  @Get()
  findAll(@Query('unitId') unitId?: string) {
    return this.herds.findAll(unitId ? Number(unitId) : undefined);
  }

  @Post()
  @Roles('ADMIN_TONG', 'QL_DONVI', 'NHANVIEN')
  create(@Body() dto: CreateHerdDto) {
    return this.herds.create(dto);
  }

  @Post(':id/events')
  @Roles('ADMIN_TONG', 'QL_DONVI', 'NHANVIEN')
  addEvent(@Param('id', ParseIntPipe) id: number, @Body() dto: HerdEventDto, @Req() req: any) {
    return this.herds.addEvent(id, dto, req.user.userId);
  }
}
