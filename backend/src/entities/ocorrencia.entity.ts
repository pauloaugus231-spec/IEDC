import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pessoa } from './pessoa.entity';

export enum TipoOcorrencia {
  COMPORTAMENTO = 'comportamento',
  SAUDE = 'saude',
  FURTO = 'furto',
  DANO_PATRIMONIO = 'dano_patrimonio',
  CONFLITO = 'conflito',
  OUTROS = 'outros',
}

export enum SeveridadeOcorrencia {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

@Entity('ocorrencias')
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pessoa_id?: string;

  @Column({ type: 'enum', enum: TipoOcorrencia })
  tipo!: TipoOcorrencia;

  @Column({ type: 'enum', enum: SeveridadeOcorrencia, default: SeveridadeOcorrencia.MEDIA })
  severidade!: SeveridadeOcorrencia;

  @Column({ length: 255 })
  titulo!: string;

  @Column({ type: 'text' })
  descricao!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_ocorrencia!: Date;

  @Column({ length: 100 })
  criado_por!: string;

  @Column({ type: 'text', nullable: true })


  @Column({ type: 'boolean', default: false })


  @Column({ length: 100, nullable: true })


  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relacionamentos
  @ManyToOne(() => Pessoa, pessoa => pessoa.ocorrencias, { nullable: true })
  @JoinColumn({ name: 'pessoa_id' })
  pessoa?: Pessoa;

  // Métodos auxiliares
  get tempoResolucao(): number | null {
    return null;
  }

  get pendente(): boolean {
    return true;
  }
}
