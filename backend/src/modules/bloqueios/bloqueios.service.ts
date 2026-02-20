import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Bloqueio, TipoBloqueio } from '../../entities/bloqueio.entity';
import { Ocorrencia, TipoOcorrencia, SeveridadeOcorrencia } from '../../entities/ocorrencia.entity';

@Injectable()
export class BloqueiosService {
  constructor(
    @InjectRepository(Bloqueio)
    private readonly bloqueioRepository: Repository<Bloqueio>,
    @InjectRepository(Ocorrencia)
    private readonly ocorrenciaRepository: Repository<Ocorrencia>,
  ) {}

  // Buscar todos os bloqueios de uma pessoa
  async findByPessoa(pessoaId: string): Promise<Bloqueio[]> {
    return this.bloqueioRepository.find({
      where: { pessoa_id: pessoaId },
      order: { created_at: 'DESC' },
    });
  }

  // Buscar bloqueios ativos de uma pessoa
  async findAtivos(pessoaId: string): Promise<Bloqueio[]> {
    const hoje = new Date();
    return this.bloqueioRepository.find({
      where: {
        pessoa_id: pessoaId,
        ativo: true,
        data_inicio: LessThanOrEqual(hoje),
      },
      order: { data_fim: 'DESC' },
    });
  }

  // Verificar se pessoa está bloqueada
  async estaBloqueada(pessoaId: string): Promise<{ bloqueada: boolean; bloqueio?: Bloqueio }> {
    const hoje = new Date();
    const bloqueioAtivo = await this.bloqueioRepository.findOne({
      where: {
        pessoa_id: pessoaId,
        ativo: true,
        data_inicio: LessThanOrEqual(hoje),
      },
      order: { data_fim: 'DESC' },
    });

    if (bloqueioAtivo) {
      // Verificar se ainda não passou da data fim
      if (bloqueioAtivo.data_fim) {
        const dataFim = new Date(bloqueioAtivo.data_fim);
        dataFim.setHours(23, 59, 59, 999);
        if (hoje <= dataFim) {
          return { bloqueada: true, bloqueio: bloqueioAtivo };
        }
      } else {
        // Bloqueio sem data fim = bloqueio permanente
        return { bloqueada: true, bloqueio: bloqueioAtivo };
      }
    }

    return { bloqueada: false };
  }

  // Criar novo bloqueio
  async criar(data: {
    pessoa_id: string;
    tipo: TipoBloqueio;
    motivo: string;
    dias_bloqueio?: number;
    criado_por: string;
    observacoes?: string;
  }): Promise<Bloqueio> {
    const bloqueio = new Bloqueio();
    bloqueio.pessoa_id = data.pessoa_id;
    bloqueio.tipo = data.tipo;
    bloqueio.motivo = data.motivo;
    bloqueio.data_inicio = new Date();
    bloqueio.criado_por = data.criado_por;
    bloqueio.ativo = true;
    bloqueio.observacoes = data.observacoes;

    if (data.dias_bloqueio) {
      bloqueio.dias_bloqueio = data.dias_bloqueio;
      const dataFim = new Date();
      dataFim.setDate(dataFim.getDate() + data.dias_bloqueio);
      bloqueio.data_fim = dataFim;
    }

    return this.bloqueioRepository.save(bloqueio);
  }

  // Liberação antecipada de bloqueio
  async liberarAntecipadamente(
    bloqueioId: string,
    motivo: string,
    liberadoPor: string,
  ): Promise<Bloqueio> {
    const bloqueio = await this.bloqueioRepository.findOne({
      where: { id: bloqueioId },
      relations: ['pessoa'],
    });

    if (!bloqueio) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    if (!bloqueio.ativo) {
      throw new BadRequestException('Este bloqueio já foi encerrado');
    }

    // Verificar se já foi liberado antecipadamente
    if (bloqueio.liberacao_antecipada) {
      throw new BadRequestException('Este bloqueio já teve liberação antecipada');
    }

    // Registrar liberação antecipada
    bloqueio.liberacao_antecipada = true;
    bloqueio.data_liberacao_antecipada = new Date();
    // bloqueio.motivo_liberacao_antecipada = motivo;
    bloqueio.liberado_por = liberadoPor;
    bloqueio.ativo = false;

    await this.bloqueioRepository.save(bloqueio);

    // Registrar ocorrência de liberação antecipada no histórico
    const ocorrencia = new Ocorrencia();
    ocorrencia.pessoa_id = bloqueio.pessoa_id;
    ocorrencia.tipo = TipoOcorrencia.OUTROS;
    ocorrencia.severidade = SeveridadeOcorrencia.BAIXA;
    ocorrencia.titulo = 'Liberação Antecipada de Bloqueio';
    ocorrencia.descricao = `Bloqueio por "${bloqueio.tipo}" foi liberado antecipadamente. Motivo: ${motivo}. Liberado por: ${liberadoPor}`;
    ocorrencia.criado_por = liberadoPor;
    ocorrencia.data_ocorrencia = new Date();

    await this.ocorrenciaRepository.save(ocorrencia);

    return bloqueio;
  }

  // Encerrar bloqueio (quando vencido ou manualmente)
  async encerrar(bloqueioId: string, motivo?: string): Promise<Bloqueio> {
    const bloqueio = await this.bloqueioRepository.findOne({
      where: { id: bloqueioId },
    });

    if (!bloqueio) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    bloqueio.ativo = false;
    if (motivo) {
      bloqueio.observacoes = (bloqueio.observacoes || '') + ` | Encerrado: ${motivo}`;
    }

    return this.bloqueioRepository.save(bloqueio);
  }

  // Buscar bloqueio por ID
  async findById(id: string): Promise<Bloqueio | null> {
    return this.bloqueioRepository.findOne({
      where: { id },
      relations: ['pessoa'],
    });
  }

  // Listar todos os bloqueios ativos no sistema
  async findAllAtivos(): Promise<Bloqueio[]> {
    const hoje = new Date();
    return this.bloqueioRepository.find({
      where: {
        ativo: true,
        data_inicio: LessThanOrEqual(hoje),
      },
      relations: ['pessoa'],
      order: { data_fim: 'ASC' },
    });
  }
}
