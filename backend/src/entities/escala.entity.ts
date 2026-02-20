import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TurnoEscala {
  MANHA = 'manha',
  TARDE = 'tarde',
  NOITE = 'noite',
}

export enum StatusEscala {
  ATIVA = 'ativa',
  INATIVA = 'inativa',
}

@Entity('escala')
export class Escala {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  nome!: string;

  @Column({ length: 100 })
  funcao!: string;

  @Column({ type: 'enum', enum: TurnoEscala })
  turno!: TurnoEscala;

  @Column({ type: 'date' })
  data_inicio!: Date;

  @Column({ type: 'date' })
  data_fim!: Date;

  @Column({ type: 'enum', enum: StatusEscala, default: StatusEscala.ATIVA })
  status!: StatusEscala;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
