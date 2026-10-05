import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { assertUnitScope } from '../common/unit-scope';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { IssueBatchDto } from './dto/issue-batch.dto';

@ApiTags('batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('batches')
export class BatchesController {
  constructor(private batches: BatchesService) {}

  @Get()
  findAll(@Query('unitId') unitId?: string, @Query('status') status?: string) {
    return this.batches.findAll({ unitId: unitId ? Number(unitId) : undefined, status });
  }

  @Get('suggest')
  suggest(@Query('productId', ParseIntPipe) productId: number, @Query('unitId') unitId?: string) {
    return this.batches.suggestFefo(productId, unitId ? Number(unitId) : undefined);
  }

  @Post()
  @Roles('ADMIN_TONG', 'QL_DONVI', 'NHANVIEN')
  create(@Body() dto: CreateBatchDto, @Req() req: any) {
    assertUnitScope(req.user, dto.unitId);
    return this.batches.create(dto, req.user.userId);
  }

  @Post('issue')
  @Roles('ADMIN_TONG', 'QL_DONVI', 'NHANVIEN')
  issue(@Body() dto: IssueBatchDto, @Req() req: any) {
    // Lưu ý: trong bản đầy đủ, nên kiểm tra batch.unitId khớp đơn vị người dùng trước khi xuất.
    return this.batches.issue(dto, req.user.userId);
  }

  @Delete(':id')
  @Roles('ADMIN_TONG', 'QL_DONVI')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.batches.softDelete(id);
  }
}
