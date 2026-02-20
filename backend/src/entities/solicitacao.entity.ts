import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pessoa } from './pessoa.entity';

export enum TipoSolicitacao {
  PRORROGACAO = 'prorrogacao',
  SUSPENSAO = 'suspensao',
  BLOQUEIO = 'bloqueio',
  DESBLOQUEIO = 'desbloqueio',
}

export enum StatusSolicitacao {
  PENDENTE = 'pendente',
  APROVADA = 'aprovada',
  RECUSADA = 'recusada',
  CANCELADA = 'cancelada',
}

@Entity('solicitacoes')
export class Solicitacao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pessoa_id!: string;

  @Column({ type: 'enum', enum: TipoSolicitacao })
  tipo!: TipoSolicitacao;

  @Column({ type: 'enum', enum: StatusSolicitacao, default: StatusSolicitacao.PENDENTE })
  status!: StatusSolicitacao;

  @Column({ length: 255 })
  titulo!: string;

  @Column({ type: 'text' })
  justificativa!: string;

  @Column({ length: 100 })
  solicitado_por!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_solicitacao!: Date;

  @Column({ length: 100, nullable: true })
  analisado_por?: string;

  @Column({ type: 'timestamp', nullable: true })
  data_analise?: Date;

  @Column({ type: 'text', nullable: true })
  parecer?: string;

  // Campos específicos para prorrogação
  @Column({ type: 'int', nullable: true })
  dias_prorrogacao?: number;

  @Column({ type: 'date', nullable: true })
  nova_data_limite?: Date;

  // Campos específicos para bloqueio
  @Column({ type: 'date', nullable: true })
  data_inicio_bloqueio?: Date;

  @Column({ type: 'date', nullable: true })
  data_fim_bloqueio?: Date;

  @Column({ type: 'text', nullable: true })
  motivo_bloqueio?: string;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relacionamentos
  @ManyToOne(() => Pessoa, pessoa => pessoa.estadias)
  @JoinColumn({ name: 'pessoa_id' })
  pessoa!: Pessoa;

  // Métodos auxiliares
  get tempoAnalise(): number | null {
    if (this.status === StatusSolicitacao.PENDENTE || !this.data_analise) return null;
    const inicio = new Date(this.data_solicitacao);
    const fim = new Date(this.data_analise);
    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60)); // em horas
  }

  get pendente(): boolean {
    return this.status === StatusSolicitacao.PENDENTE;
  }

  get aprovada(): boolean {
    return this.status === StatusSolicitacao.APROVADA;
  }

  get recusada(): boolean {
    return this.status === StatusSolicitacao.RECUSADA;
  }
}
