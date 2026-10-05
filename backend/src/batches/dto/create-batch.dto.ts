import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreateBatchDto {
  @IsInt() productId: number;
  @IsInt() unitId: number;
  @IsOptional() @IsInt() supplierId?: number;

  @IsIn(['A', 'B', 'C']) grade: string;

  @IsNumber() @IsPositive() qty: number;

  @IsOptional() @IsNumber() expectedLossPct?: number;

  @IsDateString() receivedAt: string;

  // Nếu không truyền, hệ thống tự tính = receivedAt + Product.shelfLifeDays (BR-03).
  @IsOptional() @IsDateString() expiresAt?: string;
}
