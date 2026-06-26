import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('triagem_fechamentos')
export class TriagemFechamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', unique: true })
  data_ref!: Date;

  @Column({ type: 'timestamp' })
  fechada_em!: Date;

  @Column({ length: 100 })
  fechada_por!: string;

  @Column({ type: 'int', default: 0 })
  total_presentes!: number;

  @Column({ type: 'int', default: 0 })
  total_ausentes!: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  por_quarto!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  ausentes_ids!: string[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  resultado_processamento!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  observacoes?: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
