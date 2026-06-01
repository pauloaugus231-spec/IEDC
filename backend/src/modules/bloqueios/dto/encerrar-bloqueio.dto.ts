import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EncerrarBloqueioDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}
