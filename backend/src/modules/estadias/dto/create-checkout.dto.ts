import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MotivoSaidaDto {
  VOLUNTARIO     = 'voluntario',
  AUTOMATICO     = 'automatico',
  ABANDONO       = 'abandono',
  TRANSFERENCIA  = 'transferencia',
  ENCAMINHAMENTO = 'encaminhamento',
  DESCUMPRIMENTO = 'descumprimento',
  OUTRO          = 'outro',
}

export class CreateCheckoutDto {
  @ApiProperty({ description: 'ID da pessoa' })
  @IsUUID()
  pessoa_id!: string;

  @ApiProperty({ description: 'Observações sobre a saída', required: false })
  @IsString()
  @IsOptional()
  observacoes_checkout?: string;

  @ApiProperty({ description: 'Motivo da saída', required: false, enum: MotivoSaidaDto })
  @IsEnum(MotivoSaidaDto)
  @IsOptional()
  motivo_saida?: MotivoSaidaDto;
}
