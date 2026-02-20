import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum MotivoSaidaDto {
  VOLUNTARIO = 'voluntario',
  AUTOMATICO = 'automatico',
  ABANDONO = 'abandono',
  TRANSFERENCIA = 'transferencia',
  ENCAMINHAMENTO = 'encaminhamento',
  DESCUMPRIMENTO = 'descumprimento',
  OUTRO = 'outro',
}

export class CreateCheckoutDto {
  @IsUUID()
  pessoa_id!: string;

  @IsString()
  @IsOptional()
  funcionario?: string;

  @IsString()
  @IsOptional()
  observacoes_checkout?: string;

  @IsEnum(MotivoSaidaDto)
  @IsOptional()
  motivo_saida?: MotivoSaidaDto;
}
