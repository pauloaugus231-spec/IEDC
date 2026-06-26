import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estadia, StatusEstadia, MotivoSaida, TipoEstadia } from '../../entities/estadia.entity';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { Cama, StatusCama, Casa } from '../../entities/cama.entity';
import { Pessoa, StatusCadastro } from '../../entities/pessoa.entity';
import { DashboardService } from '../dashboard/dashboard.service';
import { DiasCruzGateway } from '../websocket/websocket.gateway';
import { getNomePrincipal } from '../../common/utils/pessoa-nome.util';

const DIAS_ESTADIA_NOVA = 30;
const DIAS_ATE_LIMITE_NOVA = DIAS_ESTADIA_NOVA - 1;

interface DuplicacaoCamaRow {
  cama_id: string;
  count: string;
  estadia_ids: string;
  datas_checkin: string;
}

interface CorrigirDuplicacoesItem {
  pessoa?: string;
  camaOrigem?: number;
  casaOrigem?: Casa;
  camaDestino?: number;
  casaDestino?: Casa;
  mesma_casa?: boolean;
  erro?: string;
  cama?: number;
  casa?: Casa;
  total_pessoas?: string;
}

export interface CorrigirDuplicacoesResultado {
  corrigidas: number;
  detalhes: CorrigirDuplicacoesItem[];
  mensagem?: string;
}

interface DiagnosticoEstadiaCama {
  estadia_id: string;
  pessoa_id: string;
  pessoa_nome?: string;
  data_checkin: Date;
  cama_id: string | null | undefined;
  cama_numero: number;
  casa: Casa;
}

interface DiagnosticoDuplicacaoCama {
  casa: string;
  cama_numero: number;
  total_pessoas: number;
  estadias: DiagnosticoEstadiaCama[];
}

interface DiagnosticoCasaResumo {
  numero: number;
  ocupantes: number;
  pessoas: Array<string | undefined>;
}

export interface DiagnosticoCamasResultado {
  total_estadias_ativas: number;
  duplicacoes_encontradas: number;
  duplicacoes: DiagnosticoDuplicacaoCama[];
  camas_livres: Record<'masculina' | 'feminina' | 'idosos' | 'lgbt', number[]>;
  resumo_ocupacao: Record<'masculina' | 'feminina' | 'idosos' | 'lgbt', DiagnosticoCasaResumo[]>;
}

@Injectable()
export class EstadiasService {
  constructor(
    @InjectRepository(Estadia)
    private estadiaRepository: Repository<Estadia>,
    @InjectRepository(Cama)
    private camaRepository: Repository<Cama>,
    @InjectRepository(Pessoa)
    private pessoaRepository: Repository<Pessoa>,
    private readonly dashboardService: DashboardService,
    private readonly websocketGateway: DiasCruzGateway,
  ) {}

  private async notificarAtualizacaoOcupacao() {
    const ocupacao = await this.dashboardService.getOcupacao();
    this.websocketGateway.server.emit('atualizar_ocupacao', ocupacao);
  }

