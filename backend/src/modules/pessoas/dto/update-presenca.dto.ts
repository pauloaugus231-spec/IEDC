import { IsBoolean } from 'class-validator';

export class UpdatePresencaDto {
  @IsBoolean({ message: 'Presença precisa ser verdadeira ou falsa.' })
  presente!: boolean;
}
