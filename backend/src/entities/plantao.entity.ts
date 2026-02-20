import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Colaborador } from './colaborador.entity';

@Entity('plantoes')
export class Plantao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Colaborador)
  @JoinColumn({ name: 'colaborador_id' })
  colaborador!: Colaborador;

  @Column()
  colaborador_id!: string;

  @Column({ type: 'date', transformer: {
      from: (value: string | Date) => value instanceof Date ? value : new Date(value),
      to: (value: Date) => value
    }})
  data!: Date;

  @Column({ length: 100 })
  resumo_turno!: string; // Ex: "Dia (07-19)", "Noite (19-07)", "08:00 - 17:00"

  @Column({ length: 50 })
  unidade!: string; // Copiado do colaborador

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
