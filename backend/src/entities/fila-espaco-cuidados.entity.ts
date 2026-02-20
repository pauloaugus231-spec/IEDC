import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { SessaoEspacoCuidados } from './sessao-espaco-cuidados.entity';
import { Pessoa } from './pessoa.entity';

export enum StatusFilaCuidados {
  AGUARDANDO_BANHO = 'aguardando_banho',
  EM_BANHO = 'em_banho',
  AGUARDANDO_ATENDIMENTO = 'aguardando_atendimento',
  EM_ATENDIMENTO = 'em_atendimento',
  CONCLUIDO = 'concluido',
  DESISTIU = 'desistiu',
}

@Entity('fila_espaco_cuidados')
@Unique(['sessao_id', 'pessoa_id'])
@Index(['sessao_id', 'status'])
export class FilaEspacoCuidados {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Relacionamentos
  @Column({ type: 'uuid' })
  sessao_id!: string;

  @ManyToOne(() => SessaoEspacoCuidados, sessao => sessao.pessoas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessao_id' })
  sessao!: SessaoEspacoCuidados;

  @Column({ type: 'uuid' })
  pessoa_id!: string;

  @ManyToOne(() => Pessoa)
  @JoinColumn({ name: 'pessoa_id' })
  pessoa!: Pessoa;

  // Ordem e solicitações
  @Column({ type: 'int' })
  ordem_chegada!: number;

  @Column({ type: 'boolean', default: false })
  quer_banho!: boolean;

  @Column({ type: 'boolean', default: false })
  quer_atendimento!: boolean;

  // Posições nas filas específicas
  @Column({ type: 'int', nullable: true })
  posicao_banho?: number;

  @Column({ type: 'int', nullable: true })
  posicao_atendimento?: number;

  // Status
  @Column({ type: 'enum', enum: StatusFilaCuidados })
  status!: StatusFilaCuidados;

  // Controle de "passar a vez"
  @Column({ type: 'int', default: 0 })
  vezes_passou_vez!: number;

  // Horários - Banho
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  hora_chegada!: Date;

  @Column({ type: 'timestamp', nullable: true })
  hora_inicio_banho?: Date;

  @Column({ type: 'timestamp', nullable: true })
  hora_fim_banho?: Date;

  // Horários - Atendimento
  @Column({ type: 'timestamp', nullable: true })
  hora_inicio_atendimento?: Date;

  @Column({ type: 'timestamp', nullable: true })
  hora_fim_atendimento?: Date;

  // Metadata
  @Column({ type: 'boolean', default: false })
  novo_cadastro!: boolean;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Métodos auxiliares
  get tempoEsperaMinutos(): number {
    if (this.status === StatusFilaCuidados.CONCLUIDO || this.status === StatusFilaCuidados.DESISTIU) {
      return 0;
    }
    const agora = new Date();
    const diff = agora.getTime() - new Date(this.hora_chegada).getTime();
    return Math.floor(diff / 60000);
  }

  get duracaoBanhoMinutos(): number | null {
    if (!this.hora_inicio_banho || !this.hora_fim_banho) return null;
    const diff = new Date(this.hora_fim_banho).getTime() - new Date(this.hora_inicio_banho).getTime();
    return Math.floor(diff / 60000);
  }

  get duracaoAtendimentoMinutos(): number | null {
    if (!this.hora_inicio_atendimento || !this.hora_fim_atendimento) return null;
    const diff = new Date(this.hora_fim_atendimento).getTime() - new Date(this.hora_inicio_atendimento).getTime();
    return Math.floor(diff / 60000);
  }
}