  async checkin(createCheckinDto: CreateCheckinDto): Promise<Estadia> {
    const { pessoa_id, cama_id, funcionario, tipo_estadia = TipoEstadia.COMPLETA } = createCheckinDto;

    // Usar transação para garantir a atomicidade da operação
    const estadia = await this.estadiaRepository.manager.transaction(async transactionalEntityManager => {
      // 1. Verificar se a pessoa existe e se não está ativa
      const pessoa = await transactionalEntityManager.findOne(Pessoa, { where: { id: pessoa_id } });
      if (!pessoa) {
        throw new NotFoundException(`Pessoa com ID ${pessoa_id} não encontrada.`);
      }

      // Verificar se a pessoa já tem uma estadia ativa
      const estadiaAtivaExistente = await transactionalEntityManager.findOne(Estadia, {
        where: { pessoa_id, status: StatusEstadia.ATIVA },
      });

      if (estadiaAtivaExistente) {
        throw new ConflictException(`Pessoa ${getNomePrincipal(pessoa)} já possui uma estadia ativa desde ${estadiaAtivaExistente.data_checkin.toLocaleDateString('pt-BR')}.`);
      }

      // Verificar regra de retorno após checkout
      const ultimaEstadia = await transactionalEntityManager.findOne(Estadia, {
        where: { pessoa_id },
        order: { data_checkout: 'DESC' },
      });

      if (ultimaEstadia && ultimaEstadia.data_checkout) {
        const hoje = new Date();
        const checkout = new Date(ultimaEstadia.data_checkout);
        const diffTime = hoje.getTime() - checkout.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Permite check-in se liberacao_antecipada for true (sem prazo de expiração)
        if (diffDays < 15) {
          if (pessoa.liberacao_antecipada) {
            // Após usar a liberação, zera o campo para não permitir múltiplos usos
            pessoa.liberacao_antecipada = false;
            pessoa.data_liberacao_antecipada = undefined;
            await transactionalEntityManager.save(pessoa);
          } else {
            throw new ConflictException(`Pessoa ${getNomePrincipal(pessoa)} deve aguardar 15 noites após o checkout. Último checkout: ${checkout.toLocaleDateString('pt-BR')}.`);
          }
        }
      }

      // 2. Verificar se a cama existe e está disponível
      const cama = await transactionalEntityManager.findOne(Cama, { where: { id: cama_id } });
      if (!cama) {
        throw new NotFoundException(`Cama com ID ${cama_id} não encontrada.`);
      }
      if (cama.status !== StatusCama.DISPONIVEL) {
        throw new ConflictException(`Cama ${cama.numero} (${cama.casa}) não está disponível.`);
      }

      // 2.1. CRÍTICO: Verificar se já existe uma estadia ativa nesta cama (prevenir duplicação)
      const estadiaExistenteNaCama = await transactionalEntityManager.findOne(Estadia, {
        where: { cama_id, status: StatusEstadia.ATIVA },
        relations: ['pessoa'],
      });

      if (estadiaExistenteNaCama) {
        throw new ConflictException(
          `ERRO: Cama ${cama.numero} (${cama.casa}) já está ocupada por ${getNomePrincipal(estadiaExistenteNaCama.pessoa, 'outro hóspede')}. ` +
          `Por favor, selecione outra cama disponível.`
        );
      }

      // 3. Atualizar o status da cama para OCUPADA
      cama.status = StatusCama.OCUPADA;
      await transactionalEntityManager.save(cama);

      // 4. Atualizar o status da pessoa para ATIVA
      pessoa.status_cadastro = StatusCadastro.ATIVA;
      await transactionalEntityManager.save(pessoa);

      // 5. Criar a nova estadia
      // REGRA: Check-in no dia X conta como 1ª noite
      // Para 30 dias: última noite é dia X+29
      // Exemplo: Check-in 20/12 → noites: 20/12...18/01 (30 noites)
      // data_limite = 18/01 (última noite permitida)
      const now = new Date();
      const data_limite = new Date(now);
      // PERNOITE: data_limite = hoje (checkout automático na meia-noite seguinte)
      // COMPLETA: data_limite = hoje + 29 dias = 30 noites totais
      const diasAteLimite = tipo_estadia === TipoEstadia.PERNOITE ? 0 : DIAS_ATE_LIMITE_NOVA;
      data_limite.setDate(now.getDate() + diasAteLimite);
      data_limite.setHours(0, 0, 0, 0);

      console.log(`📅 Check-in: ${now.toISOString()} | Tipo: ${tipo_estadia}`);
      console.log(`📅 Data limite: ${data_limite.toISOString()}`);

      const novaEstadia = this.estadiaRepository.create({
        pessoa_id,
        cama_id: cama.id,
        data_checkin: now,
        data_limite,
        tipo_estadia,
        status: StatusEstadia.ATIVA,
        funcionario_checkin: funcionario || 'sistema',
      });

      const estadia = await transactionalEntityManager.save(novaEstadia);

      return estadia;
    });

    await this.notificarAtualizacaoOcupacao();
    return estadia;
  }

