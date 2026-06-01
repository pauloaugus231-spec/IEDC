import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ObservabilityEventLevel = 'info' | 'aviso' | 'erro';

@Entity('observability_events')
@Index('idx_observability_events_criado_em', ['criadoEm'])
@Index('idx_observability_events_tipo_nivel', ['tipo', 'nivel'])
@Index('idx_observability_events_origem', ['origem'])
export class ObservabilityEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40 })
  tipo!: string;

  @Column({ type: 'varchar', length: 40 })
  origem!: string;

  @Column({ type: 'varchar', length: 16, default: 'info' })
  nivel!: ObservabilityEventLevel;

  @Column({ type: 'varchar', length: 240 })
  mensagem!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  requestId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  usuarioLogin!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  usuarioRole!: string | null;

  @Column({ type: 'integer', nullable: true })
  httpStatus!: number | null;

  @Column({ type: 'integer', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
