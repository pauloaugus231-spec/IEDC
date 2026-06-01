import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, labelStatus, LojasDashboard } from './lojas-shared';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY?: number;
  };
};

@Injectable()
export class LojasExportService {
  async exportFechamentoExcel(dashboard: LojasDashboard): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestão Dias da Cruz';
    workbook.created = new Date();

    const resumo = workbook.addWorksheet('Resumo');
    resumo.columns = [
      { header: 'Indicador', key: 'indicador', width: 32 },
      { header: 'Valor', key: 'valor', width: 22 },
    ];
    resumo.addRows([
      { indicador: 'Período', valor: dashboard.periodo.escopo },
      { indicador: 'Início', valor: dashboard.periodo.inicio },
      { indicador: 'Fim', valor: dashboard.periodo.fim },
      { indicador: 'Vendas previstas', valor: dashboard.kpis.vendasPrevistas },
      { indicador: 'Comandas aguardando', valor: dashboard.kpis.comandasAguardando },
      { indicador: 'Vendas realizadas', valor: dashboard.kpis.vendasPagas },
      { indicador: 'Comandas pagas', valor: dashboard.kpis.comandasPagas },
      { indicador: 'Pendentes', valor: dashboard.kpis.comandasAguardando },
      { indicador: 'Desistências', valor: dashboard.kpis.desistencias },
      { indicador: 'Valor desistido', valor: dashboard.kpis.valorDesistido },
      { indicador: 'Retiradas pendentes', valor: dashboard.kpis.retiradasPendentes },
      { indicador: 'Retiradas concluídas', valor: dashboard.kpis.retiradasConcluidas },
      { indicador: 'Ticket médio', valor: dashboard.kpis.ticketMedio },
      { indicador: 'Taxa de conversão', valor: `${dashboard.kpis.taxaConversao}%` },
    ]);

    const comandas = workbook.addWorksheet('Comandas');
    comandas.columns = [
      { header: 'Código', key: 'codigo', width: 14 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Lojas', key: 'lojas', width: 28 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Pago', key: 'pago', width: 14 },
      { header: 'Saldo', key: 'saldo', width: 14 },
      { header: 'Criada em', key: 'criadaEm', width: 18 },
      { header: 'Finalizada em', key: 'finalizadaEm', width: 18 },
      { header: 'Motivo', key: 'motivoStatus', width: 34 },
    ];
    comandas.addRows(dashboard.recentes.map((comanda) => ({
      ...comanda,
      status: labelStatus(comanda.status),
    })));

    const lojas = workbook.addWorksheet('Por loja');
    lojas.columns = [
      { header: 'Loja', key: 'nome', width: 22 },
      { header: 'Realizado', key: 'realizado', width: 16 },
      { header: 'Previsto', key: 'previsto', width: 16 },
      { header: 'Comandas pagas', key: 'comandas', width: 18 },
    ];
    lojas.addRows(dashboard.porLoja);

    const pagamentos = workbook.addWorksheet('Pagamentos');
    pagamentos.columns = [
      { header: 'Método', key: 'metodo', width: 18 },
      { header: 'Total', key: 'total', width: 16 },
      { header: 'Quantidade', key: 'quantidade', width: 14 },
    ];
    pagamentos.addRows(dashboard.porPagamento);

    for (const worksheet of workbook.worksheets) {
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0041AA' },
      };
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportFechamentoPdf(dashboard: LojasDashboard): Promise<Buffer> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' }) as JsPdfWithAutoTable;
    const periodoLabel = `${dashboard.periodo.inicio} a ${dashboard.periodo.fim}`;

    doc.setFontSize(18);
    doc.text('Fechamento financeiro das Lojas', 40, 42);
    doc.setFontSize(10);
    doc.text(`Período: ${periodoLabel}`, 40, 60);

    const resumo = [
      ['Vendas previstas', formatCurrency(dashboard.kpis.vendasPrevistas)],
      ['Vendas realizadas', formatCurrency(dashboard.kpis.vendasPagas)],
      ['Comandas aguardando', String(dashboard.kpis.comandasAguardando)],
      ['Desistências', `${dashboard.kpis.desistencias} (${formatCurrency(dashboard.kpis.valorDesistido)})`],
      ['Retiradas', `${dashboard.kpis.retiradasPendentes} pendente(s), ${dashboard.kpis.retiradasConcluidas} concluída(s)`],
      ['Ticket médio', formatCurrency(dashboard.kpis.ticketMedio)],
      ['Taxa de conversão', `${dashboard.kpis.taxaConversao}%`],
    ];

    autoTable(doc, {
      head: [['Indicador', 'Valor']],
      body: resumo,
      startY: 84,
      theme: 'grid',
      headStyles: { fillColor: [0, 65, 170] },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: 40, right: 40 },
    });

    const firstTableEndY = doc.lastAutoTable?.finalY || 170;

    autoTable(doc, {
      head: [['Código', 'Cliente', 'Status', 'Lojas', 'Total', 'Pago', 'Saldo', 'Motivo']],
      body: dashboard.recentes.map((comanda) => [
        comanda.codigo || '-',
        comanda.cliente || '-',
        labelStatus(comanda.status),
        comanda.lojas || '-',
        formatCurrency(comanda.total),
        formatCurrency(comanda.pago),
        formatCurrency(comanda.saldo),
        comanda.motivoStatus || '-',
      ]),
      startY: firstTableEndY + 24,
      theme: 'striped',
      headStyles: { fillColor: [0, 65, 170] },
      styles: { fontSize: 8, cellPadding: 5 },
      margin: { left: 40, right: 40 },
    });

    return Buffer.from(doc.output('arraybuffer'));
  }
}
