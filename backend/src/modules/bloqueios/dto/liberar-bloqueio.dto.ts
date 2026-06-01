import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LiberarBloqueioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  liberado_por!: string;
}
