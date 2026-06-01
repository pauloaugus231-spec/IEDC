import { IsUUID } from 'class-validator';

export class TrocarCamaDto {
  @IsUUID('4', { message: 'A estadia de origem deve ser um UUID válido.' })
  estadia_origem_id!: string;

  @IsUUID('4', { message: 'A cama de destino deve ser um UUID válido.' })
  cama_destino_id!: string;
}
