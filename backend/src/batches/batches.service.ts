import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { IssueBatchDto } from './dto/issue-batch.dto';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { unitId?: number; status?: string }) {
    return this.prisma.batch.findMany({
      where: {
        deletedAt: null,
        unitId: params.unitId,
        status: params.status as any,
      },
      include: { product: true, unit: true },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async create(dto: CreateBatchDto, userId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Không tìm thấy loại rau.');

    const receivedAt = new Date(dto.receivedAt);
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(receivedAt.getTime() + product.shelfLifeDays * 86400000);

    const code = `R-${receivedAt.getFullYear()}${String(receivedAt.getMonth() + 1).padStart(2, '0')}-${Date.now() % 100000}`;

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          code,
          productId: dto.productId,
          unitId: dto.unitId,
          supplierId: dto.supplierId,
          grade: dto.grade,
          initialQty: dto.qty,
          currentQty: dto.qty,
          expectedLossPct: dto.expectedLossPct ?? 0,
          receivedAt,
          expiresAt,
          createdBy: userId,
        },
      });
      await tx.stockMovement.create({
        data: {
          batchId: batch.id,
          type: 'IN',
          qty: dto.qty,
          refType: 'RECEIPT',
          refId: batch.id,
          createdBy: userId,
        },
      });
      return batch;
    });
  }

  // Gợi ý FEFO: loại C trước, sau đó hạn dùng tăng dần (mục 2.3 SRS).
  async suggestFefo(productId: number, unitId?: number) {
    const batches = await this.prisma.batch.findMany({
      where: { productId, unitId, status: 'ACTIVE', deletedAt: null, currentQty: { gt: 0 } },
    });
    return batches.sort((a, b) => {
      if (a.grade === 'C' && b.grade !== 'C') return -1;
      if (b.grade === 'C' && a.grade !== 'C') return 1;
      return a.expiresAt.getTime() - b.expiresAt.getTime();
    });
  }

  // Xuất kho nguyên tử: cập nhật có điều kiện để tồn không bao giờ âm dù hai người xuất cùng lúc.
  async issue(dto: IssueBatchDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.batch.updateMany({
        where: { id: dto.batchId, currentQty: { gte: dto.qty }, status: 'ACTIVE' },
        data: { currentQty: { decrement: dto.qty } },
      });
      if (updated.count === 0) {
        throw new ConflictException('Tồn không đủ hoặc lô không còn hoạt động.');
      }
      const after = await tx.batch.findUnique({ where: { id: dto.batchId } });
      if (after && Number(after.currentQty) === 0) {
        await tx.batch.update({ where: { id: dto.batchId }, data: { status: 'EMPTY' } });
      }
      return tx.stockMovement.create({
        data: {
          batchId: dto.batchId,
          type: 'OUT',
          qty: dto.qty,
          reason: dto.note,
          createdBy: userId,
        },
      });
    });
  }

  async softDelete(id: number) {
    const hasMovement = await this.prisma.stockMovement.findFirst({ where: { batchId: id, type: 'OUT' } });
    if (hasMovement) {
      // BR-06: lô đã có giao dịch xuất thì không được xóa.
      throw new BadRequestException('Lô đã có phiếu xuất, không thể xóa.');
    }
    return this.prisma.batch.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
  }
}
