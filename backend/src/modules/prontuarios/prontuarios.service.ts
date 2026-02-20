import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prontuario, TipoProntuario, StatusProntuario } from '../../entities/prontuario.entity';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { UpdateProntuarioDto } from './dto/update-prontuario.dto';

@Injectable()
export class ProntuariosService {
  constructor(
    @InjectRepository(Prontuario)
    private prontuarioRepository: Repository<Prontuario>,
  ) {}

  // ============================================
  // CRIAR PRONTUÁRIO
  // ============================================
  async create(createDto: CreateProntuarioDto): Promise<Prontuario> {
    const prontuario = this.prontuarioRepository.create(createDto);
    return await this.prontuarioRepository.save(prontuario);
  }

  // ============================================
  // CRIAR PRONTUÁRIO ESPAÇO DE CUIDADOS (AUTOMÁTICO)
  // ============================================
  async criarProntuarioEspacoCuidados(dados: {
    pessoa_id: string;
    sessao_id: string;
    data_atendimento: Date;
    equipe: string[];
    servicos: {
      banho: boolean;
      atendimento: boolean;
    };
    tempos: {
      chegada: Date;
      inicio_banho?: Date;
      fim_banho?: Date;
      inicio_atendimento?: Date;
      fim_atendimento?: Date;
    };
    observacoes?: string;
    novo_cadastro: boolean;
    vezes_passou_vez: number;
  }): Promise<Prontuario> {
    // Calcular tempos de duração
    const duracaoBanho = dados.servicos.banho && dados.tempos.inicio_banho && dados.tempos.fim_banho
      ? Math.round((dados.tempos.fim_banho.getTime() - dados.tempos.inicio_banho.getTime()) / 60000)
      : null;

    const duracaoAtendimento = dados.servicos.atendimento && dados.tempos.inicio_atendimento && dados.tempos.fim_atendimento
      ? Math.round((dados.tempos.fim_atendimento.getTime() - dados.tempos.inicio_atendimento.getTime()) / 60000)
      : null;

    const duracaoTotal = dados.tempos.fim_atendimento
      ? Math.round((dados.tempos.fim_atendimento.getTime() - dados.tempos.chegada.getTime()) / 60000)
      : null;

    // Gerar título
    const servicosRealizados = [];
    if (dados.servicos.banho) servicosRealizados.push('Banho');
    if (dados.servicos.atendimento) servicosRealizados.push('Atendimento Social');
    
    const titulo = `Espaço de Cuidados - ${servicosRealizados.join(' + ')} - ${new Date(dados.data_atendimento).toLocaleDateString('pt-BR')}`;

    // Estruturar conteúdo
    const conteudo = {
      servicos_realizados: {
        banho: dados.servicos.banho,
        atendimento_social: dados.servicos.atendimento,
      },
      tempos: {
        chegada: dados.tempos.chegada,
        inicio_banho: dados.tempos.inicio_banho,
        fim_banho: dados.tempos.fim_banho,
        inicio_atendimento: dados.tempos.inicio_atendimento,
        fim_atendimento: dados.tempos.fim_atendimento,
      },
      duracao_minutos: {
        banho: duracaoBanho,
        atendimento: duracaoAtendimento,
        total: duracaoTotal,
      },
      indicadores: {
        novo_cadastro: dados.novo_cadastro,
        passou_vez: dados.vezes_passou_vez,
      },
      equipe_presente: dados.equipe,
    };

    const prontuario = this.prontuarioRepository.create({
      pessoa_id: dados.pessoa_id,
      tipo: TipoProntuario.ESPACO_CUIDADOS,
      status: StatusProntuario.FINALIZADO,
      data_atendimento: dados.data_atendimento,
      equipe: dados.equipe,
      titulo,
      conteudo,
      observacoes: dados.observacoes,
      criado_automaticamente: true,
      modulo_origem: 'espaco_cuidados',
      referencia_externa: dados.sessao_id,
      created_by: 'sistema',
    });

    return await this.prontuarioRepository.save(prontuario);
  }

