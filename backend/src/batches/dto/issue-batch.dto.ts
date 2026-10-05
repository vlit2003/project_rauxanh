import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class IssueBatchDto {
  @IsInt() batchId: number;
  @IsNumber() @IsPositive() qty: number;
  @IsOptional() @IsString() note?: string;
}
