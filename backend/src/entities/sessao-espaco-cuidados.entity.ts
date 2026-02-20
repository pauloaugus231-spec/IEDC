import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { FilaEspacoCuidados } from './fila-espaco-cuidados.entity';

export enum StatusSessao {
  PLANEJADA = 'planejada',
  ATIVA = 'ativa',
  ENCERRADA = 'encerrada',
}

@Entity('sessoes_espaco_cuidados')
export class SessaoEspacoCuidados {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', unique: true })
  data_sessao!: Date;

  @Column({ type: 'enum', enum: StatusSessao, default: StatusSessao.PLANEJADA })
  status!: StatusSessao;

  @Column({ type: 'timestamp', nullable: true })
  hora_inicio?: Date;

  @Column({ type: 'timestamp', nullable: true })
  hora_fim?: Date;

  @Column({ type: 'simple-array' })
  equipe!: string[];

  @OneToMany(() => FilaEspacoCuidados, fila => fila.sessao)
  pessoas?: FilaEspacoCuidados[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
