import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreateHerdDto {
  @IsInt() speciesId: number;
  @IsInt() unitId: number;
  @IsInt() @IsPositive() headCount: number;
  @IsOptional() @IsNumber() avgWeightKg?: number;
  @IsDateString() startedAt: string;
}
