import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia } from '../../entities/estadia.entity';
import * as ExcelJS from 'exceljs';
import * as jsPDF from 'jspdf';
import 'jspdf-autotable';
import { RelatorioFiltros, SqlParam } from './relatorios-core-types';
import { FaixaEtariaRow, PdfWithAutoTable, RelatorioRow } from './relatorios-albergue-types';

@Injectable()
export class RelatoriosAlbergueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Pessoa)
    private pessoaRepository: Repository<Pessoa>,
    @InjectRepository(Estadia)
    private estadiaRepository: Repository<Estadia>,
  ) {}

  async getRelatorioCustom(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    const camposPermitidos = [
      'id',
      'nome',
      'nome_social',
      'cpf',
      'rg',
      'nis',
      'data_nascimento',
      'sexo',
      'genero',
      'cor',
      'raca',
      'sexualidade',
      'lgbt',
      'status_cadastro',
      'tipo_vaga',
      'created_at',
      'updated_at',
    ];
    const camposValidos = campos.filter(campo => camposPermitidos.includes(campo));

    if (camposValidos.length === 0) {
      throw new Error('Nenhum campo válido especificado');
    }

    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .select(camposValidos.map(campo => campo === 'nome'
        ? "COALESCE(NULLIF(BTRIM(pessoa.nome_social), ''), pessoa.nome) AS nome"
        : `pessoa.${campo} AS ${campo}`))
      .where('pessoa.ativo = true');

    const temFiltroDatas = inicio && fim && inicio.trim() !== '' && fim.trim() !== '';

    if (temFiltroDatas) {
      query.innerJoin('pessoa.estadias', 'estadia')
           .andWhere(
             '(estadia.data_checkin <= :fim AND (estadia.data_checkout IS NULL OR estadia.data_checkout >= :inicio))',
             { inicio, fim }
           );

      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }

      query.distinct(true);
    } else {
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
             .innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }
    }

    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key] && camposPermitidos.includes(key)) {
        if (key === 'cor') {
          query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          query.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    if (camposValidos.includes('nome')) {
      query.orderBy('nome', 'ASC');
    }

    const data = await query.getRawMany<RelatorioRow>();

    if (lgpd) {
      return data.map(item => {
        const masked = { ...item };
        if (typeof masked.nome === 'string') masked.nome = this.maskField(masked.nome);
        if (typeof masked.sobrenome === 'string') masked.sobrenome = this.maskField(masked.sobrenome);
        if (typeof masked.nome_social === 'string') masked.nome_social = this.maskField(masked.nome_social);
        if (typeof masked.cpf === 'string') masked.cpf = this.maskCPF(masked.cpf);
        return masked;
      });
    }

    return data;
  }

  private maskField(value: string): string {
    if (!value || value.length < 3) return '*'.repeat(value?.length || 1);
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  }

  private maskCPF(cpf: string): string {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.slice(0, 3).padEnd(11, '*');
  }

  async getRelatorioCustomExcel(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    const data = await this.getRelatorioCustom(inicio, fim, campos, filtros, lgpd);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    worksheet.columns = campos.map(campo => ({ header: campo, key: campo }));
    worksheet.addRows(data);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async getRelatorioCustomPDF(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    const data = await this.getRelatorioCustom(inicio, fim, campos, filtros, lgpd);

    const doc = new jsPDF();
    doc.text('Relatório Customizado', 20, 10);

    const tableData = data.map(row => campos.map(campo => String(row[campo] || '-')));

    (doc as unknown as PdfWithAutoTable).autoTable({
      head: [campos],
      body: tableData,
      startY: 20,
    });

    return doc.output('arraybuffer');
  }

  async getKPIs(inicio?: string, fim?: string, filtros: RelatorioFiltros = {}) {
    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .where('pessoa.ativo = true');

    const temFiltroDatas = inicio && fim && inicio.trim() !== '' && fim.trim() !== '';

    if (temFiltroDatas) {
      query.innerJoin('pessoa.estadias', 'estadia')
           .andWhere(
             '(estadia.data_checkin <= :fim AND (estadia.data_checkout IS NULL OR estadia.data_checkout >= :inicio))',
             { inicio, fim }
           );

      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }

      query.distinct(true);
    } else {
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
             .innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }
    }

    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          query.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    const totalCadastros = await query.getCount();

    const mediaIdadeQuery = this.pessoaRepository.createQueryBuilder('pessoa')
      .select('AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, pessoa.data_nascimento)))', 'media')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.data_nascimento IS NOT NULL');

    if (filtros.quarto && filtros.quarto !== 'Todos') {
      mediaIdadeQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                     .innerJoin('estadia.cama', 'cama')
                     .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      mediaIdadeQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          mediaIdadeQuery.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          mediaIdadeQuery.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    const mediaIdade = await mediaIdadeQuery.getRawOne();

    const distribuicaoCorQuery = this.pessoaRepository.createQueryBuilder('pessoa')
      .select('pessoa.cor', 'cor')
      .addSelect('COUNT(*)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.cor IS NOT NULL');

    if (filtros.quarto && filtros.quarto !== 'Todos') {
      distribuicaoCorQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                          .innerJoin('estadia.cama', 'cama')
                          .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      distribuicaoCorQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          distribuicaoCorQuery.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          distribuicaoCorQuery.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    distribuicaoCorQuery.groupBy('pessoa.cor');
    const distribuicaoCor = await distribuicaoCorQuery.getRawMany();

    const distribuicaoGeneroQuery = this.pessoaRepository.createQueryBuilder('pessoa')
      .select('pessoa.genero', 'genero')
      .addSelect('COUNT(*)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.genero IS NOT NULL');

    if (filtros.quarto && filtros.quarto !== 'Todos') {
      distribuicaoGeneroQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                             .innerJoin('estadia.cama', 'cama')
                             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      distribuicaoGeneroQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          distribuicaoGeneroQuery.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
        } else {
          distribuicaoGeneroQuery.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    distribuicaoGeneroQuery.groupBy('pessoa.genero');
    const distribuicaoGenero = await distribuicaoGeneroQuery.getRawMany();

    return {
      total: totalCadastros,
      mediaIdade: Math.round(parseFloat(mediaIdade?.media || '0')),
      distribuicaoCor: distribuicaoCor.reduce((acc: Record<string, number>, row: Record<string, string>) => { acc[row.cor] = parseInt(row.count); return acc; }, {}),
      distribuicaoGenero: distribuicaoGenero.reduce((acc: Record<string, number>, row: Record<string, string>) => { acc[row.genero] = parseInt(row.count); return acc; }, {}),
    };
  }

  async getRelatorioEstadias(inicio?: string, fim?: string) {
    const query = this.estadiaRepository.createQueryBuilder('estadia')
      .leftJoinAndSelect('estadia.pessoa', 'pessoa')
      .select([
        "COALESCE(NULLIF(BTRIM(pessoa.nome_social), ''), pessoa.nome) AS pessoa_nome",
        'estadia.data_checkin AS estadia_data_checkin',
        'estadia.data_checkout AS estadia_data_checkout',
        'estadia.dias_permanencia AS estadia_dias_permanencia',
      ])
      .orderBy('pessoa_nome', 'ASC');

    if (inicio && fim) {
      query.andWhere('estadia.data_checkin BETWEEN :inicio AND :fim', { inicio, fim });
    }

    return query.getRawMany();
  }

  async getResumoOperacional(inicio?: string, fim?: string, filtros: RelatorioFiltros = {}) {
    const hoje = new Date();
    const periodoInicio = inicio || new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    const periodoFim = fim || new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
    const params: SqlParam[] = [periodoInicio, periodoFim];
    let filtroQuarto = '';

    if (filtros.quarto && filtros.quarto !== 'Todos') {
      params.push(filtros.quarto);
      filtroQuarto = 'AND c.casa = $3';
    }

    const [resumo] = await this.estadiaRepository.query(
      `
        WITH estadias_periodo AS (
          SELECT
            e.id,
            e.pessoa_id,
            e.data_checkin::date AS data_checkin,
            e.data_checkout::date AS data_checkout
          FROM estadias e
          LEFT JOIN camas c ON c.id = e.cama_id
          WHERE e.data_checkin::date <= $2::date
            AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
            ${filtroQuarto}
        ),
        primeira_estadia AS (
          SELECT pessoa_id, MIN(data_checkin::date) AS primeira_data
          FROM estadias
          GROUP BY pessoa_id
        )
        SELECT
          COUNT(ep.id)::int AS acessos_periodo,
          COUNT(DISTINCT ep.pessoa_id)::int AS pessoas_unicas,
          COUNT(DISTINCT ep.pessoa_id) FILTER (
            WHERE pe.primeira_data BETWEEN $1::date AND $2::date
          )::int AS novos_acessos,
          COUNT(DISTINCT ep.pessoa_id) FILTER (
            WHERE pe.primeira_data < $1::date
          )::int AS retornos,
          COALESCE(SUM(
            GREATEST(
              1,
              (
                LEAST(COALESCE(ep.data_checkout, $2::date), $2::date)
                - GREATEST(ep.data_checkin, $1::date)
              )::int + 1
            )
          ), 0)::int AS pernoites_estimados
        FROM estadias_periodo ep
        JOIN primeira_estadia pe ON pe.pessoa_id = ep.pessoa_id
      `,
      params,
    );

    const faixaEtaria = await this.estadiaRepository.query<FaixaEtariaRow[]>(
      `
        WITH pessoas_periodo AS (
          SELECT DISTINCT e.pessoa_id
          FROM estadias e
          LEFT JOIN camas c ON c.id = e.cama_id
          WHERE e.data_checkin::date <= $2::date
            AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
            ${filtroQuarto}
        )
        SELECT faixa, COUNT(*)::int AS total
        FROM (
          SELECT
            CASE
              WHEN p.data_nascimento IS NULL THEN 'Não informado'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 18 AND 24 THEN '18 a 24'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 25 AND 29 THEN '25 a 29'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 30 AND 39 THEN '30 a 39'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 40 AND 49 THEN '40 a 49'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 50 AND 59 THEN '50 a 59'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) >= 60 THEN '60+'
              ELSE 'Não informado'
            END AS faixa
          FROM pessoas_periodo pp
          JOIN pessoas p ON p.id = pp.pessoa_id
        ) faixas
        GROUP BY faixa
        ORDER BY
          CASE faixa
            WHEN '18 a 24' THEN 1
            WHEN '25 a 29' THEN 2
            WHEN '30 a 39' THEN 3
            WHEN '40 a 49' THEN 4
            WHEN '50 a 59' THEN 5
            WHEN '60+' THEN 6
            ELSE 7
          END
      `,
      params,
    );

    return {
      periodo: {
        inicio: periodoInicio,
        fim: periodoFim,
      },
      acessosPeriodo: Number(resumo?.acessos_periodo || 0),
      pessoasUnicas: Number(resumo?.pessoas_unicas || 0),
      novosAcessos: Number(resumo?.novos_acessos || 0),
      retornos: Number(resumo?.retornos || 0),
      pernoitesEstimados: Number(resumo?.pernoites_estimados || 0),
      faixaEtaria: faixaEtaria.map((row) => ({
        faixa: row.faixa,
        total: Number(row.total || 0),
      })),
    };
  }

  async salvarDashboardPersonalizado(_userId: string, _nome: string, _config: unknown) {
    throw new NotImplementedException('Dashboards personalizados ainda não foram oficializados.');
  }

  async getDashboardsPersonalizados(_userId: string) {
    return [];
  }

  async getDadosGraficos(periodo: 'mes' | 'ano', tipo: 'barra' | 'linha' | 'pizza', filtros: RelatorioFiltros = {}, quarto?: string, _recortes: string[] = [], dataInicio?: string, dataFim?: string) {
    const inicio = dataInicio ? new Date(dataInicio) : new Date();
    const fim = dataFim ? new Date(dataFim) : new Date();
    const diffDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const isDiario = diffDias <= 30;

    const labels: string[] = [];
    const values: number[] = [];

    if (isDiario) {
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const dataDia = new Date(d);
        const ocupacaoDia = await this.calcularOcupacaoDia(dataDia, filtros, quarto);
        labels.push(dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        values.push(ocupacaoDia);
      }
    } else {
      const meses = [];
      const current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      while (current <= fim) {
        meses.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      for (const mes of meses) {
        const mediaMes = await this.calcularMediaOcupacaoMes(mes, filtros, quarto);
        labels.push(mes.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
        values.push(mediaMes);
      }
    }

    return {
      labels,
      datasets: [{
        label: isDiario ? 'Ocupação Diária' : 'Média Mensal de Ocupação',
        data: values,
        backgroundColor: tipo === 'pizza' ? ['#FF6384', '#36A2EB', '#FFCE56'] : '#36A2EB',
        borderColor: tipo === 'linha' ? '#36A2EB' : undefined,
        fill: tipo === 'linha' ? false : undefined,
      }],
    };
  }

  async calcularOcupacaoDia(data: Date, filtros: RelatorioFiltros = {}, quarto?: string): Promise<number> {
    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .leftJoin('pessoa.estadias', 'estadia')
      .leftJoin('estadia.cama', 'cama')
      .where('estadia.status = :status', { status: 'ativa' })
      .andWhere('estadia.data_checkin <= :data', { data })
      .andWhere('(estadia.data_checkout IS NULL OR estadia.data_checkout >= :data)', { data });

    if (quarto) {
      query.andWhere('cama.casa = :quarto', { quarto });
    }
    if (filtros.genero) {
      query.andWhere('pessoa.genero = :genero', { genero: filtros.genero });
    }
    if (filtros.lgbt !== undefined) {
      query.andWhere('pessoa.lgbt = :lgbt', { lgbt: filtros.lgbt });
    }
    if (filtros.cor) {
      query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros.cor });
    }

    return await query.getCount();
  }

  async calcularMediaOcupacaoMes(mes: Date, filtros: RelatorioFiltros = {}, quarto?: string): Promise<number> {
    const ano = mes.getFullYear();
    const mesNum = mes.getMonth();
    const diasNoMes = new Date(ano, mesNum + 1, 0).getDate();
    let totalOcupacao = 0;

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mesNum, dia);
      totalOcupacao += await this.calcularOcupacaoDia(data, filtros, quarto);
    }

    return Math.round(totalOcupacao / diasNoMes);
  }
}
