import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { TipoEstadia } from '../../../entities/estadia.entity';

export class CreateCheckinDto {
  @IsNotEmpty({ message: 'O ID da pessoa é obrigatório.' })
  @IsUUID('4', { message: 'O ID da pessoa deve ser um UUID válido.' })
  pessoa_id!: string;

  @IsNotEmpty({ message: 'O ID da cama é obrigatório.' })
  @IsUUID('4', { message: 'O ID da cama deve ser um UUID válido.' })
  cama_id!: string;

  @IsOptional()
  @IsEnum(TipoEstadia)
  tipo_estadia?: TipoEstadia;

  @IsOptional()
  @IsString()
  funcionario?: string;
}
