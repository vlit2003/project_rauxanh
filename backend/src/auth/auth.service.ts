import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;
// Khóa tạm trong bộ nhớ theo username. Triển khai nhiều instance nên chuyển sang Redis.
const attempts = new Map<string, { count: number; lockUntil: number }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const rec = attempts.get(username);
    if (rec && rec.lockUntil > Date.now()) {
      const sec = Math.ceil((rec.lockUntil - Date.now()) / 1000);
      throw new UnauthorizedException(`Tài khoản tạm khóa, thử lại sau ${sec} giây.`);
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true, unit: true },
    });

    const ok = user && user.isActive && (await argon2.verify(user.passwordHash, password));
    if (!ok) {
      const next = rec ? rec.count + 1 : 1;
      attempts.set(username, {
        count: next,
        lockUntil: next >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0,
      });
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng.');
    }
    attempts.delete(username);

    const payload = {
      sub: user.id,
      username: user.username,
      roleCode: user.role.code,
      unitId: user.unitId,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.code,
        unit: user.unit ? { id: user.unit.id, name: user.unit.name } : null,
      },
    };
  }
}
