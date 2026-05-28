import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia, StatusEstadia } from '../../entities/estadia.entity';
import { 
  PessoaGesuas, 
  PessoaConsolidada, 
  ResultadoConferencia, 
  RelatorioRMA 
} from './interfaces/rma.interface';

@Injectable()
export class RmaService {
  constructor(
    @InjectRepository(Pessoa)
    private readonly pessoaRepository: Repository<Pessoa>,
    @InjectRepository(Estadia)
    private readonly estadiaRepository: Repository<Estadia>,
  ) {}

  /**
   * Ler arquivo Excel do Gesuas e extrair dados
   */
  async lerArquivoGesuas(file: Express.Multer.File): Promise<PessoaGesuas[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Arquivo Excel sem planilhas válidas');
      }

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = this.valorCelulaParaTexto(cell.value);
      });

      const dados: Record<string, string>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const linha: Record<string, string> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (!header) return;
          linha[header] = this.valorCelulaParaTexto(cell.value);
        });

        if (Object.values(linha).some(Boolean)) {
          dados.push(linha);
        }
      });
      
      if (!dados || dados.length === 0) {
        throw new BadRequestException('Arquivo Excel vazio ou sem dados válidos');
      }

      // Mapear dados do Gesuas
      const pessoas: PessoaGesuas[] = dados.map(linha => {
        // Tentar identificar colunas (aceitar variações de nome)
        const nome = linha['Nome'] || linha['NOME'] || linha['nome'] || linha['Nome Completo'] || '';
        const cpf = linha['CPF'] || linha['cpf'] || linha['Cpf'] || '';
        const dataNascimento = linha['Data de Nascimento'] || linha['DATA_NASCIMENTO'] || linha['Nascimento'] || '';
        const nis = linha['NIS'] || linha['nis'] || linha['Nis'] || '';
        const rg = linha['RG'] || linha['rg'] || linha['Rg'] || '';

        return {
          nome: this.normalizarNome(nome),
          cpf: this.normalizarCPF(cpf),
          dataNascimento: dataNascimento ? String(dataNascimento) : undefined,
          nis: nis ? String(nis) : undefined,
          rg: rg ? String(rg) : undefined,
        };
      }).filter(p => p.nome); // Remover linhas sem nome

      return pessoas;
    } catch (error) {
      console.error('Erro ao ler arquivo Excel:', error);
      throw new BadRequestException('Erro ao processar arquivo Excel. Envie um arquivo .xlsx válido.');
    }
  }

  /**
   * Buscar estadias ativas no período
   */
  async buscarEstadiasAtivas(dataInicio: Date, dataFim: Date): Promise<Estadia[]> {
    const estadias = await this.estadiaRepository
      .createQueryBuilder('estadia')
      .leftJoinAndSelect('estadia.pessoa', 'pessoa')
      .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
      .andWhere('estadia.data_checkin <= :dataFim', { dataFim })
      .andWhere('(estadia.data_checkout IS NULL OR estadia.data_checkout >= :dataInicio)', { dataInicio })
      .andWhere('pessoa.ativo = true')
      .getMany();

    return estadias;
  }

  /**
   * Comparar dados do Gesuas com estadias do sistema
   */
  async compararDados(
    pessoasGesuas: PessoaGesuas[],
    estadias: Estadia[]
  ): Promise<ResultadoConferencia> {
    const encontradas: PessoaConsolidada[] = [];
    const apenasGesuas: PessoaGesuas[] = [];
    const estadiasEncontradas = new Set<string>();

    // Para cada pessoa do Gesuas, tentar encontrar no sistema
    for (const pessoaGesuas of pessoasGesuas) {
      let encontrou = false;

      for (const estadia of estadias) {
        const pessoa = estadia.pessoa;
        
        // Comparar por CPF (prioridade 1)
        if (pessoaGesuas.cpf && pessoa.cpf) {
          if (this.normalizarCPF(pessoa.cpf) === pessoaGesuas.cpf) {
            encontradas.push(this.criarPessoaConsolidada(pessoa, estadia));
            estadiasEncontradas.add(estadia.id);
            encontrou = true;
            break;
          }
        }
        
        // Comparar por Nome (prioridade 2)
        if (!encontrou && this.compararNomes(pessoaGesuas.nome, pessoa.nome)) {
          encontradas.push(this.criarPessoaConsolidada(pessoa, estadia));
          estadiasEncontradas.add(estadia.id);
          encontrou = true;
          break;
        }
      }

      if (!encontrou) {
        apenasGesuas.push(pessoaGesuas);
      }
    }

    // Pessoas que estão apenas no sistema
    const apenasSistema: PessoaConsolidada[] = estadias
      .filter(e => !estadiasEncontradas.has(e.id))
      .map(e => this.criarPessoaConsolidada(e.pessoa, e));

    const id = this.gerarIdConferencia();
    const pessoasSemNis = encontradas.filter(p => !p.temNis).length;

    return {
      id,
      dataProcessamento: new Date(),
      periodo: {
        inicio: new Date(estadias[0]?.data_checkin || new Date()),
        fim: new Date(),
      },
      encontradas,
      apenasGesuas,
      apenasSistema,
      estatisticas: {
        totalGesuas: pessoasGesuas.length,
        totalSistema: estadias.length,
        totalEncontradas: encontradas.length,
        totalDivergencias: apenasGesuas.length + apenasSistema.length,
        pessoasSemNis,
      },
    };
  }

  /**
   * Gerar relatório consolidado para exportação
   */
  async gerarRelatorioConsolidado(resultado: ResultadoConferencia): Promise<RelatorioRMA> {
    const pessoas = resultado.encontradas.map(p => ({
      nome: p.nome,
      cpf: p.cpf || 'Não informado',
      dataNascimento: p.dataNascimento ? p.dataNascimento.toLocaleDateString('pt-BR') : 'Não informado',
      nis: p.nis || 'NÃO',
      temNis: p.temNis,
      inicioEstadia: p.inicioEstadia.toLocaleDateString('pt-BR'),
    }));

    const comNis = pessoas.filter(p => p.temNis).length;

    return {
      id: resultado.id,
      periodo: `${resultado.periodo.inicio.toLocaleDateString('pt-BR')} - ${resultado.periodo.fim.toLocaleDateString('pt-BR')}`,
      pessoas,
      estatisticas: {
        total: pessoas.length,
        comNis,
        semNis: pessoas.length - comNis,
      },
    };
  }

  /**
   * Exportar relatório para Excel
   */
  async exportarParaExcel(relatorio: RelatorioRMA): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório RMA');

    // Cabeçalho
    worksheet.columns = [
      { header: 'Nome Completo', key: 'nome', width: 40 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Data de Nascimento', key: 'dataNascimento', width: 18 },
      { header: 'NIS', key: 'nis', width: 18 },
      { header: 'Início da Estadia', key: 'inicioEstadia', width: 18 },
    ];

    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Adicionar dados
    relatorio.pessoas.forEach(pessoa => {
      worksheet.addRow(pessoa);
    });

    // Adicionar linha de estatísticas
    worksheet.addRow([]);
    worksheet.addRow(['ESTATÍSTICAS']);
    worksheet.addRow(['Total de Pessoas:', relatorio.estatisticas.total]);
    worksheet.addRow(['Com NIS:', relatorio.estatisticas.comNis]);
    worksheet.addRow(['Sem NIS:', relatorio.estatisticas.semNis]);

    // Gerar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ===== MÉTODOS AUXILIARES =====

  private criarPessoaConsolidada(pessoa: Pessoa, estadia: Estadia): PessoaConsolidada {
    return {
      nome: pessoa.nome,
      cpf: pessoa.cpf || undefined,
      dataNascimento: pessoa.data_nascimento || undefined,
      nis: pessoa.nis || undefined,
      temNis: !!pessoa.nis,
      inicioEstadia: estadia.data_checkin,
      fimEstadia: estadia.data_checkout || undefined,
      estadiaId: estadia.id,
      pessoaId: pessoa.id,
    };
  }

  private normalizarNome(nome: string): string {
    if (!nome) return '';
    return nome.trim().toUpperCase();
  }

  private normalizarCPF(cpf: string): string {
    if (!cpf) return '';
    return cpf.replace(/\D/g, ''); // Remove tudo que não é número
  }

  private valorCelulaParaTexto(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim();
    }
    if ('text' in value && value.text) return String(value.text).trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim();
    }
    if ('result' in value && value.result !== undefined && value.result !== null) {
      return String(value.result).trim();
    }

    return String(value).trim();
  }

  private compararNomes(nome1: string, nome2: string): boolean {
    const n1 = this.normalizarNome(nome1);
    const n2 = this.normalizarNome(nome2);
    
    // Comparação exata
    if (n1 === n2) return true;
    
    // Comparação por similaridade (85% de match)
    const similarity = this.calcularSimilaridade(n1, n2);
    return similarity >= 0.85;
  }

  private calcularSimilaridade(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private gerarIdConferencia(): string {
    return `RMA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
