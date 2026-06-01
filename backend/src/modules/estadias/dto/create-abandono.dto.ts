import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAbandonoDto {
  @IsUUID('4', { message: 'O ID da pessoa deve ser um UUID válido.' })
  pessoa_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  funcionario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}
