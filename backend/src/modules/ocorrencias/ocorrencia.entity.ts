import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Pessoa } from '../../entities/pessoa.entity';

@Entity('ocorrencias')
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  pessoa_id!: string;

  @ManyToOne(() => Pessoa, pessoa => pessoa.ocorrencias)
  pessoa!: Pessoa;

  @Column({ length: 50 })
  tipo!: string;

  @Column('text')
  descricao!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_ocorrencia!: Date;

  @Column({ nullable: true })
  criado_por!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