  async checkout(
    pessoa_id: string,
    funcionario?: string,
    observacoes_checkout?: string,
    motivo_saida?: MotivoSaida,
    data_checkout_override?: Date,
  ): Promise<Estadia> {
    const estadia = await this.estadiaRepository.manager.transaction(async transactionalEntityManager => {
      // 1. Encontrar a estadia ativa para a pessoa
      const estadiaAtiva = await transactionalEntityManager.findOne(Estadia, {
        where: { pessoa_id, status: StatusEstadia.ATIVA },
      });

      if (!estadiaAtiva) {
        throw new NotFoundException(`Nenhuma estadia ativa encontrada para a pessoa com ID ${pessoa_id}.`);
      }

      // 2. Atualizar a estadia
      estadiaAtiva.data_checkout = data_checkout_override ?? new Date();
      estadiaAtiva.status = motivo_saida === MotivoSaida.AUTOMATICO
        ? StatusEstadia.CHECKOUT_AUTOMATICO
        : StatusEstadia.FINALIZADA;
      estadiaAtiva.funcionario_checkout = funcionario || 'sistema';
      estadiaAtiva.motivo_saida = motivo_saida || MotivoSaida.VOLUNTARIO;
      if (observacoes_checkout) {
        estadiaAtiva.observacoes_checkout = observacoes_checkout;
      }
      await transactionalEntityManager.save(estadiaAtiva);

      // 3. Liberar a cama
      if (estadiaAtiva.cama_id) {
        const cama = await transactionalEntityManager.findOne(Cama, { where: { id: estadiaAtiva.cama_id } });
        if (cama) {
          cama.status = StatusCama.DISPONIVEL;
          await transactionalEntityManager.save(cama);
        }
      }

      // 4. Atualizar o status da pessoa para INATIVO
      const pessoa = await transactionalEntityManager.findOne(Pessoa, { where: { id: pessoa_id } });
      if (pessoa) {
        pessoa.status_cadastro = StatusCadastro.INATIVO;
        await transactionalEntityManager.save(pessoa);
      }

      return estadiaAtiva;
    });

    await this.notificarAtualizacaoOcupacao();
    return estadia;
  }

  async findByPessoaId(pessoa_id: string) {
    const estadias = await this.estadiaRepository.find({
      where: { pessoa_id: pessoa_id },
      order: { data_checkin: 'DESC' },
      relations: ['cama'],
      select: {
        id: true,
        data_checkin: true,
        data_checkout: true,
        data_limite: true,
        status: true,
        prorrogada: true,
        dias_prorrogacao: true,
        motivo_prorrogacao: true,
        motivo_saida: true,
        observacoes_checkin: true,
        observacoes_checkout: true,
        funcionario_checkin: true,
        funcionario_checkout: true,
        cama_id: true,
        cama: {
          id: true,
          numero: true,
          casa: true,
        }
      }
    });
    if (!estadias) {
      throw new NotFoundException(`Nenhuma estadia encontrada para a pessoa com ID ${pessoa_id}.`);
    }
    return estadias;
  }

  async prorrogacao(estadiaId: string, diasExtras: number, motivo?: string) {
    const estadia = await this.estadiaRepository.findOne({ where: { id: estadiaId } });
    if (!estadia) {
      throw new NotFoundException(`Estadia com ID ${estadiaId} não encontrada.`);
    }

    if (estadia.status !== StatusEstadia.ATIVA) {
      throw new ConflictException('Não é possível prorrogar uma estadia que não está ativa.');
    }

    const dataLimiteAtual = new Date(estadia.data_limite);
    dataLimiteAtual.setHours(0, 0, 0, 0); // Resetar horas para evitar problemas de arredondamento

    const novaDataLimite = new Date(dataLimiteAtual);
    novaDataLimite.setDate(dataLimiteAtual.getDate() + diasExtras);

    await this.estadiaRepository.update(estadiaId, {
      data_limite: novaDataLimite,
      prorrogada: true,
      dias_prorrogacao: (estadia.dias_prorrogacao || 0) + diasExtras,
      motivo_prorrogacao: motivo,
    });

    return this.estadiaRepository.findOne({ where: { id: estadiaId } });
  }

