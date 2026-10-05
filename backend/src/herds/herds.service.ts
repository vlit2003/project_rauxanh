import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHerdDto } from './dto/create-herd.dto';
import { HerdEventDto } from './dto/herd-event.dto';

@Injectable()
export class HerdsService {
  constructor(private prisma: PrismaService) {}

  findAll(unitId?: number) {
    return this.prisma.herd.findMany({
      where: { deletedAt: null, unitId },
      include: { species: true, unit: true },
      orderBy: { id: 'asc' },
    });
  }

  create(dto: CreateHerdDto) {
    const code = `D-${Date.now() % 1000000}`;
    return this.prisma.herd.create({
      data: {
        code,
        speciesId: dto.speciesId,
        unitId: dto.unitId,
        headCount: dto.headCount,
        avgWeightKg: dto.avgWeightKg ?? 0,
        startedAt: new Date(dto.startedAt),
      },
    });
  }

  // Ghi sự kiện và cập nhật số con nguyên tử; chặn số con âm (tương tự BR-01 cho rau).
  async addEvent(herdId: number, dto: HerdEventDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const herd = await tx.herd.findUnique({ where: { id: herdId } });
      if (!herd) throw new NotFoundException('Không tìm thấy đàn.');

      const newCount = herd.headCount + dto.headsDelta;
      if (newCount < 0) throw new BadRequestException('Số con sau cập nhật không được âm.');

      await tx.herd.update({
        where: { id: herdId },
        data: {
          headCount: newCount,
          avgWeightKg: dto.weightKg ?? herd.avgWeightKg,
        },
      });
      return tx.livestockEvent.create({
        data: {
          herdId,
          type: dto.type as any,
          headsDelta: dto.headsDelta,
          weightKg: dto.weightKg,
          reason: dto.reason,
          createdBy: userId,
        },
      });
    });
  }
}
