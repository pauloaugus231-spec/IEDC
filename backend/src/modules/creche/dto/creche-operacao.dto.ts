import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ProfessoraDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  funcao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class AtualizarTurmaProfessoraDto {
  @IsOptional()
  @IsUUID('4')
  professoraId?: string | null;
}

export class ResponsavelCriancaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  parentesco!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  telefone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  rg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefoneAlternativo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  endereco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  trabalho?: string;

  @IsOptional()
  @IsBoolean()
  responsavelPrincipal?: boolean;

  @IsOptional()
  @IsBoolean()
  autorizadoRetirada?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class CriarCriancaDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cpf!: string;

  @IsDateString()
  dataNascimento!: string;

  @IsUUID('4')
  turmaId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResponsavelCriancaDto)
  responsavel?: ResponsavelCriancaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponsavelCriancaDto)
  responsaveis?: ResponsavelCriancaDto[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  rg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nis?: string;

  @IsOptional()
  @IsDateString()
  dataIngresso?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sexo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  genero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  racaCor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  naturalidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  endereco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  escolaOrigem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  alergias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  condicoesSaude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medicamentos?: string;

  @IsOptional()
  @IsBoolean()
  autorizacaoImagem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class AtualizarCriancaTurmaDto {
  @IsUUID('4')
  turmaId!: string;
}

export class CriarAcompanhamentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsavel?: string;

  @IsOptional()
  @IsDateString()
  data?: string;
}

export class RegistroFrequenciaDto {
  @IsUUID('4')
  criancaId!: string;

  @IsBoolean()
  presente!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  justificativa?: string;
}

export class SalvarFrequenciaTurmaDto {
  @IsUUID('4')
  turmaId!: string;

  @IsDateString()
  data!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistroFrequenciaDto)
  registros!: RegistroFrequenciaDto[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  registradoPor?: string;
}