  async diagnosticarCheckoutPendente() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    console.log('📅 Data de referência:', hoje.toISOString());
    console.log('🌍 Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Buscar todas as estadias ativas
    const estadiasAtivas = await this.estadiaRepository.find({
      where: { status: StatusEstadia.ATIVA },
      relations: ['pessoa', 'cama'],
      order: { data_limite: 'ASC' },
    });

    console.log(`📋 Total de estadias ativas: ${estadiasAtivas.length}`);

    const estadiasVencidas = estadiasAtivas.filter(e => {
      // Converter data_limite para Date sem problema de timezone
      // data_limite é armazenado como DATE no banco (sem hora)
      const dataLimiteValue: unknown = e.data_limite;
      const dataLimiteStr = typeof dataLimiteValue === 'string' 
        ? dataLimiteValue.split('T')[0]  // Pegar apenas YYYY-MM-DD
        : (dataLimiteValue instanceof Date ? dataLimiteValue : new Date(String(dataLimiteValue))).toISOString().split('T')[0];
      
      const dataLimite = new Date(dataLimiteStr + 'T00:00:00.000Z');
      const hojeStr = hoje.toISOString().split('T')[0];
      const hojeUTC = new Date(hojeStr + 'T00:00:00.000Z');
      
      return dataLimite <= hojeUTC;
    });

    const resultado = {
      dataReferencia: hoje.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      totalEstadiasAtivas: estadiasAtivas.length,
      totalVencidas: estadiasVencidas.length,
      estadiasVencidas: estadiasVencidas.map(e => ({
        id: e.id,
        pessoa: {
          id: e.pessoa?.id,
          nome: getNomePrincipal(e.pessoa),
        },
        cama: {
          id: e.cama_id,
          numero: e.cama?.numero,
          casa: e.cama?.casa,
        },
        data_checkin: e.data_checkin,
        data_limite: e.data_limite,
        diasVencidos: Math.ceil((hoje.getTime() - new Date(e.data_limite).getTime()) / (1000 * 60 * 60 * 24)),
        prorrogada: e.prorrogada,
        dias_prorrogacao: e.dias_prorrogacao,
      })),
    };

    console.log('🔍 Resultado do diagnóstico:', JSON.stringify(resultado, null, 2));
    return resultado;
  }

  async trocarCama(estadiaOrigemId: string, camaDestinoId: string) {
    const estadiaOrigem = await this.estadiaRepository.findOne({ 
      where: { id: estadiaOrigemId, status: StatusEstadia.ATIVA }, 
      relations: ['cama', 'pessoa'] 
    });
    const camaDestino = await this.camaRepository.findOne({ where: { id: camaDestinoId } });

    if (!estadiaOrigem) {
      throw new NotFoundException('Estadia de origem não encontrada ou não está ativa');
    }
    if (!camaDestino) {
      throw new NotFoundException('Cama de destino não encontrada');
    }

    const camaOrigemId = estadiaOrigem.cama_id;

    // CRÍTICO: Verificar se há outra estadia ativa na cama destino
    const estadiaDestino = await this.estadiaRepository.findOne({ 
      where: { cama_id: camaDestinoId, status: StatusEstadia.ATIVA },
      relations: ['pessoa', 'cama']
    });

    // Usar transação para garantir atomicidade e prevenir condições de corrida
    return await this.estadiaRepository.manager.transaction(async transactionalEntityManager => {
      if (estadiaDestino) {
        // ===== TROCA MÚTUA: Ambas as pessoas trocam de cama =====
        
        // 1. Mover estadia origem para fora da cama original durante a troca.
        await transactionalEntityManager.query(
          `UPDATE estadias SET cama_id = NULL WHERE id = $1`,
          [estadiaOrigemId]
        );
        
        // 3. Mover estadia destino para cama origem
        await transactionalEntityManager.query(
          `UPDATE estadias SET cama_id = $1 WHERE id = $2`,
          [camaOrigemId, estadiaDestino.id]
        );
        
        // 4. Mover estadia origem (que está NULL) para cama destino
        await transactionalEntityManager.query(
          `UPDATE estadias SET cama_id = $1 WHERE id = $2`,
          [camaDestinoId, estadiaOrigemId]
        );

        // Status das camas permanece OCUPADA (ambas continuam ocupadas)

      } else {
        // ===== TRANSFERÊNCIA SIMPLES: Cama destino está livre =====
        
        // 1. Mover pessoa para cama livre
        await transactionalEntityManager.update(Estadia, estadiaOrigemId, { cama_id: camaDestinoId });
        
        // 2. Atualizar status das camas
        if (camaOrigemId) {
          await transactionalEntityManager.update(Cama, camaOrigemId, { status: StatusCama.DISPONIVEL });
        }
        await transactionalEntityManager.update(Cama, camaDestinoId, { status: StatusCama.OCUPADA });
      }

      // Retornar resultado
      return { 
        message: estadiaDestino 
          ? `Troca mútua realizada: ${getNomePrincipal(estadiaOrigem.pessoa)} ↔ ${getNomePrincipal(estadiaDestino.pessoa)}`
          : `Transferência realizada: ${getNomePrincipal(estadiaOrigem.pessoa)} movido com sucesso`,
        tipo: estadiaDestino ? 'troca_mutua' : 'transferencia'
      };
    });

    // Notificar atualização via WebSocket (fora da transação)
    await this.notificarAtualizacaoOcupacao();
    
    return { 
      message: estadiaDestino 
        ? `Troca mútua realizada: ${getNomePrincipal(estadiaOrigem?.pessoa)} ↔ ${getNomePrincipal(estadiaDestino?.pessoa)}`
        : `Transferência realizada: ${getNomePrincipal(estadiaOrigem?.pessoa)} movido com sucesso`,
      tipo: estadiaDestino ? 'troca_mutua' : 'transferencia'
    };
  }

