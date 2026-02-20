import { IsDateString, IsNotEmpty } from 'class-validator';

export class UploadRmaDto {
  @IsNotEmpty({ message: 'Data de início é obrigatória' })
  @IsDateString({}, { message: 'Data de início inválida' })
  dataInicio!: string;

  @IsNotEmpty({ message: 'Data de fim é obrigatória' })
  @IsDateString({}, { message: 'Data de fim inválida' })
  dataFim!: string;
}
