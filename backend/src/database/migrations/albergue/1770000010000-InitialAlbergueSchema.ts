import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAlbergueSchema1770000010000 implements MigrationInterface {
  name = 'InitialAlbergueSchema1770000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await this.createEnum(queryRunner, 'bloqueios_tipo_enum', ['comportamento', 'descumprimento_regras', 'administrativo', 'abandono', 'outros']);
    await this.createEnum(queryRunner, 'camas_casa_enum', ['MASCULINA', 'MISTA_MULHERES', 'IDOSOS', 'LGBT']);
    await this.createEnum(queryRunner, 'camas_posicao_enum', ['SUPERIOR', 'INFERIOR']);
    await this.createEnum(queryRunner, 'camas_status_enum', ['DISPONIVEL', 'OCUPADA', 'BLOQUEADA']);
    await this.createEnum(queryRunner, 'escala_status_enum', ['ativa', 'inativa']);
    await this.createEnum(queryRunner, 'escala_turno_enum', ['manha', 'tarde', 'noite']);
    await this.createEnum(queryRunner, 'estadias_motivo_saida_enum', ['voluntario', 'automatico', 'abandono', 'transferencia', 'encaminhamento', 'descumprimento', 'outro']);
    await this.createEnum(queryRunner, 'estadias_status_enum', ['ativa', 'finalizada', 'cancelada', 'abandono', 'checkout_automatico']);
    await this.createEnum(queryRunner, 'ocorrencias_severidade_enum', ['baixa', 'media', 'alta', 'critica']);
    await this.createEnum(queryRunner, 'ocorrencias_tipo_enum', ['comportamento', 'saude', 'furto', 'dano_patrimonio', 'conflito', 'outros']);
    await this.createEnum(queryRunner, 'pessoas_status_cadastro_enum', ['aprovado', 'ativa', 'inativo']);
    await this.createEnum(queryRunner, 'pessoas_tipo_vaga_enum', ['masculina', 'feminina', 'lgbt', 'idoso']);
    await this.createEnum(queryRunner, 'regras_escala_tipo_alocacao_enum', ['fixa', 'fluida']);
    await this.createEnum(queryRunner, 'solicitacoes_status_enum', ['pendente', 'aprovada', 'recusada', 'cancelada']);
    await this.createEnum(queryRunner, 'solicitacoes_tipo_enum', ['prorrogacao', 'suspensao', 'bloqueio', 'desbloqueio']);

    await queryRunner.query(`
      CREATE TABLE pessoas (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        nome varchar(255) NOT NULL, nome_social varchar(255), cpf varchar(20), rg varchar(20), nis varchar(20),
        data_nascimento date, naturalidade varchar(100), telefone varchar(20), sexo varchar(20), genero varchar(50),
        cor varchar(50), raca varchar(50), sexualidade varchar(50), endereco varchar(255), cidade varchar(100),
        uf varchar(2), cep varchar(20), nome_mae varchar(100), nome_pai varchar(100), contato_emergencia varchar(100),
        telefone_emergencia varchar(20), alergias text, condicoes_cronicas text, medicamentos_uso_continuo text,
        observacoes text, status_cadastro pessoas_status_cadastro_enum DEFAULT 'aprovado' NOT NULL,
        tipo_vaga pessoas_tipo_vaga_enum DEFAULT 'masculina' NOT NULL, foto_url varchar(255), ativo boolean DEFAULT true NOT NULL,
        liberacao_antecipada boolean DEFAULT false NOT NULL, lgbt boolean DEFAULT false NOT NULL,
        data_liberacao_antecipada date, presente boolean DEFAULT false NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE camas (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, numero integer NOT NULL, casa camas_casa_enum NOT NULL,
        posicao camas_posicao_enum NOT NULL, status camas_status_enum DEFAULT 'DISPONIVEL' NOT NULL
      );
      CREATE TABLE colaboradores (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, nome varchar(100) NOT NULL, funcao varchar(100) NOT NULL,
        ativo boolean DEFAULT true NOT NULL, unidade varchar(50) DEFAULT 'Geral' NOT NULL,
        modelo_escala varchar(20) DEFAULT '12x36' NOT NULL, equipe_12x36 varchar(10), turno_12x36 varchar(50),
        dias_semanais text, horario_semanal varchar(50), revezamento_fds varchar(20),
        created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE turnos (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, nome varchar(100) NOT NULL, hora_inicio time NOT NULL,
        hora_fim time NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE estadias (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, pessoa_id uuid NOT NULL REFERENCES pessoas(id),
        data_checkin timestamp NOT NULL, data_checkout timestamp, data_limite date NOT NULL,
        numero_vaga integer DEFAULT 1 NOT NULL, status estadias_status_enum DEFAULT 'ativa' NOT NULL,
        observacoes_checkin text, observacoes_checkout text, funcionario_checkin varchar(100), funcionario_checkout varchar(100),
        prorrogada boolean DEFAULT false NOT NULL, dias_prorrogacao integer DEFAULT 0 NOT NULL,
        motivo_prorrogacao text, motivo_saida estadias_motivo_saida_enum,
        created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL,
        cama_id uuid REFERENCES camas(id)
      );
      CREATE TABLE bloqueios (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, pessoa_id uuid NOT NULL REFERENCES pessoas(id),
        tipo bloqueios_tipo_enum NOT NULL, motivo text NOT NULL, data_inicio date NOT NULL, data_fim date,
        dias_bloqueio integer, criado_por varchar(100) NOT NULL, ativo boolean DEFAULT true NOT NULL,
        observacoes text, liberacao_antecipada boolean DEFAULT false NOT NULL, data_liberacao_antecipada timestamp,
        liberado_por varchar(100), created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE ocorrencias (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, pessoa_id uuid REFERENCES pessoas(id),
        tipo ocorrencias_tipo_enum NOT NULL, severidade ocorrencias_severidade_enum DEFAULT 'media' NOT NULL,
        titulo varchar(255) NOT NULL, descricao text NOT NULL, data_ocorrencia timestamp DEFAULT now() NOT NULL,
        criado_por varchar(100) NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE solicitacoes (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, pessoa_id uuid NOT NULL REFERENCES pessoas(id),
        tipo solicitacoes_tipo_enum NOT NULL, status solicitacoes_status_enum DEFAULT 'pendente' NOT NULL,
        titulo varchar(255) NOT NULL, justificativa text NOT NULL, solicitado_por varchar(100) NOT NULL,
        data_solicitacao timestamp DEFAULT now() NOT NULL, analisado_por varchar(100), data_analise timestamp,
        parecer text, dias_prorrogacao integer, nova_data_limite date, data_inicio_bloqueio date,
        data_fim_bloqueio date, motivo_bloqueio text, observacoes text,
        created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE escala (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, nome varchar(100) NOT NULL, funcao varchar(100) NOT NULL,
        turno escala_turno_enum NOT NULL, data_inicio date NOT NULL, data_fim date NOT NULL,
        status escala_status_enum DEFAULT 'ativa' NOT NULL, created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE regras_escala (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, colaborador_id uuid REFERENCES colaboradores(id),
        turno_id uuid NOT NULL REFERENCES turnos(id), tipo_alocacao regras_escala_tipo_alocacao_enum DEFAULT 'fluida' NOT NULL,
        dias_semana text, data_inicio date, data_fim date, created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE plantoes (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, colaborador_id uuid NOT NULL REFERENCES colaboradores(id),
        data date NOT NULL, resumo_turno varchar(100) NOT NULL, unidade varchar(50) NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE INDEX idx_estadias_pessoa ON estadias(pessoa_id);
      CREATE INDEX idx_estadias_status ON estadias(status);
      CREATE INDEX idx_bloqueios_pessoa ON bloqueios(pessoa_id);
      CREATE INDEX idx_ocorrencias_pessoa ON ocorrencias(pessoa_id);
      CREATE INDEX idx_solicitacoes_pessoa ON solicitacoes(pessoa_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS plantoes, regras_escala, escala, solicitacoes, ocorrencias,
        bloqueios, estadias, turnos, colaboradores, camas, pessoas CASCADE
    `);
    for (const typeName of [
      'solicitacoes_tipo_enum', 'solicitacoes_status_enum', 'regras_escala_tipo_alocacao_enum',
      'pessoas_tipo_vaga_enum', 'pessoas_status_cadastro_enum', 'ocorrencias_tipo_enum',
      'ocorrencias_severidade_enum', 'estadias_status_enum', 'estadias_motivo_saida_enum',
      'escala_turno_enum', 'escala_status_enum', 'camas_status_enum', 'camas_posicao_enum',
      'camas_casa_enum', 'bloqueios_tipo_enum',
    ]) {
      await queryRunner.query(`DROP TYPE IF EXISTS "${typeName}"`);
    }
  }

  private async createEnum(queryRunner: QueryRunner, name: string, values: string[]): Promise<void> {
    const sqlValues = values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
    await queryRunner.query(`CREATE TYPE "${name}" AS ENUM (${sqlValues})`);
  }
}