  // Registrar abandono de vaga
  async registrarAbandono(pessoa_id: string, funcionario?: string, observacoes?: string): Promise<Estadia> {
    const estadia = await this.estadiaRepository.manager.transaction(async transactionalEntityManager => {
      const estadiaAtiva = await transactionalEntityManager.findOne(Estadia, {
        where: { pessoa_id, status: StatusEstadia.ATIVA },
      });

      if (!estadiaAtiva) {
        throw new NotFoundException(`Nenhuma estadia ativa encontrada para a pessoa com ID ${pessoa_id}.`);
      }

      // Atualizar a estadia como abandono
      estadiaAtiva.data_checkout = new Date();
      estadiaAtiva.status = StatusEstadia.ABANDONO;
      estadiaAtiva.motivo_saida = MotivoSaida.ABANDONO;
      estadiaAtiva.funcionario_checkout = funcionario || 'sistema';
      estadiaAtiva.observacoes_checkout = observacoes || 'Pessoa abandonou a vaga sem aviso prévio.';
      await transactionalEntityManager.save(estadiaAtiva);

      // Liberar a cama
      if (estadiaAtiva.cama_id) {
        const cama = await transactionalEntityManager.findOne(Cama, { where: { id: estadiaAtiva.cama_id } });
        if (cama) {
          cama.status = StatusCama.DISPONIVEL;
          await transactionalEntityManager.save(cama);
        }
      }

      // Atualizar status da pessoa
      const pessoa = await transactionalEntityManager.findOne(Pessoa, { where: { id: pessoa_id } });
      if (pessoa) {
        pessoa.status_cadastro = StatusCadastro.INATIVO;
        await transactionalEntityManager.save(pessoa);
      }

      return estadiaAtiva;
    });

    await this.notificarAtualizacaoOcupacao();
    return estadia;
  }

