import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

/**
 * Điều chuyển đi qua các bước PROPOSED -> APPROVED -> IN_TRANSIT -> RECEIVED (BR-03, BR-04).
 * Tồn chỉ thay đổi lúc dispatch (trừ ở đơn vị gửi) và lúc receive (cộng ở đơn vị nhận);
 * ở trạng thái IN_TRANSIT hàng không tính vào tồn của bên nào.
 */
@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  findAll(unitId?: number) {
    return this.prisma.transfer.findMany({
      where: unitId ? { OR: [{ fromUnitId: unitId }, { toUnitId: unitId }] } : undefined,
      include: { items: true, fromUnit: true, toUnit: true },
      orderBy: { id: 'desc' },
    });
  }

  async propose(dto: CreateTransferDto, userId: number) {
    if (dto.fromUnitId === dto.toUnitId) {
      throw new BadRequestException('Đơn vị gửi và nhận phải khác nhau.');
    }
    const code = `T-${Date.now() % 1000000}`;
    return this.prisma.transfer.create({
      data: {
        code,
        fromUnitId: dto.fromUnitId,
        toUnitId: dto.toUnitId,
        requestedBy: userId,
        items: {
          create: {
            itemType: dto.itemType as any,
            batchId: dto.itemType === 'BATCH' ? dto.itemId : undefined,
            herdId: dto.itemType === 'HERD' ? dto.itemId : undefined,
            qty: dto.qty,
          },
        },
      },
      include: { items: true },
    });
  }

  approve(id: number, userId: number) {
    return this.prisma.transfer.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId },
    });
  }

  reject(id: number, userId: number) {
    return this.prisma.transfer.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy: userId },
    });
  }

  // Xuất đi: trừ tồn ở đơn vị gửi, nguyên tử theo từng dòng.
  async dispatch(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({ where: { id }, include: { items: true } });
      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu điều chuyển.');
      if (transfer.status !== 'APPROVED') throw new BadRequestException('Chỉ xuất đi khi đã được duyệt.');

      for (const item of transfer.items) {
        if (item.itemType === 'BATCH' && item.batchId) {
          const r = await tx.batch.updateMany({
            where: { id: item.batchId, currentQty: { gte: item.qty } },
            data: { currentQty: { decrement: item.qty } },
          });
          if (r.count === 0) throw new ConflictException('Tồn rau không đủ để xuất đi.');
          await tx.stockMovement.create({
            data: { batchId: item.batchId, type: 'TRANSFER_OUT', qty: item.qty, refType: 'TRANSFER', refId: id },
          });
        }
        if (item.itemType === 'HERD' && item.herdId) {
  const herd = await tx.herd.findUnique({ where: { id: item.herdId } });
  if (!herd) throw new NotFoundException('Không tìm thấy đàn.');
  const heads = Number(item.qty);
  if (herd.headCount < heads) throw new ConflictException('Số con không đủ để chuyển đi.');
  await tx.herd.update({ where: { id: item.herdId }, data: { headCount: { decrement: heads } } });
  await tx.livestockEvent.create({
    data: { herdId: item.herdId, type: 'TRANSFER_OUT', headsDelta: -heads, refType: 'TRANSFER', refId: id },
  });
}
        // if (item.itemType === 'HERD' && item.herdId) {
        //   const herd = await tx.herd.findUnique({ where: { id: item.herdId } });
        //   if (!herd || herd.headCount < item.qty) throw new ConflictException('Số con không đủ để chuyển đi.');
        //   await tx.herd.update({ where: { id: item.herdId }, data: { headCount: { decrement: item.qty } } });
        //   await tx.livestockEvent.create({
        //     data: { herdId: item.herdId, type: 'TRANSFER_OUT', headsDelta: -item.qty, refType: 'TRANSFER', refId: id },
        //   });
        // }
      }
      return tx.transfer.update({ where: { id }, data: { status: 'IN_TRANSIT', dispatchedAt: new Date() } });
    });
  }

  // Xác nhận đã nhận: cộng tồn ở đơn vị nhận.
  async receive(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({ where: { id }, include: { items: true } });
      if (!transfer) throw new NotFoundException('Không tìm thấy phiếu điều chuyển.');
      if (transfer.status !== 'IN_TRANSIT') throw new BadRequestException('Chỉ nhận khi đang trong trạng thái đang chuyển.');

      for (const item of transfer.items) {
        if (item.itemType === 'BATCH' && item.batchId) {
          const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
          if (!batch) throw new NotFoundException('Không tìm thấy lô rau gốc.');
          // Tạo lô mới tại đơn vị nhận để giữ đúng FEFO và nguồn gốc lô.
          const newBatch = await tx.batch.create({
            data: {
              code: `${batch.code}-T${id}`,
              productId: batch.productId,
              unitId: transfer.toUnitId,
              grade: batch.grade,
              initialQty: item.qty,
              currentQty: item.qty,
              receivedAt: new Date(),
              expiresAt: batch.expiresAt,
            },
          });
          await tx.stockMovement.create({
            data: { batchId: newBatch.id, type: 'TRANSFER_IN', qty: item.qty, refType: 'TRANSFER', refId: id },
          });
        }
        if (item.itemType === 'HERD' && item.herdId) {
          // Trong bản đầy đủ: tìm hoặc tạo đàn tương ứng loài tại đơn vị nhận rồi cộng dồn.
          await tx.livestockEvent.create({
            data: { herdId: item.herdId, type: 'TRANSFER_IN', headsDelta:Number(item.qty), refType: 'TRANSFER', refId: id },
          });
        }
      }
      return tx.transfer.update({ where: { id }, data: { status: 'RECEIVED', receivedAt: new Date() } });
    });
  }

  cancel(id: number) {
    return this.prisma.transfer.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
