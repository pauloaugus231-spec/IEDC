import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { StatusEscala, TurnoEscala } from '../../../entities/escala.entity';

export class GerarEscalaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  ano!: number;
}

export class GerarEscalaAutomaticaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(7)
  mes_ano!: string;
}

export class EscalaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  funcao!: string;

  @IsEnum(TurnoEscala)
  turno!: TurnoEscala;

  @Type(() => Date)
  @IsDate()
  data_inicio!: Date;

  @Type(() => Date)
  @IsDate()
  data_fim!: Date;

  @IsEnum(StatusEscala)
  status!: StatusEscala;
}

export class UpdateEscalaDto extends PartialType(EscalaDto) {}
