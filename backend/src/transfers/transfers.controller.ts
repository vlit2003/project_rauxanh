import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private transfers: TransfersService) {}

  @Get()
  findAll(@Query('unitId') unitId?: string) {
    return this.transfers.findAll(unitId ? Number(unitId) : undefined);
  }

  @Post()
  @Roles('ADMIN_TONG', 'QL_DONVI')
  propose(@Body() dto: CreateTransferDto, @Req() req: any) {
    return this.transfers.propose(dto, req.user.userId);
  }

  @Patch(':id/approve')
  @Roles('ADMIN_TONG')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.transfers.approve(id, req.user.userId);
  }

  @Patch(':id/reject')
  @Roles('ADMIN_TONG')
  reject(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.transfers.reject(id, req.user.userId);
  }

  @Patch(':id/dispatch')
  @Roles('ADMIN_TONG', 'QL_DONVI')
  dispatch(@Param('id', ParseIntPipe) id: number) {
    return this.transfers.dispatch(id);
  }

  @Patch(':id/receive')
  @Roles('ADMIN_TONG', 'QL_DONVI')
  receive(@Param('id', ParseIntPipe) id: number) {
    return this.transfers.receive(id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN_TONG', 'QL_DONVI')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.transfers.cancel(id);
  }
}