  // Corrigir duplicações de cama
  async corrigirDuplicacoes(): Promise<CorrigirDuplicacoesResultado> {
    const duplicacoes = await this.estadiaRepository
      .createQueryBuilder('estadia')
      .select('estadia.cama_id', 'cama_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('array_agg(estadia.id)', 'estadia_ids')
      .addSelect('array_agg(estadia.data_checkin)', 'datas_checkin')
      .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
      .groupBy('estadia.cama_id')
      .having('COUNT(*) > 1')
      .getRawMany<DuplicacaoCamaRow>();

    if (duplicacoes.length === 0) {
      return { corrigidas: 0, detalhes: [], mensagem: 'Nenhuma duplicação encontrada' };
    }

    const resultados: CorrigirDuplicacoesItem[] = [];

    for (const dup of duplicacoes) {
      const camaAtual = await this.camaRepository.findOne({ where: { id: dup.cama_id } });
      
      if (!camaAtual) continue;
      
      // Buscar cama livre na mesma casa
      let camaLivre = await this.camaRepository
        .createQueryBuilder('cama')
        .where('cama.casa = :casa', { casa: camaAtual.casa })
        .andWhere('cama.status = :status', { status: StatusCama.DISPONIVEL })
        .orderBy('cama.numero', 'ASC')
        .getOne();

      // Se não houver cama livre na mesma casa, buscar em qualquer casa
      if (!camaLivre) {
        camaLivre = await this.camaRepository
          .createQueryBuilder('cama')
          .where('cama.status = :status', { status: StatusCama.DISPONIVEL })
          .orderBy('cama.numero', 'ASC')
          .getOne();
      }

      if (camaLivre) {
        // Pegar a estadia mais recente para mover
        const estadiaIds = dup.estadia_ids.slice(1, -1).split(',');
        const datasMaisRecentes = dup.datas_checkin.slice(1, -1).split(',');
        
        // Encontrar índice da data mais recente
        let indiceMaisRecente = 0;
        let dataMaisRecente = new Date(datasMaisRecentes[0].replace(/"/g, ''));
        
        for (let i = 1; i < datasMaisRecentes.length; i++) {
          const data = new Date(datasMaisRecentes[i].replace(/"/g, ''));
          if (data > dataMaisRecente) {
            dataMaisRecente = data;
            indiceMaisRecente = i;
          }
        }
        
        const estadiaParaMover = await this.estadiaRepository.findOne({
          where: { id: estadiaIds[indiceMaisRecente] },
          relations: ['pessoa'],
        });

        if (estadiaParaMover) {
          // Mover para cama livre
          estadiaParaMover.cama_id = camaLivre.id;
          await this.estadiaRepository.save(estadiaParaMover);

          // Atualizar status das camas
          camaLivre.status = StatusCama.OCUPADA;
          await this.camaRepository.save(camaLivre);

          resultados.push({
            pessoa: getNomePrincipal(estadiaParaMover.pessoa),
            camaOrigem: camaAtual.numero,
            casaOrigem: camaAtual.casa,
            camaDestino: camaLivre.numero,
            casaDestino: camaLivre.casa,
            mesma_casa: camaAtual.casa === camaLivre.casa,
          });
        }
      } else {
        resultados.push({
          erro: 'Sem camas disponíveis',
          cama: camaAtual.numero,
          casa: camaAtual.casa,
          total_pessoas: dup.count,
        });
      }
    }

    await this.notificarAtualizacaoOcupacao();
    return {
      corrigidas: resultados.filter(r => !r.erro).length,
      detalhes: resultados,
    };
  }

  // Diagnosticar problemas de camas
  async diagnosticarCamas(): Promise<DiagnosticoCamasResultado> {
    // Buscar todas as estadias ativas
    const estadiasAtivas = await this.estadiaRepository.find({
      where: { status: StatusEstadia.ATIVA },
      relations: ['cama', 'pessoa'],
      order: { cama: { numero: 'ASC' } },
    });

    // Agrupar por cama
    const camaMap = new Map<string, DiagnosticoEstadiaCama[]>();
    
    for (const estadia of estadiasAtivas) {
      if (estadia.cama) {
        const key = `${estadia.cama.casa}-${estadia.cama.numero}`;
        if (!camaMap.has(key)) {
          camaMap.set(key, []);
        }
        const arr = camaMap.get(key);
        if (arr) {
          arr.push({
            estadia_id: estadia.id,
            pessoa_id: estadia.pessoa_id,
            pessoa_nome: getNomePrincipal(estadia.pessoa),
            data_checkin: estadia.data_checkin,
            cama_id: estadia.cama_id,
            cama_numero: estadia.cama.numero,
            casa: estadia.cama.casa,
          });
        }
      }
    }

    // Encontrar duplicações
    const duplicacoes: DiagnosticoDuplicacaoCama[] = [];
    const camasPorCasa: Record<'masculina' | 'feminina' | 'idosos' | 'lgbt', DiagnosticoCasaResumo[]> = {
      masculina: [],
      feminina: [],
      idosos: [],
      lgbt: [],
    };
    
    for (const [key, estadias] of camaMap.entries()) {
      const [casa, numero] = key.split('-');
      
      if (estadias.length > 1) {
        duplicacoes.push({
          casa,
          cama_numero: parseInt(numero),
          total_pessoas: estadias.length,
          estadias,
        });
      }
      
      // Organizar por casa
      const casaKey = casa.toLowerCase() as keyof typeof camasPorCasa;
      if (casaKey in camasPorCasa) {
        camasPorCasa[casaKey].push({
          numero: parseInt(numero),
          ocupantes: estadias.length,
          pessoas: estadias.map(e => e.pessoa_nome),
        });
      }
    }

    // Buscar camas livres por casa
    const camasLivres = await this.camaRepository.find({
      where: { status: StatusCama.DISPONIVEL },
      order: { casa: 'ASC', numero: 'ASC' },
    });

    const camasLivresPorCasa = {
      masculina: camasLivres.filter(c => c.casa === Casa.MASCULINA).map(c => c.numero),
      feminina: camasLivres.filter(c => c.casa === Casa.MISTA_MULHERES).map(c => c.numero),
      idosos: camasLivres.filter(c => c.casa === Casa.IDOSOS).map(c => c.numero),
      lgbt: camasLivres.filter(c => c.casa === Casa.LGBT).map(c => c.numero),
    };

    return {
      total_estadias_ativas: estadiasAtivas.length,
      duplicacoes_encontradas: duplicacoes.length,
      duplicacoes,
      camas_livres: camasLivresPorCasa,
      resumo_ocupacao: camasPorCasa,
    };
  }
}
