import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LiberarAntecipadamenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  funcionario?: string;
}
