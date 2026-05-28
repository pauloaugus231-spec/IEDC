import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UsuarioRole {
  GESTORA = 'gestora',
  SUPORTE = 'suporte',
  COORDENADOR_ALBERGUE = 'coordenador_albergue',
  COORDENADOR_CRECHE = 'coordenador_creche',
  EQUIPE_TECNICA = 'equipe_tecnica',
  EDUCADOR_ALBERGUE = 'educador_albergue',
  EDUCADOR_CRECHE = 'educador_creche',
  FINANCEIRO = 'financeiro',
  LOJA_BAZAR = 'loja_bazar',
  LOJA_BRECHO = 'loja_brecho',
  LOJA_FEIRAO = 'loja_feirao',
}

export enum UsuarioServiceScope {
  GESTAO = 'gestao',
  SUPORTE = 'suporte',
  ALBERGUE = 'albergue',
  CRECHE = 'creche',
  INSTITUCIONAL = 'institucional',
  FINANCEIRO = 'financeiro',
  BAZAR = 'bazar',
  BRECHO = 'brecho',
  FEIRAO = 'feirao',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  login!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  displayName!: string;

  @Column({ type: 'varchar', length: 120 })
  roleLabel!: string;

  @Column({ type: 'varchar', length: 160 })
  serviceLabel!: string;

  @Column({ type: 'varchar', length: 160 })
  homePath!: string;

  @Column({ type: 'enum', enum: UsuarioRole })
  role!: UsuarioRole;

  @Column({ type: 'enum', enum: UsuarioServiceScope })
  service!: UsuarioServiceScope;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'boolean', default: true })
  mustChangePassword!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  passwordUpdatedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  createdBy!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  updatedBy!: string | null;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm!: Date;
}
