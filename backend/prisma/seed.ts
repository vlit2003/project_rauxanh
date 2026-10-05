import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all(
    [
      { code: 'ADMIN_TONG' as const, name: 'Quản lý tổng' },
      { code: 'QL_DONVI' as const, name: 'Quản lý đơn vị' },
      { code: 'NHANVIEN' as const, name: 'Nhân viên' },
      { code: 'KIEMTRA' as const, name: 'Kiểm tra' },
    ].map((r) => prisma.role.upsert({ where: { code: r.code }, update: {}, create: r })),
  );
  const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r]));

  const units = await Promise.all(
    [1, 2, 3].map((n) =>
      prisma.unit.upsert({
        where: { code: `TD${n}` },
        update: {},
        create: { code: `TD${n}`, name: `Tiểu đoàn ${n}` },
      }),
    ),
  );

  const passHash = await argon2.hash('123456');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: passHash,
      fullName: 'Chủ nhiệm Hậu cần - Kỹ thuật',
      roleId: roleByCode.ADMIN_TONG.id,
    },
  });
  for (const [i, u] of units.entries()) {
    await prisma.user.upsert({
      where: { username: `d${i + 1}` },
      update: {},
      create: {
        username: `d${i + 1}`,
        passwordHash: passHash,
        fullName: `Trợ lý Hậu cần - Tiểu đoàn ${i + 1}`,
        roleId: roleByCode.QL_DONVI.id,
        unitId: u.id,
      },
    });
  }

  const group = await prisma.productGroup.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Rau ăn lá' },
  });
  const products = await Promise.all(
    [
      { code: 'RAUMUONG', name: 'Rau muống', shelfLifeDays: 3 },
      { code: 'CAINGOT', name: 'Cải ngọt', shelfLifeDays: 2 },
      { code: 'BAPCAI', name: 'Bắp cải', shelfLifeDays: 10 },
    ].map((p) =>
      prisma.product.upsert({
        where: { code: p.code },
        update: {},
        create: { ...p, groupId: group.id, unitOfMeasure: 'kg' },
      }),
    ),
  );

  const species = await prisma.species.upsert({
    where: { code: 'LON' },
    update: {},
    create: { code: 'LON', name: 'Lợn' },
  });

  await prisma.batch.create({
    data: {
      code: `R-SEED-${Date.now() % 100000}`,
      productId: products[0].id,
      unitId: units[0].id,
      grade: 'A',
      initialQty: 120,
      currentQty: 120,
      receivedAt: new Date(),
      expiresAt: new Date(Date.now() + 3 * 86400000),
    },
  });

  await prisma.herd.create({
    data: {
      code: `D-SEED-${Date.now() % 100000}`,
      speciesId: species.id,
      unitId: units[0].id,
      headCount: 40,
      avgWeightKg: 65,
      startedAt: new Date(),
    },
  });

  console.log('Đã nạp dữ liệu mẫu. Tài khoản: admin / d1 / d2 / d3, mật khẩu 123456.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
