import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LojaScopedDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lojaSlug?: string;

  @IsOptional()
  @IsUUID('4')
  lojaId?: string;
}

export class ProdutoDto extends LojaScopedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  preco!: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  lojaSlugPermitido?: string;
}

export class ClienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

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
  @MaxLength(20)
  dataNascimento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class CriarComandaDto {
  @IsOptional()
  @IsUUID('4')
  clienteId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ClienteDto)
  cliente?: ClienteDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  criadaPor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  usuario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class AdicionarItemDto extends LojaScopedDto {
  @IsOptional()
  @IsUUID('4')
  produtoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantidade?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  valorUnitario?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  preco?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  desconto?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  usuario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lancadoPor?: string;
}

export class PagamentoItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  metodo!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  valor!: number;
}

export class RegistrarPagamentoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagamentoItemDto)
  pagamentos!: PagamentoItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recebidoPor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  usuario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class AtualizarStatusComandaDto {
  @IsString()
  @IsIn(['desistencia', 'cancelada', 'expirada', 'aguardando_pagamento', 'aberta'])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  usuario?: string;
}

export class ConfirmarRetiradaDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entreguePor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  usuario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;

  lojaSlugPermitido?: string;
}

export class AbrirCaixaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  saldoInicial?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  abertoPor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class CaixaMetodoConferenciaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  metodo!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorInformado!: number;
}

export class FecharCaixaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaixaMetodoConferenciaDto)
  metodos!: CaixaMetodoConferenciaDto[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fechadoPor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}
