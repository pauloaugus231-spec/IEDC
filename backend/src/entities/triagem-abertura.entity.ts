import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('triagem_aberturas')
export class TriagemAbertura {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', unique: true })
  data_ref!: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  aberta_em!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aberta_por?: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
