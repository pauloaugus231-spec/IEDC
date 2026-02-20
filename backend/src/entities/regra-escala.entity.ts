import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Colaborador } from './colaborador.entity';
import { Turno } from './turno.entity';

export enum TipoAlocacao {
  FIXA = 'fixa',
  FLUIDA = 'fluida',
}

@Entity('regras_escala')
export class RegraEscala {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Colaborador)
  @JoinColumn({ name: 'colaborador_id' })
  colaborador!: Colaborador;

  @Column({ nullable: true })
  colaborador_id!: string;

  @ManyToOne(() => Turno)
  @JoinColumn({ name: 'turno_id' })
  turno!: Turno;

  @Column()
  turno_id!: string;

  @Column({ type: 'enum', enum: TipoAlocacao, default: TipoAlocacao.FLUIDA })
  tipo_alocacao!: TipoAlocacao;

  @Column({ type: 'simple-array', nullable: true })
  dias_semana!: number[]; // [0, 1, 2, 3, 4, 5, 6] para dom-seg

  @Column({ type: 'date', nullable: true })
  data_inicio!: Date;

  @Column({ type: 'date', nullable: true })
  data_fim!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
