import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateTransferDto {
  @IsInt() fromUnitId: number;
  @IsInt() toUnitId: number;
  @IsIn(['BATCH', 'HERD']) itemType: string;
  @IsInt() itemId: number; // batchId hoặc herdId tùy itemType
  @IsNumber() @IsPositive() qty: number;
  @IsOptional() @IsString() note?: string;
}
