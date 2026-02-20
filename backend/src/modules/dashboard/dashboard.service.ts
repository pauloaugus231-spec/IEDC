import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Estadia, StatusEstadia } from '../../entities/estadia.entity';
import { Cama } from '../../entities/cama.entity';
import { Pessoa } from '../../entities/pessoa.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Estadia)
    private readonly estadiaRepo: Repository<Estadia>,
    @InjectRepository(Cama)
    private readonly camaRepo: Repository<Cama>,
    @InjectRepository(Pessoa)
    private readonly pessoaRepo: Repository<Pessoa>,
  ) {}

  async getOcupacao() {
    // 1. Contar estadias ativas agrupadas por casa
    const ocupacaoPorCasa = await this.estadiaRepo
      .createQueryBuilder('estadia')
      .innerJoin(Cama, 'cama', 'estadia.cama_id = cama.id')
      .select('cama.casa', 'casa')
      .addSelect('COUNT(estadia.id)', 'ocupadas')
      .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
      .groupBy('cama.casa')
      .getRawMany();

    // 2. Contar o total de camas por casa
    const capacidadePorCasa = await this.camaRepo
      .createQueryBuilder('cama')
      .select('cama.casa', 'casa')
      .addSelect('COUNT(cama.id)', 'total')
      .groupBy('cama.casa')
      .getRawMany();

    // 3. Consolidar os dados no formato esperado pelo frontend
    const casas: { [key: string]: { ocupadas: number; total: number } } = {};
    let totalOcupadas = 0;
    let totalVagas = 0;

    capacidadePorCasa.forEach(c => {
      const casaNome = c.casa;
      const capacidade = parseInt(c.total, 10);
      casas[casaNome] = {
        ocupadas: 0, // Inicializa com 0
        total: capacidade,
      };
      totalVagas += capacidade;
    });

    ocupacaoPorCasa.forEach(o => {
      const casaNome = o.casa;
      const ocupadas = parseInt(o.ocupadas, 10);
      if (casas[casaNome]) {
        casas[casaNome].ocupadas = ocupadas;
      }
      totalOcupadas += ocupadas;
    });

    return {
      casas,
      total: {
        ocupadas: totalOcupadas,
        total: totalVagas,
      },
    };
  }

  async getRelatoriosSociais(inicio?: string, fim?: string) {
    const dataInicio = inicio ? new Date(inicio) : new Date('2023-01-01');
    const dataFim = fim ? new Date(fim) : new Date();

    // Total de cadastros
    const totalCadastros = await this.pessoaRepo.count({ where: { ativo: true } });

    // Novos cadastros no período
    const novosCadastros = await this.pessoaRepo.count({
      where: {
        ativo: true,
        created_at: Between(dataInicio, dataFim),
      },
    });

    // Distribuição por gênero
    const generoQuery = await this.pessoaRepo
      .createQueryBuilder('pessoa')
      .select('pessoa.genero', 'genero')
      .addSelect('COUNT(pessoa.id)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.genero IS NOT NULL')
      .groupBy('pessoa.genero')
      .getRawMany();

    const genero: { [key: string]: number } = {};
    generoQuery.forEach(g => {
      genero[g.genero] = parseInt(g.count, 10);
    });

    // Distribuição por sexo
    const sexoQuery = await this.pessoaRepo
      .createQueryBuilder('pessoa')
      .select('pessoa.sexo', 'sexo')
      .addSelect('COUNT(pessoa.id)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.sexo IS NOT NULL')
      .groupBy('pessoa.sexo')
      .getRawMany();

    const sexo: { [key: string]: number } = {};
    sexoQuery.forEach(s => {
      sexo[s.sexo] = parseInt(s.count, 10);
    });

    // Ocupação atual
    const ocupacao = await this.getOcupacao();

    return {
      totalCadastros,
      novosCadastros,
      ocupacao: ocupacao.total,
      genero,
      sexo,
    };
  }

  async getSaidasPrevistasHoje(): Promise<number> {
    // Retorna quantidade de hóspedes que SAIRÃO AMANHÃ
    // LÓGICA CORRIGIDA: data_limite = AMANHÃ significa última noite é HOJE
    // Útil para planejar: "Quantas vagas terei livres amanhã de manhã?"
    
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1); // Amanhã
    amanha.setHours(0, 0, 0, 0);
    const amanhaFmt = amanha.toISOString().split('T')[0]; // YYYY-MM-DD

    const count = await this.estadiaRepo
      .createQueryBuilder('estadia')
      .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
      .andWhere('DATE(estadia.data_limite) = :amanha', { amanha: amanhaFmt })
      .getCount();

    return count;
  }
}
