import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Plantao } from '../../entities/plantao.entity';
import { RegraEscala } from '../../entities/regra-escala.entity';
import { Colaborador } from '../../entities/colaborador.entity';
import { Turno } from '../../entities/turno.entity';

export interface PlantaoFilters {
  data_inicio?: string;
  data_fim?: string;
  colaborador_id?: string;
  turno_id?: string;
}

export interface PlantaoDto {
  id: string;
  colaborador: {
    id: string;
    nome: string;
    funcao: string;
  };
  data: string;
  resumo_turno: string;
  unidade: string;
  colaborador_nome?: string;
}

@Injectable()
export class PlantoesService {
  constructor(
    @InjectRepository(Plantao)
    private plantaoRepository: Repository<Plantao>,
    @InjectRepository(RegraEscala)
    private regraEscalaRepository: Repository<RegraEscala>,
    @InjectRepository(Colaborador)
    private colaboradorRepository: Repository<Colaborador>,
    @InjectRepository(Turno)
    private turnoRepository: Repository<Turno>,
  ) {}

  async findAll(filters: PlantaoFilters = {}): Promise<PlantaoDto[]> {
    const queryBuilder = this.plantaoRepository.createQueryBuilder('plantao')
      .leftJoinAndSelect('plantao.colaborador', 'colaborador');

    // Aplicar filtros se fornecidos
    if (filters.data_inicio) {
      queryBuilder.andWhere('plantao.data >= :dataInicio', { dataInicio: filters.data_inicio });
    }
    if (filters.data_fim) {
      queryBuilder.andWhere('plantao.data <= :dataFim', { dataFim: filters.data_fim });
    }
    if (filters.colaborador_id) {
      queryBuilder.andWhere('plantao.colaborador_id = :colaboradorId', { colaboradorId: filters.colaborador_id });
    }

    const plantoes = await queryBuilder.orderBy('plantao.data', 'ASC').getMany();

    return plantoes.map(plantao => ({
      id: plantao.id,
      colaborador: {
        id: plantao.colaborador.id,
        nome: plantao.colaborador.nome,
        funcao: plantao.colaborador.funcao,
      },
      data: new Date(plantao.data).toISOString().split('T')[0],
      resumo_turno: plantao.resumo_turno,
      unidade: plantao.unidade,
      colaborador_nome: plantao.colaborador.nome,
    }));
  }

  async gerarPlantoes(dataInicio: Date, dataFim: Date): Promise<void> {
    console.log('Iniciando geração de plantões:', { dataInicio, dataFim });

    // Buscar todas as regras ativas
    const regras = await this.regraEscalaRepository.find({
      relations: ['colaborador', 'turno'],
    });

    console.log('Total de regras encontradas:', regras.length);

    // Filtrar apenas regras com colaboradores ativos
    const regrasAtivas = regras.filter(regra => regra.colaborador?.ativo === true);

    console.log('Regras ativas encontradas:', regrasAtivas.length);
    console.log('Detalhes das regras ativas:', regrasAtivas.map(r => ({
      id: r.id,
      colaborador: r.colaborador?.nome,
      turno: r.turno?.nome,
      dias_semana: r.dias_semana,
      data_inicio: r.data_inicio,
      data_fim: r.data_fim
    })));

    // Limpar plantões existentes no período
    await this.plantaoRepository
      .createQueryBuilder()
      .delete()
      .where('data BETWEEN :dataInicio AND :dataFim', { dataInicio, dataFim })
      .execute();

    const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const plantoes: Plantao[] = [];

    console.log('Iniciando loop de datas de', dataInicio, 'até', dataFim);

    // Para cada dia no período
    for (let data = new Date(dataInicio); data <= dataFim; data.setDate(data.getDate() + 1)) {
      const diaSemanaNumero = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.
      const diaSemanaString = diasDaSemana[diaSemanaNumero]; // String para salvar no banco

      console.log('Processando data:', data.toISOString().split('T')[0], 'dia da semana:', diaSemanaString);

      // Para cada regra
      for (const regra of regrasAtivas) {
        console.log('Verificando regra:', regra.id, 'dias_semana:', regra.dias_semana);

        // Verificar se a regra se aplica a este dia
        const diaAplicavel = !regra.dias_semana || regra.dias_semana.includes(diaSemanaNumero);
        
        // Normalizar datas para comparação (remover hora)
        const normalizeDate = (d: Date | string) => {
          const date = typeof d === 'string' ? new Date(d) : d;
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        };
        
        const dataNormalized = normalizeDate(data);
        const dataInicioNormalized = regra.data_inicio ? normalizeDate(regra.data_inicio) : null;
        const dataFimNormalized = regra.data_fim ? normalizeDate(regra.data_fim) : null;
        
        const dataAplicavel = (!dataInicioNormalized || dataNormalized >= dataInicioNormalized) &&
                             (!dataFimNormalized || dataNormalized <= dataFimNormalized);

        console.log('Dia aplicável:', diaAplicavel, 'Data aplicável:', dataAplicavel, 'dataNormalized:', dataNormalized, 'dataInicioNormalized:', dataInicioNormalized, 'dataFimNormalized:', dataFimNormalized);

        if (diaAplicavel && dataAplicavel) {
          console.log('Criando plantão para regra:', regra.id);
          const plantao = this.plantaoRepository.create({
            colaborador_id: regra.colaborador_id,
            data: new Date(data),
            resumo_turno: 'Gerado por regra', // Placeholder
            unidade: 'Geral', // Placeholder
          });
          plantoes.push(plantao);
        }
      }
    }

    console.log('Total de plantões a salvar:', plantoes.length);

    // Salvar todos os plantões
    if (plantoes.length > 0) {
      await this.plantaoRepository.save(plantoes);
      console.log(`${plantoes.length} plantões salvos`);
    } else {
      console.log('Nenhum plantão para salvar');
    }
  }
}
