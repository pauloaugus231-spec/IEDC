import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AuditoriaStatus = 'sucesso' | 'falha';

@Entity('auditoria')
@Index('idx_auditoria_criado_em', ['criadoEm'])
@Index('idx_auditoria_entidade', ['entidade', 'entidadeId'])
@Index('idx_auditoria_usuario', ['usuarioLogin'])
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 140 })
  acao!: string;

  @Column({ type: 'varchar', length: 80 })
  entidade!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  entidadeId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  usuarioId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  usuarioLogin!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  usuarioRole!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 260, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 12, default: 'sucesso' })
  status!: AuditoriaStatus;

  @Column({ type: 'integer', nullable: true })
  httpStatus!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
