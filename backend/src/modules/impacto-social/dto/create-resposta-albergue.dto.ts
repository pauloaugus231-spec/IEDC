import { IsArray, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRespostaAlbergueDto {
  @IsOptional()
  @IsDateString()
  dataReferencia?: string;

  @IsOptional()
  @IsDateString()
  data_referencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  situacaoTerritorial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tempoSemMoradia?: string;

  @IsOptional()
  @IsArray()
  fatoresSemMoradia?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fatoresSemMoradiaOutro?: string;

  @IsOptional()
  @IsArray()
  ajudaPrincipal?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ajudaPrincipalOutro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  respeitoUsuarios?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  comunicacaoEquipe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  proximoPassoAjuda?: string;

  @IsOptional()
  @IsArray()
  proximosPassos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proximoPassoOutro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  participouOficina?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  relatoRepresenta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  melhoriaSugerida?: string;

  @IsOptional()
  @IsArray()
  demandasEquipe?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  demandaOutro?: string;

  @IsOptional()
  @IsArray()
  acaoEquipe?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  preenchidoPor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  perfilPreenchedor?: string;
}
