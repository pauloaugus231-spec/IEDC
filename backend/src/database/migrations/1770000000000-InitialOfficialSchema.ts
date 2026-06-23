import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialOfficialSchema1770000000000 implements MigrationInterface {
  name = 'InitialOfficialSchema1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await this.createEnum(queryRunner, 'bloqueios_tipo_enum', [
      'comportamento',
      'descumprimento_regras',
      'administrativo',
      'abandono',
      'outros',
    ]);
    await this.createEnum(queryRunner, 'camas_casa_enum', [
      'MASCULINA',
      'MISTA_MULHERES',
      'IDOSOS',
      'LGBT',
    ]);
    await this.createEnum(queryRunner, 'camas_posicao_enum', ['SUPERIOR', 'INFERIOR']);
    await this.createEnum(queryRunner, 'camas_status_enum', [
      'DISPONIVEL',
      'OCUPADA',
      'BLOQUEADA',
    ]);
    await this.createEnum(queryRunner, 'escala_status_enum', ['ativa', 'inativa']);
    await this.createEnum(queryRunner, 'escala_turno_enum', ['manha', 'tarde', 'noite']);
    await this.createEnum(queryRunner, 'estadias_motivo_saida_enum', [
      'voluntario',
      'automatico',
      'abandono',
      'transferencia',
      'encaminhamento',
      'descumprimento',
      'outro',
    ]);
    await this.createEnum(queryRunner, 'estadias_status_enum', [
      'ativa',
      'finalizada',
      'cancelada',
      'abandono',
      'checkout_automatico',
    ]);
    await this.createEnum(queryRunner, 'ocorrencias_severidade_enum', [
      'baixa',
      'media',
      'alta',
      'critica',
    ]);
    await this.createEnum(queryRunner, 'ocorrencias_tipo_enum', [
      'comportamento',
      'saude',
      'furto',
      'dano_patrimonio',
      'conflito',
      'outros',
    ]);
    await this.createEnum(queryRunner, 'pessoas_status_cadastro_enum', [
      'aprovado',
      'ativa',
      'inativo',
    ]);
    await this.createEnum(queryRunner, 'pessoas_tipo_vaga_enum', [
      'masculina',
      'feminina',
      'lgbt',
      'idoso',
    ]);
    await this.createEnum(queryRunner, 'regras_escala_tipo_alocacao_enum', [
      'fixa',
      'fluida',
    ]);
    await this.createEnum(queryRunner, 'solicitacoes_status_enum', [
      'pendente',
      'aprovada',
      'recusada',
      'cancelada',
    ]);
    await this.createEnum(queryRunner, 'solicitacoes_tipo_enum', [
      'prorrogacao',
      'suspensao',
      'bloqueio',
      'desbloqueio',
    ]);
    await this.createEnum(queryRunner, 'usuarios_role_enum', [
      'gestora',
      'suporte',
      'coordenador_albergue',
      'coordenador_creche',
      'equipe_tecnica',
      'educador_albergue',
      'educador_creche',
      'financeiro',
      'loja_bazar',
      'loja_brecho',
      'loja_feirao',
    ]);
    await this.createEnum(queryRunner, 'usuarios_service_enum', [
      'gestao',
      'suporte',
      'albergue',
      'creche',
      'institucional',
      'financeiro',
      'bazar',
      'brecho',
      'feirao',
    ]);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pessoas (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        nome character varying(255) NOT NULL,
        nome_social character varying(255),
        cpf character varying(20),
        rg character varying(20),
        nis character varying(20),
        data_nascimento date,
        naturalidade character varying(100),
        telefone character varying(20),
        sexo character varying(20),
        genero character varying(50),
        cor character varying(50),
        raca character varying(50),
        sexualidade character varying(50),
        endereco character varying(255),
        cidade character varying(100),
        uf character varying(2),
        cep character varying(20),
        nome_mae character varying(100),
        nome_pai character varying(100),
        contato_emergencia character varying(100),
        telefone_emergencia character varying(20),
        alergias text,
        condicoes_cronicas text,
        medicamentos_uso_continuo text,
        observacoes text,
        status_cadastro pessoas_status_cadastro_enum DEFAULT 'aprovado' NOT NULL,
        tipo_vaga pessoas_tipo_vaga_enum DEFAULT 'masculina' NOT NULL,
        foto_url character varying(255),
        ativo boolean DEFAULT true NOT NULL,
        liberacao_antecipada boolean DEFAULT false NOT NULL,
        lgbt boolean DEFAULT false NOT NULL,
        data_liberacao_antecipada date,
        presente boolean DEFAULT false NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_fa8104cfc91dc207880a73a1acd" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS camas (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        numero integer NOT NULL,
        casa camas_casa_enum NOT NULL,
        posicao camas_posicao_enum NOT NULL,
        status camas_status_enum DEFAULT 'DISPONIVEL' NOT NULL,
        CONSTRAINT "PK_ed42a5b14d01cafe0bc74dfd552" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        nome character varying(100) NOT NULL,
        funcao character varying(100) NOT NULL,
        ativo boolean DEFAULT true NOT NULL,
        unidade character varying(50) DEFAULT 'Geral' NOT NULL,
        modelo_escala character varying(20) DEFAULT '12x36' NOT NULL,
        equipe_12x36 character varying(10),
        turno_12x36 character varying(50),
        dias_semanais text,
        horario_semanal character varying(50),
        revezamento_fds character varying(20),
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_43dcbea28bbd5f12859c6da8089" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS turnos (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        nome character varying(100) NOT NULL,
        hora_inicio time without time zone NOT NULL,
        hora_fim time without time zone NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_61dbaea0fc136ee2ef981f14782" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        login character varying(80) NOT NULL,
        name character varying(120) NOT NULL,
        "displayName" character varying(120) NOT NULL,
        "roleLabel" character varying(120) NOT NULL,
        "serviceLabel" character varying(160) NOT NULL,
        "homePath" character varying(160) NOT NULL,
        role usuarios_role_enum NOT NULL,
        service usuarios_service_enum NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "mustChangePassword" boolean DEFAULT true NOT NULL,
        "passwordUpdatedAt" timestamp without time zone,
        "lastLoginAt" timestamp without time zone,
        "createdBy" character varying(80),
        "updatedBy" character varying(80),
        ativo boolean DEFAULT true NOT NULL,
        criado_em timestamp without time zone DEFAULT now() NOT NULL,
        atualizado_em timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY (id),
        CONSTRAINT "UQ_0c0fcf4a8c228628476a29ea302" UNIQUE (login)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS estadias (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        pessoa_id uuid NOT NULL,
        data_checkin timestamp without time zone NOT NULL,
        data_checkout timestamp without time zone,
        data_limite date NOT NULL,
        numero_vaga integer DEFAULT 1 NOT NULL,
        status estadias_status_enum DEFAULT 'ativa' NOT NULL,
        observacoes_checkin text,
        observacoes_checkout text,
        funcionario_checkin character varying(100),
        funcionario_checkout character varying(100),
        prorrogada boolean DEFAULT false NOT NULL,
        dias_prorrogacao integer DEFAULT 0 NOT NULL,
        motivo_prorrogacao text,
        motivo_saida estadias_motivo_saida_enum,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        cama_id uuid,
        CONSTRAINT "PK_9112222481132b1ee354b854ee4" PRIMARY KEY (id),
        CONSTRAINT "FK_b313613dd8f9e207a40ada78c66" FOREIGN KEY (pessoa_id) REFERENCES pessoas(id),
        CONSTRAINT "FK_8da85797d2d1c5c5f29e0b550db" FOREIGN KEY (cama_id) REFERENCES camas(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bloqueios (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        pessoa_id uuid NOT NULL,
        tipo bloqueios_tipo_enum NOT NULL,
        motivo text NOT NULL,
        data_inicio date NOT NULL,
        data_fim date,
        dias_bloqueio integer,
        criado_por character varying(100) NOT NULL,
        ativo boolean DEFAULT true NOT NULL,
        observacoes text,
        liberacao_antecipada boolean DEFAULT false NOT NULL,
        data_liberacao_antecipada timestamp without time zone,
        liberado_por character varying(100),
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_add3223b800c893e9c303d2ea97" PRIMARY KEY (id),
        CONSTRAINT "FK_105aa4e745de7d6ea69312ce9d4" FOREIGN KEY (pessoa_id) REFERENCES pessoas(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ocorrencias (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        pessoa_id uuid,
        tipo ocorrencias_tipo_enum NOT NULL,
        severidade ocorrencias_severidade_enum DEFAULT 'media' NOT NULL,
        titulo character varying(255) NOT NULL,
        descricao text NOT NULL,
        data_ocorrencia timestamp without time zone DEFAULT now() NOT NULL,
        criado_por character varying(100) NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_a04319dc4023e6a220648bf6006" PRIMARY KEY (id),
        CONSTRAINT "FK_8adadaaf1e92bc9e1db23a852dd" FOREIGN KEY (pessoa_id) REFERENCES pessoas(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS solicitacoes (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        pessoa_id uuid NOT NULL,
        tipo solicitacoes_tipo_enum NOT NULL,
        status solicitacoes_status_enum DEFAULT 'pendente' NOT NULL,
        titulo character varying(255) NOT NULL,
        justificativa text NOT NULL,
        solicitado_por character varying(100) NOT NULL,
        data_solicitacao timestamp without time zone DEFAULT now() NOT NULL,
        analisado_por character varying(100),
        data_analise timestamp without time zone,
        parecer text,
        dias_prorrogacao integer,
        nova_data_limite date,
        data_inicio_bloqueio date,
        data_fim_bloqueio date,
        motivo_bloqueio text,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_795aaa33114295368cac771de45" PRIMARY KEY (id),
        CONSTRAINT "FK_2033d954e0491330540aa3a5007" FOREIGN KEY (pessoa_id) REFERENCES pessoas(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS escala (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        nome character varying(100) NOT NULL,
        funcao character varying(100) NOT NULL,
        turno escala_turno_enum NOT NULL,
        data_inicio date NOT NULL,
        data_fim date NOT NULL,
        status escala_status_enum DEFAULT 'ativa' NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_ca34d547f4f640b2dcdfcffca2f" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS regras_escala (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        colaborador_id uuid,
        turno_id uuid NOT NULL,
        tipo_alocacao regras_escala_tipo_alocacao_enum DEFAULT 'fluida' NOT NULL,
        dias_semana text,
        data_inicio date,
        data_fim date,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_2c2a1e92f6c75f3f40b3e4f4ef2" PRIMARY KEY (id),
        CONSTRAINT "FK_bf895cf0507d55993e4aebfde45" FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id),
        CONSTRAINT "FK_a028090aec03e038b7540631dac" FOREIGN KEY (turno_id) REFERENCES turnos(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plantoes (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        colaborador_id uuid NOT NULL,
        data date NOT NULL,
        resumo_turno character varying(100) NOT NULL,
        unidade character varying(50) NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_489aa65442b7578fe9a0d97888c" PRIMARY KEY (id),
        CONSTRAINT "FK_06b57c1d14eb7f9b4d0c16bc576" FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
      )
    `);

    await this.createLojasSchema(queryRunner);
    await this.createImpactoSchema(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS impacto_albergue_respostas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_acompanhamentos CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_frequencias CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_responsaveis CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_criancas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_turmas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_professoras CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_retiradas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_eventos_comanda CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_pagamentos CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_comanda_itens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_comandas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_produtos CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_clientes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comercio_lojas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS plantoes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS regras_escala CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS escala CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS solicitacoes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ocorrencias CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS bloqueios CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS estadias CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS usuarios CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS turnos CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS colaboradores CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS camas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS pessoas CASCADE`);

    for (const typeName of [
      'usuarios_service_enum',
      'usuarios_role_enum',
      'solicitacoes_tipo_enum',
      'solicitacoes_status_enum',
      'regras_escala_tipo_alocacao_enum',
      'pessoas_tipo_vaga_enum',
      'pessoas_status_cadastro_enum',
      'ocorrencias_tipo_enum',
      'ocorrencias_severidade_enum',
      'estadias_status_enum',
      'estadias_motivo_saida_enum',
      'escala_turno_enum',
      'escala_status_enum',
      'camas_status_enum',
      'camas_posicao_enum',
      'camas_casa_enum',
      'bloqueios_tipo_enum',
    ]) {
      await queryRunner.query(`DROP TYPE IF EXISTS "${typeName}"`);
    }
  }

  private async createEnum(
    queryRunner: QueryRunner,
    typeName: string,
    values: string[],
  ): Promise<void> {
    const valuesSql = values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "${typeName}" AS ENUM (${valuesSql});
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $$;
    `);
  }

  private async createLojasSchema(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_lojas (
        id uuid PRIMARY KEY,
        slug character varying(40) UNIQUE NOT NULL,
        nome character varying(120) NOT NULL,
        ativa boolean DEFAULT true NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_clientes (
        id uuid PRIMARY KEY,
        nome character varying(180) NOT NULL,
        telefone character varying(40) DEFAULT '' NOT NULL,
        cpf character varying(20) DEFAULT '' NOT NULL,
        email character varying(180) DEFAULT '' NOT NULL,
        endereco character varying(240) DEFAULT '' NOT NULL,
        data_nascimento date,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_produtos (
        id uuid PRIMARY KEY,
        loja_id uuid NOT NULL REFERENCES comercio_lojas(id),
        nome character varying(180) NOT NULL,
        categoria character varying(120) DEFAULT 'Diversos' NOT NULL,
        preco numeric(10,2) DEFAULT 0 NOT NULL,
        ativo boolean DEFAULT true NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_comandas (
        id uuid PRIMARY KEY,
        codigo character varying(30) UNIQUE NOT NULL,
        cliente_id uuid NOT NULL REFERENCES comercio_clientes(id),
        status character varying(40) DEFAULT 'aberta' NOT NULL,
        criada_por character varying(160),
        observacoes text,
        motivo_status text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        finalizada_em timestamp without time zone
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_comanda_itens (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        loja_id uuid NOT NULL REFERENCES comercio_lojas(id),
        produto_id uuid REFERENCES comercio_produtos(id),
        descricao character varying(220) NOT NULL,
        categoria character varying(120) DEFAULT 'Diversos' NOT NULL,
        quantidade integer DEFAULT 1 NOT NULL,
        valor_unitario numeric(10,2) DEFAULT 0 NOT NULL,
        desconto numeric(10,2) DEFAULT 0 NOT NULL,
        total_item numeric(10,2) DEFAULT 0 NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_pagamentos (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        metodo character varying(40) NOT NULL,
        valor numeric(10,2) DEFAULT 0 NOT NULL,
        recebido_por character varying(160),
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_eventos_comanda (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        tipo character varying(80) NOT NULL,
        descricao text NOT NULL,
        usuario character varying(160),
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comercio_retiradas (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        loja_id uuid NOT NULL REFERENCES comercio_lojas(id),
        status character varying(40) DEFAULT 'aguardando_retirada' NOT NULL,
        notificada_em timestamp without time zone DEFAULT now() NOT NULL,
        retirada_em timestamp without time zone,
        entregue_por character varying(160),
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        UNIQUE (comanda_id, loja_id)
      )
    `);

    await queryRunner.query(`ALTER TABLE comercio_clientes ADD COLUMN IF NOT EXISTS endereco character varying(240) DEFAULT '' NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_comercio_comandas_status ON comercio_comandas(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_comercio_comandas_cliente ON comercio_comandas(cliente_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_comercio_itens_comanda ON comercio_comanda_itens(comanda_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_comercio_pagamentos_comanda ON comercio_pagamentos(comanda_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_comercio_retiradas_loja_status ON comercio_retiradas(loja_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_comercio_retiradas_comanda ON comercio_retiradas(comanda_id)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uidx_comercio_clientes_cpf_digits
      ON comercio_clientes ((regexp_replace(cpf, '\\D', '', 'g')))
      WHERE regexp_replace(cpf, '\\D', '', 'g') <> ''
    `);
  }

  private async createEeiSchema(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_professoras (
        id uuid PRIMARY KEY,
        nome character varying(160) NOT NULL,
        telefone character varying(40),
        email character varying(160),
        funcao character varying(80) DEFAULT 'Regente' NOT NULL,
        status character varying(30) DEFAULT 'ativa' NOT NULL,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_turmas (
        id uuid PRIMARY KEY,
        nome character varying(120) UNIQUE NOT NULL,
        faixa_etaria character varying(80) NOT NULL,
        turno character varying(40) DEFAULT 'Integral' NOT NULL,
        capacidade integer DEFAULT 0 NOT NULL,
        ativa boolean DEFAULT true NOT NULL,
        professora_responsavel_id uuid REFERENCES creche_professoras(id) ON DELETE SET NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_criancas (
        id uuid PRIMARY KEY,
        codigo character varying(30) UNIQUE NOT NULL,
        nome character varying(180) NOT NULL,
        cpf character varying(20) DEFAULT '' NOT NULL,
        rg character varying(20),
        nis character varying(20) DEFAULT '' NOT NULL,
        data_nascimento date NOT NULL,
        data_ingresso date DEFAULT CURRENT_DATE NOT NULL,
        turma_id uuid NOT NULL REFERENCES creche_turmas(id),
        status character varying(30) DEFAULT 'ativa' NOT NULL,
        sexo character varying(30) DEFAULT 'menina' NOT NULL,
        genero character varying(60),
        raca_cor character varying(80) DEFAULT 'Não informado' NOT NULL,
        naturalidade character varying(120),
        endereco character varying(240),
        bairro character varying(120),
        cidade character varying(120) DEFAULT 'Porto Alegre',
        uf character varying(2) DEFAULT 'RS',
        cep character varying(20),
        escola_origem character varying(180),
        alergias text,
        condicoes_saude text,
        medicamentos text,
        autorizacao_imagem boolean DEFAULT false NOT NULL,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_responsaveis (
        id uuid PRIMARY KEY,
        crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
        nome character varying(180) NOT NULL,
        parentesco character varying(80) NOT NULL,
        cpf character varying(20) DEFAULT '' NOT NULL,
        rg character varying(20),
        telefone character varying(40) NOT NULL,
        telefone_alternativo character varying(40),
        email character varying(160),
        endereco character varying(240),
        bairro character varying(120),
        cidade character varying(120),
        uf character varying(2),
        cep character varying(20),
        trabalho character varying(160),
        responsavel_principal boolean DEFAULT false NOT NULL,
        autorizado_retirada boolean DEFAULT true NOT NULL,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_frequencias (
        id uuid PRIMARY KEY,
        crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
        turma_id uuid NOT NULL REFERENCES creche_turmas(id),
        data date NOT NULL,
        presente boolean DEFAULT true NOT NULL,
        justificativa text,
        registrado_por character varying(160),
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        UNIQUE (crianca_id, data)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_acompanhamentos (
        id uuid PRIMARY KEY,
        crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
        tipo character varying NOT NULL,
        status character varying NOT NULL,
        descricao text NOT NULL,
        responsavel character varying NOT NULL,
        data date NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`ALTER TABLE creche_turmas ADD COLUMN IF NOT EXISTS professora_responsavel_id uuid`);
    await this.addForeignKeyIfMissing(
      queryRunner,
      'creche_turmas',
      'creche_turmas_professora_responsavel_id_fkey',
      'FOREIGN KEY (professora_responsavel_id) REFERENCES creche_professoras(id) ON DELETE SET NULL',
    );
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS creche_professoras_nome_key ON creche_professoras(nome)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_criancas_turma ON creche_criancas(turma_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_criancas_status ON creche_criancas(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_responsaveis_crianca ON creche_responsaveis(crianca_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_frequencias_turma_data ON creche_frequencias(turma_id, data)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_frequencias_crianca_data ON creche_frequencias(crianca_id, data)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_acompanhamentos_crianca ON creche_acompanhamentos(crianca_id)`);
  }

  private async createImpactoSchema(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS impacto_albergue_respostas (
        id uuid PRIMARY KEY,
        source_key character varying(120) UNIQUE NOT NULL,
        origem character varying(40) DEFAULT 'sistema' NOT NULL,
        data_referencia date NOT NULL,
        situacao_territorial character varying(160) DEFAULT 'Ñ informado' NOT NULL,
        tempo_sem_moradia character varying(160) DEFAULT 'Prefiro não responder' NOT NULL,
        fatores_sem_moradia text[] DEFAULT ARRAY[]::text[] NOT NULL,
        fatores_sem_moradia_outro text,
        ajuda_principal text[] DEFAULT ARRAY[]::text[] NOT NULL,
        ajuda_principal_outro text,
        respeito_usuarios character varying(60) DEFAULT 'Prefiro não responder' NOT NULL,
        comunicacao_equipe character varying(60) DEFAULT 'Não se aplica' NOT NULL,
        proximo_passo_ajuda character varying(60) DEFAULT 'Ainda não' NOT NULL,
        proximos_passos text[] DEFAULT ARRAY[]::text[] NOT NULL,
        proximo_passo_outro text,
        participou_oficina character varying(80) DEFAULT 'Não' NOT NULL,
        relato_representa text,
        melhoria_sugerida text,
        demandas_equipe text[] DEFAULT ARRAY[]::text[] NOT NULL,
        demanda_outro text,
        acao_equipe text[] DEFAULT ARRAY[]::text[] NOT NULL,
        preenchido_por character varying(160),
        perfil_preenchedor character varying(80),
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`ALTER TABLE impacto_albergue_respostas ADD COLUMN IF NOT EXISTS fatores_sem_moradia_outro text`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_impacto_albergue_data ON impacto_albergue_respostas(data_referencia)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_impacto_albergue_origem ON impacto_albergue_respostas(origem)`);
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    definition: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${constraintName.replace(/'/g, "''")}'
        ) THEN
          ALTER TABLE ${tableName}
          ADD CONSTRAINT ${constraintName}
          ${definition};
        END IF;
      END
      $$;
    `);
  }
}
