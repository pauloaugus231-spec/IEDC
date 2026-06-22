import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Estadia } from './estadia.entity';
import { Bloqueio } from './bloqueio.entity';
import { Ocorrencia } from './ocorrencia.entity';

export enum StatusCadastro {
  APROVADO = 'aprovado',
  ATIVA = 'ativa', // Hóspede com check-in ativo
  INATIVO = 'inativo', // Hóspede com check-out realizado
}

export enum TipoVaga {
  MASCULINA = 'masculina',
  FEMININA = 'feminina',
  LGBT = 'lgbt',
  IDOSO = 'idoso',
}

@Entity('pessoas')
export class Pessoa {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  nome!: string;

  @Column({ length: 255, nullable: true })
  nome_social?: string;

  @Column({ length: 255, nullable: true })
  cpf?: string;

  @Column({ length: 255, nullable: true })
  rg?: string;

  @Column({ length: 255, nullable: true })
  nis?: string;

  @Column({ type: 'date', nullable: true })
  data_nascimento?: Date;

  @Column({ length: 255, nullable: true })
  naturalidade?: string;

  @Column({ length: 255, nullable: true })
  telefone?: string;

  @Column({ length: 255, nullable: true })
  sexo?: string;

  @Column({ length: 255, nullable: true })
  genero?: string;

  @Column({ length: 255, nullable: true })
  cor?: string;

  @Column({ length: 255, nullable: true })
  raca?: string;

  @Column({ length: 255, nullable: true })
  sexualidade?: string;

  @Column({ length: 255, nullable: true })
  endereco?: string;

  @Column({ length: 255, nullable: true })
  cidade?: string;

  @Column({ length: 2, nullable: true })
  uf?: string;

  @Column({ length: 255, nullable: true })
  cep?: string;

  @Column({ length: 255, nullable: true })
  nome_mae?: string;

  @Column({ length: 255, nullable: true })
  nome_pai?: string;

  @Column({ length: 255, nullable: true })
  contato_emergencia?: string;

  @Column({ length: 255, nullable: true })
  telefone_emergencia?: string;

  @Column({ type: 'text', nullable: true })
  alergias?: string;

  @Column({ type: 'text', nullable: true })
  condicoes_cronicas?: string;

  @Column({ type: 'text', nullable: true })
  medicamentos_uso_continuo?: string;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @Column({ type: 'enum', enum: StatusCadastro, default: StatusCadastro.APROVADO })
  status_cadastro!: StatusCadastro;

  @Column({ type: 'enum', enum: TipoVaga, default: TipoVaga.MASCULINA })
  tipo_vaga!: TipoVaga;

  @Column({ length: 255, nullable: true })
  foto_url?: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'boolean', default: false })
  liberacao_antecipada!: boolean;

  @Column({ type: 'boolean', default: false })
  lgbt!: boolean;

  @Column({ type: 'date', nullable: true })
  data_liberacao_antecipada?: Date;

  @Column({ type: 'boolean', default: false })
  presente!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relacionamentos
  @OneToMany(() => Estadia, estadia => estadia.pessoa)
  estadias?: Estadia[];

  @OneToMany(() => Bloqueio, bloqueio => bloqueio.pessoa)
  bloqueios?: Bloqueio[];

  @OneToMany(() => Ocorrencia, ocorrencia => ocorrencia.pessoa)
  ocorrencias?: Ocorrencia[];

  // Métodos auxiliares
  get idade(): number | null {
    if (!this.data_nascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(this.data_nascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();
    
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    
    return idade;
  }

  get possuiBloqueioAtivo(): boolean {
    if (!this.bloqueios) return false;
    const hoje = new Date();
    return this.bloqueios.some(bloqueio => 
      bloqueio.ativo && 
      (!bloqueio.data_fim || new Date(bloqueio.data_fim) >= hoje)
    );
  }

  get podeFazerCheckin(): boolean {
    // Permite check-in se liberado antecipadamente
    if (this.liberacao_antecipada && this.data_liberacao_antecipada) {
      return true;
    }
    // Permite check-in se já se passaram 15 noites desde o último checkout
    if (this.estadias && this.estadias.length > 0) {
      // Encontrar a última estadia finalizada
      const estadiasFinalizadas = this.estadias.filter(e => e.data_checkout);
      if (estadiasFinalizadas.length > 0) {
        const ultimaEstadia = estadiasFinalizadas.reduce((a, b) => new Date(a.data_checkout!) > new Date(b.data_checkout!) ? a : b);
        const hoje = new Date();
        const checkout = new Date(ultimaEstadia.data_checkout!);
        const diffTime = hoje.getTime() - checkout.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 15) return true;
      }
    }
    return false;
  }
}
