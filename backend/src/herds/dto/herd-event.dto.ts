import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class HerdEventDto {
  @IsIn(['BUY', 'BIRTH', 'DEATH', 'SICK', 'SELL', 'WEIGHT'])
  type: string;

  @IsInt() headsDelta: number; // âm khi giảm (chết, bán), dương khi tăng (mua, sinh)

  @IsOptional() @IsNumber() weightKg?: number;
  @IsOptional() @IsString() reason?: string;
}
