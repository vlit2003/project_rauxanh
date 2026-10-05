import { ForbiddenException } from '@nestjs/common';

/**
 * Chặn người dùng thao tác dữ liệu ngoài đơn vị của mình.
 * ADMIN_TONG và KIEMTRA xem được mọi đơn vị; các vai trò khác chỉ đơn vị mình (BR-02).
 */
export function assertUnitScope(user: { roleCode: string; unitId: number | null }, targetUnitId: number) {
  if (user.roleCode === 'ADMIN_TONG' || user.roleCode === 'KIEMTRA') return;
  if (user.unitId !== targetUnitId) {
    throw new ForbiddenException('Bạn chỉ được thao tác dữ liệu của đơn vị mình.');
  }
}
