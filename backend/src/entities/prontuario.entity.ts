import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pessoa } from './pessoa.entity';

export enum TipoProntuario {
  ATENDIMENTO_SOCIAL = 'atendimento_social',
  ESPACO_CUIDADOS = 'espaco_cuidados',
  OCORRENCIA = 'ocorrencia',
  ACOMPANHAMENTO = 'acompanhamento',
  OUTRO = 'outro',
}

export enum StatusProntuario {
  RASCUNHO = 'rascunho',
  FINALIZADO = 'finalizado',
  ARQUIVADO = 'arquivado',
}

@Entity('prontuarios')
export class Prontuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Relacionamentos
  @Column({ type: 'uuid' })
  pessoa_id!: string;

  @ManyToOne(() => Pessoa)
  @JoinColumn({ name: 'pessoa_id' })
  pessoa!: Pessoa;

  // Tipo e Classificação
  @Column({
    type: 'enum',
    enum: TipoProntuario,
    default: TipoProntuario.ATENDIMENTO_SOCIAL,
  })
  tipo!: TipoProntuario;

  @Column({
    type: 'enum',
    enum: StatusProntuario,
    default: StatusProntuario.FINALIZADO,
  })
  status!: StatusProntuario;

  // Data e Responsáveis
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_atendimento!: Date;

  @Column('text', { array: true, default: [] })
  equipe!: string[];

  @Column({ type: 'text', nullable: true })
  profissional_responsavel?: string;

  // Conteúdo
  @Column({ type: 'text' })
  titulo!: string;

  @Column({ type: 'jsonb', default: {} })
  conteudo: any;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  // Metadata
  @Column({ type: 'boolean', default: false })
  criado_automaticamente!: boolean;

  @Column({ type: 'text', nullable: true })
  modulo_origem?: string;

  @Column({ type: 'uuid', nullable: true })
  referencia_externa?: string;

  // Campos de controle
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'text', nullable: true })
  created_by?: string;

  @Column({ type: 'text', nullable: true })
  updated_by?: string;
}
