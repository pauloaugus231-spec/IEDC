import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProrrogacaoDto {
  @ApiProperty({ description: 'Número de dias para prorrogar' })
  @IsNumber()
  @Min(1)
  dias!: number;

  @ApiProperty({ description: 'Motivo da prorrogação', required: false })
  @IsOptional()
  @IsString()
  motivo?: string;
}
