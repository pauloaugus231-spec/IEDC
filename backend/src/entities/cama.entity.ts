import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum Casa {
  MASCULINA = 'MASCULINA',
  MISTA_MULHERES = 'MISTA_MULHERES',
  IDOSOS = 'IDOSOS',
  LGBT = 'LGBT',
}

export enum PosicaoCama {
  SUPERIOR = 'SUPERIOR',
  INFERIOR = 'INFERIOR',
}

export enum StatusCama {
  DISPONIVEL = 'DISPONIVEL',
  OCUPADA = 'OCUPADA',
  BLOQUEADA = 'BLOQUEADA',
}

@Entity('camas')
export class Cama {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  numero!: number;

  @Column({
    type: 'enum',
    enum: Casa,
  })
  casa!: Casa;

  @Column({
    type: 'enum',
    enum: PosicaoCama,
  })
  posicao!: PosicaoCama;

  @Column({
    type: 'enum',
    enum: StatusCama,
    default: StatusCama.DISPONIVEL,
  })
  status!: StatusCama;
}
