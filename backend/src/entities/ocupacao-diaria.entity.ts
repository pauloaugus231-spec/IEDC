import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('ocupacao_diaria')
export class OcupacaoDiaria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', unique: true })
  data_ref!: Date;

  @Column({ type: 'int', default: 0 })
  ocupadas!: number;

  @Column({ type: 'int', default: 0 })
  capacidade!: number;

  @Column({ type: 'int', default: 0 })
  percentual!: number;

  @Column({ type: 'int', default: 0 })
  ingressos!: number;

  @Column({ type: 'int', default: 0 })
  saidas!: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  ocupadas_por_casa!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  capacidade_por_casa!: Record<string, number>;

  @Column({ type: 'boolean', default: false })
  inconsistente!: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  alertas!: string[];

  @Column({ length: 50, default: 'triagem' })
  origem!: string;

  @Column({ type: 'timestamp' })
  gerado_em!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
