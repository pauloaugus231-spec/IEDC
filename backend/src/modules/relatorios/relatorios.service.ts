import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia } from '../../entities/estadia.entity';
import { Cama } from '../../entities/cama.entity';
import * as ExcelJS from 'exceljs';
import * as jsPDF from 'jspdf';
import 'jspdf-autotable';

@Injectable()
export class RelatoriosService {
  constructor(
    @InjectRepository(Pessoa)
    private pessoaRepository: Repository<Pessoa>,
    @InjectRepository(Estadia)
    private estadiaRepository: Repository<Estadia>,
  ) {}

  async getRelatorioCustom(inicio?: string, fim?: string, campos: string[] = [], filtros: any = {}, lgpd: boolean = false) {
    // Validar campos permitidos para segurança
    const camposPermitidos = ['id', 'nome', 'sobrenome', 'nome_social', 'cpf', 'data_nascimento', 'genero', 'cor', 'lgbt', 'status_cadastro', 'created_at', 'updated_at'];
    const camposValidos = campos.filter(campo => camposPermitidos.includes(campo));

    if (camposValidos.length === 0) {
      throw new Error('Nenhum campo válido especificado');
    }

    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .select(camposValidos.map(campo => `pessoa.${campo}`))
      .where('pessoa.ativo = true');

    // LÓGICA MODIFICADA: Se houver filtro de datas, buscar por ESTADIA no período (relatório de acesso)
    // Se NÃO houver filtro de datas, buscar por CADASTRO (relatório geral)
    const temFiltroDatas = inicio && fim && inicio.trim() !== '' && fim.trim() !== '';

    if (temFiltroDatas) {
      // RELATÓRIO DE ACESSO: Pessoas que estiveram hospedadas no período
      query.innerJoin('pessoa.estadias', 'estadia')
           .andWhere(
             '(estadia.data_checkin <= :fim AND (estadia.data_checkout IS NULL OR estadia.data_checkout >= :inicio))',
             { inicio, fim }
           );

      // Se houver filtro de quarto, aplicar na estadia
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }

      // Adicionar DISTINCT para evitar duplicatas (pessoa pode ter múltiplas estadias)
      query.distinct(true);
    } else {
      // RELATÓRIO GERAL: Todos os cadastros (comportamento original)
      // Join with estadia and cama if quarto filter is provided
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
             .innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }
    }

    // Adicione filtros dinâmicos com validação, excluding quarto
    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key] && camposPermitidos.includes(key)) {
        if (key === 'cor') {
          query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
          console.log('Aplicando filtro de cor em relatório custom:', filtros[key]);
        } else {
          query.andWhere(`pessoa.${key} = :${key}`, { [key]: filtros[key] });
        }
      }
    });

    const data = await query.getRawMany();

    // Aplicar LGPD se necessário
    if (lgpd) {
      return data.map(item => {
        const masked = { ...item };
        if (masked.nome) masked.nome = this.maskField(masked.nome);
        if (masked.sobrenome) masked.sobrenome = this.maskField(masked.sobrenome);
        if (masked.nome_social) masked.nome_social = this.maskField(masked.nome_social);
        if (masked.cpf) masked.cpf = this.maskCPF(masked.cpf);
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

  async getRelatorioCustomExcel(inicio?: string, fim?: string, campos: string[] = [], filtros: any = {}, lgpd: boolean = false) {
    const data = await this.getRelatorioCustom(inicio, fim, campos, filtros, lgpd);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    // Adicione cabeçalhos
    worksheet.columns = campos.map(campo => ({ header: campo, key: campo }));

    // Adicione dados
    worksheet.addRows(data);

    // Configure resposta para download
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async getRelatorioCustomPDF(inicio?: string, fim?: string, campos: string[] = [], filtros: any = {}, lgpd: boolean = false) {
    const data = await this.getRelatorioCustom(inicio, fim, campos, filtros, lgpd);

    const doc = new jsPDF();
    doc.text('Relatório Customizado', 20, 10);

    const tableData = data.map(row => campos.map(campo => row[campo] || '-'));

    (doc as any).autoTable({
      head: [campos],
      body: tableData,
      startY: 20,
    });

    return doc.output('arraybuffer');
  }

  async getKPIs(inicio?: string, fim?: string, filtros: any = {}) {
    const query = this.pessoaRepository.createQueryBuilder('pessoa')
      .where('pessoa.ativo = true');

    // LÓGICA MODIFICADA: Se houver filtro de datas, buscar por ESTADIA no período (relatório de acesso)
    const temFiltroDatas = inicio && fim && inicio.trim() !== '' && fim.trim() !== '';

    if (temFiltroDatas) {
      // RELATÓRIO DE ACESSO: Pessoas que estiveram hospedadas no período
      query.innerJoin('pessoa.estadias', 'estadia')
           .andWhere(
             '(estadia.data_checkin <= :fim AND (estadia.data_checkout IS NULL OR estadia.data_checkout >= :inicio))',
             { inicio, fim }
           );

      // Se houver filtro de quarto, aplicar na estadia
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }

      // Adicionar DISTINCT
      query.distinct(true);
    } else {
      // RELATÓRIO GERAL: Todos os cadastros
      if (filtros.quarto && filtros.quarto !== 'Todos') {
        query.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
             .innerJoin('estadia.cama', 'cama')
             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
      }
    }

    // Aplicar filtros dinâmicos, excluding quarto
    Object.keys(filtros).forEach(key => {
      if (key !== 'quarto' && filtros[key]) {
        if (key === 'cor') {
          query.andWhere('LOWER(pessoa.cor) = LOWER(:cor)', { cor: filtros[key] });
          console.log('Aplicando filtro de cor em KPIs:', filtros[key]);
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

    // Join with estadia and cama if quarto filter is provided
    if (filtros.quarto && filtros.quarto !== 'Todos') {
      mediaIdadeQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                     .innerJoin('estadia.cama', 'cama')
                     .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      mediaIdadeQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    // Aplicar filtros dinâmicos, excluding quarto
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

    // Join with estadia and cama if quarto filter is provided
    if (filtros.quarto && filtros.quarto !== 'Todos') {
      distribuicaoCorQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                          .innerJoin('estadia.cama', 'cama')
                          .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      distribuicaoCorQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    // Aplicar filtros dinâmicos, excluding quarto
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

    // Join with estadia and cama if quarto filter is provided
    if (filtros.quarto && filtros.quarto !== 'Todos') {
      distribuicaoGeneroQuery.innerJoin('pessoa.estadias', 'estadia', 'estadia.status = \'ativa\'')
                             .innerJoin('estadia.cama', 'cama')
                             .andWhere('cama.casa = :quarto', { quarto: filtros.quarto });
    }

    if (inicio && fim && inicio.trim() !== '' && fim.trim() !== '') {
      distribuicaoGeneroQuery.andWhere('pessoa.created_at BETWEEN :inicio AND :fim', { inicio, fim });
    }

    // Aplicar filtros dinâmicos, excluding quarto
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
      distribuicaoCor: distribuicaoCor.reduce((acc, row) => { acc[row.cor] = parseInt(row.count); return acc; }, {}),
      distribuicaoGenero: distribuicaoGenero.reduce((acc, row) => { acc[row.genero] = parseInt(row.count); return acc; }, {}),
    };
  }

  async getRelatorioEstadias(inicio?: string, fim?: string) {
    const query = this.estadiaRepository.createQueryBuilder('estadia')
      .leftJoinAndSelect('estadia.pessoa', 'pessoa')
      .select([
        'pessoa.nome',
        'estadia.data_checkin',
        'estadia.data_checkout',
        'estadia.dias_permanencia',
      ]);

    if (inicio && fim) {
      query.andWhere('estadia.data_checkin BETWEEN :inicio AND :fim', { inicio, fim });
    }

    return query.getRawMany();
  }

  async salvarDashboardPersonalizado(userId: string, nome: string, config: any) {
    // Implementar salvamento no banco (ex: tabela dashboards)
    // Por simplicidade, retornar mock
    return { id: '1', nome, config };
  }

  async getDashboardsPersonalizados(userId: string) {
    // Retornar dashboards salvos
    return [];
  }

  async getDadosGraficos(periodo: 'mes' | 'ano', tipo: 'barra' | 'linha' | 'pizza', filtros: any = {}, quarto?: string, recortes: string[] = [], dataInicio?: string, dataFim?: string) {
    const inicio = dataInicio ? new Date(dataInicio) : new Date();
    const fim = dataFim ? new Date(dataFim) : new Date();
    const diffDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const isDiario = diffDias <= 30;

    let labels: string[] = [];
    let values: number[] = [];

    if (isDiario) {
      // Ocupação diária para o período selecionado
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const dataDia = new Date(d);
        const ocupacaoDia = await this.calcularOcupacaoDia(dataDia, filtros, quarto);
        labels.push(dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        values.push(ocupacaoDia);
      }
    } else {
      // Média mensal para o período
      const meses = [];
      let current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
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

  async calcularOcupacaoDia(data: Date, filtros: any = {}, quarto?: string): Promise<number> {
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
      console.log('Aplicando filtro de cor em gráfico:', filtros.cor);
    }

    return await query.getCount();
  }

  async calcularMediaOcupacaoMes(mes: Date, filtros: any = {}, quarto?: string): Promise<number> {
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
