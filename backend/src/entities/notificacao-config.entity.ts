import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notificacao_config')
export class NotificacaoConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  tipo!: 'email' | 'telegram';

  @Column({ type: 'text' })
  destino!: string;

  @Column({ type: 'text' })
  nome!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
