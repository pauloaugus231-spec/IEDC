import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pessoa } from './pessoa.entity';
import { Cama } from './cama.entity';

export enum StatusEstadia {
  ATIVA = 'ativa',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada',
  ABANDONO = 'abandono',        // Pessoa abandonou a vaga
  CHECKOUT_AUTOMATICO = 'checkout_automatico', // Saída automática após 15 dias
}

export enum MotivoSaida {
  VOLUNTARIO = 'voluntario',           // Pessoa solicitou saída
  AUTOMATICO = 'automatico',           // Sistema encerrou após prazo
  ABANDONO = 'abandono',               // Não retornou / sumiu
  TRANSFERENCIA = 'transferencia',     // Transferido para outro local
  ENCAMINHAMENTO = 'encaminhamento',   // Encaminhado para serviço específico
  DESCUMPRIMENTO = 'descumprimento',   // Violou regras da casa
  OUTRO = 'outro',
}

@Entity('estadias')
export class Estadia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pessoa_id!: string;

  @Column({ type: 'timestamp' })
  data_checkin!: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_checkout?: Date;

  @Column({ type: 'date' })
  data_limite!: Date;

  @Column({ type: 'int', default: 1 })
  numero_vaga!: number;

  @Column({ type: 'enum', enum: StatusEstadia, default: StatusEstadia.ATIVA })
  status!: StatusEstadia;

  @Column({ type: 'text', nullable: true })
  observacoes_checkin?: string;

  @Column({ type: 'text', nullable: true })
  observacoes_checkout?: string;

  @Column({ length: 100, nullable: true })
  funcionario_checkin?: string;

  @Column({ length: 100, nullable: true })
  funcionario_checkout?: string;

  @Column({ type: 'boolean', default: false })
  prorrogada!: boolean;

  @Column({ type: 'int', default: 0 })
  dias_prorrogacao!: number;

  @Column({ type: 'text', nullable: true })
  motivo_prorrogacao?: string;

  @Column({ type: 'enum', enum: MotivoSaida, nullable: true })
  motivo_saida?: MotivoSaida;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relacionamentos
  @ManyToOne(() => Pessoa, pessoa => pessoa.estadias)
  @JoinColumn({ name: 'pessoa_id' })
  pessoa!: Pessoa;

  @ManyToOne(() => Cama, cama => cama.id)
  @JoinColumn({ name: 'cama_id' })
  cama?: Cama;

  @Column({ type: 'uuid', nullable: true })
  cama_id?: string;

  // Métodos auxiliares
  get diasEstadia(): number {
    const inicio = new Date(this.data_checkin);
    const fim = this.data_checkout ? new Date(this.data_checkout) : new Date();
    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get diasRestantes(): number {
    if (this.status !== StatusEstadia.ATIVA) return 0;
    const hoje = new Date();
    const limite = new Date(this.data_limite);
    const diffTime = limite.getTime() - hoje.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  get vencida(): boolean {
    if (this.status !== StatusEstadia.ATIVA) return false;
    const hoje = new Date();
    const limite = new Date(this.data_limite);
    return hoje > limite;
  }
}
