import { IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean, IsUUID, IsString } from 'class-validator';
import { TipoProntuario, StatusProntuario } from '../../../entities/prontuario.entity';

export class CreateProntuarioDto {
  @IsNotEmpty()
  @IsUUID()
  pessoa_id!: string;

  @IsEnum(TipoProntuario)
  @IsOptional()
  tipo?: TipoProntuario;

  @IsEnum(StatusProntuario)
  @IsOptional()
  status?: StatusProntuario;

  @IsOptional()
  data_atendimento?: Date;

  @IsArray()
  @IsOptional()
  equipe?: string[];

  @IsString()
  @IsOptional()
  profissional_responsavel?: string;

  @IsNotEmpty()
  @IsString()
  titulo!: string;

  @IsOptional()
  conteudo?: any;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsBoolean()
  @IsOptional()
  criado_automaticamente?: boolean;

  @IsString()
  @IsOptional()
  modulo_origem?: string;

  @IsUUID()
  @IsOptional()
  referencia_externa?: string;

  @IsString()
  @IsOptional()
  created_by?: string;
}