  // ============================================
  // BUSCAR TODOS
  // ============================================
  async findAll(filters?: {
    pessoa_id?: string;
    tipo?: TipoProntuario;
    status?: StatusProntuario;
    modulo_origem?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ prontuarios: Prontuario[]; total: number }> {
    const query = this.prontuarioRepository.createQueryBuilder('prontuario')
      .leftJoinAndSelect('prontuario.pessoa', 'pessoa')
      .orderBy('prontuario.data_atendimento', 'DESC');

    if (filters?.pessoa_id) {
      query.andWhere('prontuario.pessoa_id = :pessoa_id', { pessoa_id: filters.pessoa_id });
    }

    if (filters?.tipo) {
      query.andWhere('prontuario.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters?.status) {
      query.andWhere('prontuario.status = :status', { status: filters.status });
    }

    if (filters?.modulo_origem) {
      query.andWhere('prontuario.modulo_origem = :modulo_origem', { modulo_origem: filters.modulo_origem });
    }

    const total = await query.getCount();

    if (filters?.limit) {
      query.take(filters.limit);
    }

    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const prontuarios = await query.getMany();

    return { prontuarios, total };
  }

  // ============================================
  // BUSCAR POR ID
  // ============================================
  async findOne(id: string): Promise<Prontuario> {
    const prontuario = await this.prontuarioRepository.findOne({
      where: { id },
      relations: ['pessoa'],
    });

    if (!prontuario) {
      throw new NotFoundException(`Prontuário ${id} não encontrado`);
    }

    return prontuario;
  }

  // ============================================
  // BUSCAR POR PESSOA
  // ============================================
  async findByPessoa(pessoa_id: string, limit = 50): Promise<Prontuario[]> {
    return await this.prontuarioRepository.find({
      where: { pessoa_id },
      relations: ['pessoa'],
      order: { data_atendimento: 'DESC' },
      take: limit,
    });
  }

  // ============================================
  // ATUALIZAR
  // ============================================
  async update(id: string, updateDto: UpdateProntuarioDto): Promise<Prontuario> {
    const prontuario = await this.findOne(id);

    Object.assign(prontuario, updateDto);

    return await this.prontuarioRepository.save(prontuario);
  }

  // ============================================
  // DELETAR
  // ============================================
  async remove(id: string): Promise<void> {
    const prontuario = await this.findOne(id);
    await this.prontuarioRepository.remove(prontuario);
  }

  // ============================================
  // ESTATÍSTICAS
  // ============================================
  async getEstatisticas(pessoa_id?: string): Promise<{
    total: number;
    por_tipo: Record<string, number>;
    por_status: Record<string, number>;
    por_modulo: Record<string, number>;
    automaticos: number;
    manuais: number;
  }> {
    const query = this.prontuarioRepository.createQueryBuilder('prontuario');

    if (pessoa_id) {
      query.where('prontuario.pessoa_id = :pessoa_id', { pessoa_id });
    }

    const prontuarios = await query.getMany();

    const stats = {
      total: prontuarios.length,
      por_tipo: {} as Record<string, number>,
      por_status: {} as Record<string, number>,
      por_modulo: {} as Record<string, number>,
      automaticos: 0,
      manuais: 0,
    };

    prontuarios.forEach(p => {
      // Tipo
      stats.por_tipo[p.tipo] = (stats.por_tipo[p.tipo] || 0) + 1;

      // Status
      stats.por_status[p.status] = (stats.por_status[p.status] || 0) + 1;

      // Módulo
      if (p.modulo_origem) {
        stats.por_modulo[p.modulo_origem] = (stats.por_modulo[p.modulo_origem] || 0) + 1;
      }

      // Automático vs Manual
      if (p.criado_automaticamente) {
        stats.automaticos++;
      } else {
        stats.manuais++;
      }
    });

    return stats;
  }
}
