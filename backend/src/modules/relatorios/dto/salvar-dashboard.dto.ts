import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class SalvarDashboardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome!: string;

  @IsObject()
  config!: Record<string, unknown>;
}
