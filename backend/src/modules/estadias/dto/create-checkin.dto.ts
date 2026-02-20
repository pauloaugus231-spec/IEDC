import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateCheckinDto {
  @IsNotEmpty({ message: 'O ID da pessoa é obrigatório.' })
  @IsUUID('4', { message: 'O ID da pessoa deve ser um UUID válido.' })
  pessoa_id!: string;

  @IsNotEmpty({ message: 'O ID da cama é obrigatório.' })
  @IsUUID('4', { message: 'O ID da cama deve ser um UUID válido.' })
  cama_id!: string;

  @IsOptional()
  @IsString()
  funcionario?: string;
}
