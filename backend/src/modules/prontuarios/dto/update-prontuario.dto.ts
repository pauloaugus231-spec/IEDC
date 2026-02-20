import { IsOptional, IsEnum, IsArray, IsString } from 'class-validator';
import { TipoProntuario, StatusProntuario } from '../../../entities/prontuario.entity';

export class UpdateProntuarioDto {
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

  @IsString()
  @IsOptional()
  titulo?: string;

  @IsOptional()
  conteudo?: any;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsString()
  @IsOptional()
  updated_by?: string;
}
