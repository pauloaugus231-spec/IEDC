import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pessoa } from './pessoa.entity';

export enum TipoBloqueio {
  COMPORTAMENTO = 'comportamento',
  DESCUMPRIMENTO_REGRAS = 'descumprimento_regras',
  ADMINISTRATIVO = 'administrativo',
  ABANDONO = 'abandono',
  OUTROS = 'outros',
}

@Entity('bloqueios')
export class Bloqueio {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pessoa_id!: string;

  @Column({ type: 'enum', enum: TipoBloqueio })
  tipo!: TipoBloqueio;

  @Column({ type: 'text' })
  motivo!: string;

  @Column({ type: 'date' })
  data_inicio!: Date;

  @Column({ type: 'date', nullable: true })
  data_fim?: Date;

  @Column({ type: 'int', nullable: true })
  dias_bloqueio?: number;

  @Column({ length: 100 })
  criado_por!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @Column({ type: 'boolean', default: false })
  liberacao_antecipada!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  data_liberacao_antecipada?: Date;

  // @Column({ type: 'text', nullable: true })
  // motivo_liberacao_antecipada?: string;

  @Column({ length: 100, nullable: true })
  liberado_por?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relacionamentos
  @ManyToOne(() => Pessoa, pessoa => pessoa.bloqueios)
  @JoinColumn({ name: 'pessoa_id' })
  pessoa!: Pessoa;

  // Métodos auxiliares
  get estaAtivo(): boolean {
    if (!this.ativo) return false;
    const hoje = new Date();
    const inicio = new Date(this.data_inicio);
    if (hoje < inicio) return false;
    if (this.data_fim) {
      const fim = new Date(this.data_fim);
      return hoje <= fim;
    }
    return true;
  }

  get diasRestantes(): number {
    if (!this.estaAtivo || !this.data_fim) return 0;
    const hoje = new Date();
    const fim = new Date(this.data_fim);
    const diffTime = fim.getTime() - hoje.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
}
