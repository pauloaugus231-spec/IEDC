import { Controller, Get, Post, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estadia } from '../../entities/estadia.entity';

@Controller('diagnostico')
export class DiagnosticoController {
  constructor(
    @InjectRepository(Estadia)
    private estadiaRepository: Repository<Estadia>,
  ) {}

  @Get('sql-status-adao')
  async verificarStatusAdao() {
    const query = `
      SELECT 
        'Estadia do Adão' as info,
        id,
        pessoa_id,
        status,
        pg_typeof(status) as tipo_status,
        length(status::text) as tamanho_status,
        data_checkin,
        data_checkout,
        data_limite,
        CASE 
          WHEN status::text = 'ativa' THEN 'Match exato'
          WHEN LOWER(status::text) = 'ativa' THEN 'Match case-insensitive'
          ELSE 'Não match: "' || status::text || '"'
        END as status_check
      FROM estadias
      WHERE id = '9c994d5b-0565-4255-b162-1b2356404905'
    `;
    
    const result = await this.estadiaRepository.query(query);
    return result;
  }

  @Get('sql-status-unicos')
  async listarStatusUnicos() {
    const query = `
      SELECT 
        status,
        pg_typeof(status) as tipo,
        COUNT(*) as quantidade
      FROM estadias
      GROUP BY status, pg_typeof(status)
      ORDER BY quantidade DESC
    `;
    
    const result = await this.estadiaRepository.query(query);
    return result;
  }

  @Get('sql-enum-types')
  async listarEnumTypes() {
    const query = `
      SELECT 
        t.typname,
        e.enumlabel,
        e.enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE typname LIKE '%estadia%' OR typname LIKE '%status%'
      ORDER BY t.typname, e.enumsortorder
    `;
    
    const result = await this.estadiaRepository.query(query);
    return result;
  }

  @Get('sql-schema-estadias')
  async verificarSchemaEstadias() {
    const query = `
      SELECT 
        column_name, 
        data_type, 
        udt_name,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'estadias' 
      AND column_name IN ('status', 'id', 'pessoa_id', 'data_limite')
      ORDER BY ordinal_position
    `;
    
    const result = await this.estadiaRepository.query(query);
    return result;
  }

  @Post('forcar-update-adao')
  async forcarUpdateAdao() {
    try {
      // Tentar update com CAST explícito
      const updateQuery = `
        UPDATE estadias 
        SET 
          status = 'checkout_automatico',
          data_checkout = CURRENT_TIMESTAMP
        WHERE id = '9c994d5b-0565-4825-b162-1b2356404905'
        RETURNING *
      `;
      
      const result = await this.estadiaRepository.query(updateQuery);
      
      return {
        success: true,
        message: 'Update executado',
        resultado: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        detalhes: error
      };
    }
  }

  @Get('typeorm-find-adao')
  async typeormFindAdao() {
    // Testar diferentes formas de buscar
    const porId = await this.estadiaRepository.findOne({
      where: { id: '9c994d5b-0565-4255-b162-1b2356404905' }
    });

    const porQuery = await this.estadiaRepository
      .createQueryBuilder('estadia')
      .where('estadia.id = :id', { id: '9c994d5b-0565-4255-b162-1b2356404905' })
      .getOne();

    const porStatusAtiva = await this.estadiaRepository.findOne({
      where: { 
        id: '9c994d5b-0565-4255-b162-1b2356404905',
        status: 'ativa' as any
      }
    });

    return {
      buscaPorId: porId,
      buscaPorQueryBuilder: porQuery,
      buscaPorIdEStatus: porStatusAtiva,
      comparacao: {
        encontrouPorId: !!porId,
        encontrouPorQuery: !!porQuery,
        encontrouComStatus: !!porStatusAtiva,
        statusReal: porId?.status,
        tipoStatus: typeof porId?.status
      }
    };
  }

  @Get('historico-pessoa/:nome')
  async buscarHistoricoPessoa(@Param('nome') nome: string) {
    const query = `
      SELECT 
        p.id as pessoa_id,
        p.nome,
        p.sobrenome,
        p.status_cadastro,
        e.id as estadia_id,
        e.status as estadia_status,
        e.data_checkin,
        e.data_checkout,
        e.data_limite,
        e.funcionario_checkout,
        e.observacoes_checkout,
        e.created_at as estadia_criada_em,
        e.updated_at as estadia_atualizada_em,
        c.numero as cama_numero,
        c.casa as cama_casa
      FROM pessoas p
      LEFT JOIN estadias e ON p.id = e.pessoa_id
      LEFT JOIN camas c ON e.cama_id = c.id
      WHERE LOWER(p.nome) LIKE LOWER($1)
      ORDER BY e.created_at DESC
    `;
    
    const result = await this.estadiaRepository.query(query, [`%${nome}%`]);
    return {
      total: result.length,
      registros: result
    };
  }

  @Post('testar-checkout-automatico')
  async testarCheckoutAutomatico() {
    const query = `
      SELECT 
        e.id,
        e.pessoa_id,
        e.cama_id,
        e.status,
        e.data_limite,
        p.nome as pessoa_nome,
        CURRENT_DATE as data_hoje,
        (CURRENT_DATE - e.data_limite) as dias_vencidos
      FROM estadias e
      LEFT JOIN pessoas p ON e.pessoa_id = p.id
      WHERE e.status = 'ativa'
        AND e.data_limite <= CURRENT_DATE
      ORDER BY e.data_limite
    `;
    
    const estadiasVencidas = await this.estadiaRepository.query(query);
    
    return {
      dataReferencia: new Date().toISOString(),
      totalVencidas: estadiasVencidas.length,
      estadiasVencidas: estadiasVencidas,
      proximaExecucaoCron: 'Meia-noite (00:00)',
      observacao: 'Estas estadias DEVEM ter checkout automático na próxima execução do cron'
    };
  }
}
