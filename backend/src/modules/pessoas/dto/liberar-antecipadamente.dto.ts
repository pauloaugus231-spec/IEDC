import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LiberarAntecipadamenteDto {
  @ApiProperty({ description: 'Motivo da liberação antecipada', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
