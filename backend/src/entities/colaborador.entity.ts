import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('colaboradores')
export class Colaborador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  nome!: string;

  @Column({ length: 100 })
  funcao!: string;

  @Column({ default: true })
  ativo!: boolean;

  // ONDE ELE TRABALHA?
  // Educadores = Casa específica. Porteiros/Geral = Geral.
  @Column({ length: 50, default: 'Geral' })
  unidade!: string; // 'Masculina', 'Mista', 'Geral'

  // COMO É A ESCALA DELE?
  @Column({ length: 20, default: '12x36' })
  modelo_escala!: string; // '12x36', 'Semanal'

  // OPÇÕES PARA QUEM É 12x36
  @Column({ type: 'varchar', length: 10, nullable: true })
  equipe_12x36!: string | null; // 'A', 'B'

  @Column({ type: 'varchar', length: 50, nullable: true })
  turno_12x36!: string | null; // 'Dia (07-19)', 'Noite (19-07)'

  // OPÇÕES PARA QUEM É SEMANAL (Volantes / Diaristas)
  @Column({ type: 'text', nullable: true })
  dias_semanais!: string | null; // JSON string of number[]

  @Column({ type: 'varchar', length: 50, nullable: true })
  horario_semanal!: string | null; // Ex: "08:00 - 17:00"

  @Column({ type: 'varchar', length: 20, nullable: true })
  revezamento_fds!: string | null; // 'NaoTrabalha', 'TodoSabado', 'TodoDomingo', 'Alternado_A', 'Alternado_B'

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
