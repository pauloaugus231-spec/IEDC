import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pessoa, StatusCadastro } from '../../entities/pessoa.entity';
import { Estadia, StatusEstadia, MotivoSaida } from '../../entities/estadia.entity';
import { Ocorrencia, TipoOcorrencia, SeveridadeOcorrencia } from '../../entities/ocorrencia.entity';
import { Cama, StatusCama } from '../../entities/cama.entity';
import { Bloqueio, TipoBloqueio } from '../../entities/bloqueio.entity';
import { Resend } from 'resend';
import { getNomePrincipal } from '../../common/utils/pessoa-nome.util';
import { TriagemFechamento } from '../../entities/triagem-fechamento.entity';
import { TriagemAbertura } from '../../entities/triagem-abertura.entity';
import { DashboardService } from '../dashboard/dashboard.service';
import { TelegramService } from '../telegram/telegram.service';
import { AuthUser } from '../../auth/auth.types';

export interface NovoCadastroTriagem {
  nome: string;
  dataNascimento: string;
  idade: number;
  cpf: string | null;
  raca: string | null;
  genero: string;
  lgbt: boolean;
  nome_social: string | null;
}

const PLANTAO_RESET_HOUR = 7;

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function getLocalDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
}

function getOperationalPlantaoKey(date = new Date()): string {
  const operationalDate = new Date(date);
  if (operationalDate.getHours() < PLANTAO_RESET_HOUR) {
    operationalDate.setDate(operationalDate.getDate() - 1);
  }
  return getLocalDateKey(operationalDate);
}

function dateFromKey(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

@Injectable()
export class TriagemService {
  private readonly DIAS_BLOQUEIO_ABANDONO = 15;

  constructor(
    @InjectRepository(Pessoa)
    private readonly pessoaRepository: Repository<Pessoa>,
    @InjectRepository(Estadia)
    private readonly estadiaRepository: Repository<Estadia>,
    @InjectRepository(Ocorrencia)
    private readonly ocorrenciaRepository: Repository<Ocorrencia>,
    @InjectRepository(Cama)
    private readonly camaRepository: Repository<Cama>,
    @InjectRepository(Bloqueio)
    private readonly bloqueioRepository: Repository<Bloqueio>,
    @InjectRepository(TriagemFechamento)
    private readonly triagemFechamentoRepository: Repository<TriagemFechamento>,
    @InjectRepository(TriagemAbertura)
    private readonly triagemAberturaRepository: Repository<TriagemAbertura>,
    private readonly dashboardService: DashboardService,
    private readonly telegramService: TelegramService,
  ) {}

  async getStatus(dataRef?: string) {
    const plantao = dataRef || getOperationalPlantaoKey();
    const [abertura, fechamento] = await Promise.all([
      this.triagemAberturaRepository.findOne({ where: { data_ref: dateFromKey(plantao) as unknown as Date } }),
      this.triagemFechamentoRepository.findOne({ where: { data_ref: dateFromKey(plantao) } }),
    ]);

    return {
      data_ref: plantao,
      aberta: Boolean(abertura) && !Boolean(fechamento),
      encerrada: Boolean(fechamento),
      abertura: abertura ? { aberta_em: abertura.aberta_em, aberta_por: abertura.aberta_por } : null,
      fechamento,
    };
  }

  /**
   * Fonte de verdade para "a triagem está aberta agora?" — não depende de horário
   * nem de reset automático de dia. Olha só o que o operador fez: pega a abertura
   * mais recente e verifica se já existe um fechamento correspondente a ela.
   * Sem abertura nenhuma, ou abertura mais recente já fechada → não está aberta.
   */
  async isAbertaAgora(): Promise<boolean> {
    const ultimaAbertura = await this.triagemAberturaRepository.findOne({
      order: { aberta_em: 'DESC' },
    });
    if (!ultimaAbertura) return false;

    const fechamento = await this.triagemFechamentoRepository.findOne({
      where: { data_ref: ultimaAbertura.data_ref },
    });
    return !fechamento;
  }

  /**
   * Classifica o sexo da pessoa em 'M' ou 'F' de forma tolerante a como o
   * cadastro foi de fato preenchido — hoje convivem "M"/"F", "Masculino"/
   * "Feminino" e variações de caixa no mesmo banco, sem enum de validação.
   * Usa `sexo` como fonte principal e `genero` só como reforço se `sexo`
   * vier vazio ou não reconhecido. Quem não se encaixa (Outro, Intersexual,
   * Não binário, Travesti, vazio) retorna null — continua contando no Total
   * e no marcador LGBT+, mas não entra nas linhas de Homens/Mulheres.
   */
  private classificarSexo(pessoa: Pessoa): 'M' | 'F' | null {
    const sexo = (pessoa.sexo || '').trim().toLowerCase();
    if (sexo === 'm' || sexo.startsWith('masc')) return 'M';
    if (sexo === 'f' || sexo.startsWith('femin')) return 'F';

    const genero = (pessoa.genero || '').trim().toLowerCase();
    if (genero === 'm' || genero.startsWith('masc') || genero.startsWith('homem')) return 'M';
    if (genero === 'f' || genero.startsWith('femin') || genero.startsWith('mulher')) return 'F';

    return null;
  }

  /**
   * Monta a contagem demográfica de quem está com estadia ativa agora,
   * direto do cadastro (sexo/genero + idade + marcador lgbt) — não depende
   * de qual quarto físico a pessoa ocupa.
   */
  private async calcularDemografiaAtiva(): Promise<{
    total: number;
    homens: number;
    mulheres: number;
    homensIdosos: number;
    mulheresIdosas: number;
    lgbt: number;
  }> {
    const estadiasAtivas = await this.estadiaRepository.find({
      where: { status: StatusEstadia.ATIVA },
      relations: ['pessoa'],
    });

    let homens = 0;
    let mulheres = 0;
    let homensIdosos = 0;
    let mulheresIdosas = 0;
    let lgbt = 0;

    for (const estadia of estadiasAtivas) {
      const pessoa = estadia.pessoa;
      if (!pessoa) continue;

      // Idade desconhecida (sem data_nascimento) é tratada como "não idoso"
      // por padrão, em vez de travar a contagem por causa de um cadastro
      // incompleto.
      const idoso = pessoa.idade !== null && pessoa.idade !== undefined && pessoa.idade >= 60;
      const classe = this.classificarSexo(pessoa);

      if (classe === 'M') {
        if (idoso) homensIdosos++; else homens++;
      } else if (classe === 'F') {
        if (idoso) mulheresIdosas++; else mulheres++;
      }
      if (pessoa.lgbt) lgbt++;
    }

    return { total: estadiasAtivas.length, homens, mulheres, homensIdosos, mulheresIdosas, lgbt };
  }

  async iniciar(actor?: AuthUser, dataRef?: string) {
    const plantao = dataRef || getOperationalPlantaoKey();

    const existente = await this.triagemAberturaRepository.findOne({
      where: { data_ref: dateFromKey(plantao) as unknown as Date },
    });
    if (existente) {
      return { success: true, alreadyOpen: true, message: 'Triagem já iniciada para este plantão.' };
    }

    const abertura = this.triagemAberturaRepository.create({
      data_ref: dateFromKey(plantao) as unknown as Date,
      aberta_em: new Date(),
      aberta_por: actor?.displayName || actor?.name || actor?.login || 'sistema',
    });
    await this.triagemAberturaRepository.save(abertura);

    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const telegramSent = await this.telegramService.sendMessage(
      this.telegramService.formatarMensagem(
        'Triagem iniciada',
        [
          `Plantão de ${dataFormatada}`,
          'Sistema pronto para receber acolhidos.',
          `Aberta por: ${this.telegramService.escapeMarkdown(abertura.aberta_por)}`,
        ],
        `Horário: ${agora}`,
      ),
    );

    return { success: true, alreadyOpen: false, telegramSent };
  }

  async encerrar(ausentesIds: string[], actor?: AuthUser, dataRef?: string, observacoes?: string) {
    const plantao = dataRef || getOperationalPlantaoKey();
    const fechamentoExistente = await this.triagemFechamentoRepository.findOne({
      where: { data_ref: dateFromKey(plantao) },
    });

    if (fechamentoExistente) {
      return {
        success: true,
        alreadyClosed: true,
        message: 'Triagem já encerrada para este plantão.',
        fechamento: fechamentoExistente,
      };
    }

    const resultados = [];

    for (const pessoaId of ausentesIds) {
      try {
        // Usar transação para garantir atomicidade
        await this.estadiaRepository.manager.transaction(async transactionalEntityManager => {
          // 1. Encontrar a estadia ativa para a pessoa
          const estadiaAtiva = await transactionalEntityManager.findOne(Estadia, {
            where: { pessoa_id: pessoaId, status: StatusEstadia.ATIVA },
          });

          if (!estadiaAtiva) {
            throw new Error(`Nenhuma estadia ativa encontrada para a pessoa com ID ${pessoaId}.`);
          }

          // 2. Efetuar checkout com status ABANDONO
          estadiaAtiva.data_checkout = new Date();
          estadiaAtiva.status = StatusEstadia.ABANDONO;
          estadiaAtiva.motivo_saida = MotivoSaida.ABANDONO;
          estadiaAtiva.funcionario_checkout = 'sistema';
          estadiaAtiva.observacoes_checkout = 'Checkout automático devido a ausência na triagem noturna - ABANDONO DE VAGA';
          await transactionalEntityManager.save(estadiaAtiva);

          // 3. Liberar a cama
          if (estadiaAtiva.cama_id) {
            const cama = await transactionalEntityManager.findOne(Cama, { where: { id: estadiaAtiva.cama_id } });
            if (cama) {
              cama.status = StatusCama.DISPONIVEL;
              await transactionalEntityManager.save(cama);
            }
          }

          // 4. Atualizar status da pessoa para INATIVO
          const pessoa = await transactionalEntityManager.findOne(Pessoa, { where: { id: pessoaId } });
          if (pessoa) {
            pessoa.status_cadastro = StatusCadastro.INATIVO;
            await transactionalEntityManager.save(pessoa);
          }

          // 5. Registrar ocorrência de abandono
          const ocorrencia = new Ocorrencia();
          ocorrencia.pessoa_id = pessoaId;
          ocorrencia.tipo = TipoOcorrencia.OUTROS;
          ocorrencia.severidade = SeveridadeOcorrencia.MEDIA;
          ocorrencia.titulo = 'Abandono de Vaga';
          ocorrencia.descricao = 'Pessoa não compareceu à triagem noturna e teve checkout automático efetuado.';
          ocorrencia.criado_por = 'sistema';
          ocorrencia.data_ocorrencia = new Date();

          await transactionalEntityManager.save(ocorrencia);

          // 6. Criar bloqueio de 15 dias por abandono
          const dataInicio = new Date();
          const dataFim = new Date();
          dataFim.setDate(dataFim.getDate() + this.DIAS_BLOQUEIO_ABANDONO);

          const bloqueio = new Bloqueio();
          bloqueio.pessoa_id = pessoaId;
          bloqueio.tipo = TipoBloqueio.ABANDONO;
          bloqueio.motivo = `Abandono de vaga - Não compareceu à triagem noturna em ${dataInicio.toLocaleDateString('pt-BR')}`;
          bloqueio.data_inicio = dataInicio;
          bloqueio.data_fim = dataFim;
          bloqueio.dias_bloqueio = this.DIAS_BLOQUEIO_ABANDONO;
          bloqueio.criado_por = 'sistema';
          bloqueio.ativo = true;
          bloqueio.observacoes = `Bloqueio automático por abandono de vaga. A pessoa poderá retornar após ${dataFim.toLocaleDateString('pt-BR')} ou mediante liberação antecipada autorizada.`;

          await transactionalEntityManager.save(bloqueio);
        });

        resultados.push({
          pessoa_id: pessoaId,
          status: 'success',
          message: 'Abandono registrado: checkout efetuado, ocorrência criada e bloqueio de 15 dias aplicado'
        });

      } catch (error) {
        console.error(`Erro ao processar pessoa ${pessoaId}:`, error);
        resultados.push({
          pessoa_id: pessoaId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    const sucessos = resultados.filter(r => r.status === 'success').length;
    const erros = resultados.filter(r => r.status === 'error').length;

    const fechamento = await this.registrarFechamentoOficial({
      dataRef: plantao,
      ausentesIds,
      resultados,
      actor,
      observacoes,
    });

    const snapshot = await this.dashboardService.gerarSnapshotDiario(plantao, 'triagem');

    // Relatório de encerramento (Telegram + e-mail) sai automaticamente daqui —
    // não depende mais de uma segunda chamada do frontend com números calculados na tela.
    const notificacao = await this.enviarRelatorioEncerramento(plantao, ausentesIds.length, fechamento.fechada_por);

    return {
      success: erros === 0,
      message: `Processamento concluído: ${sucessos} checkout(s) efetuado(s), ${erros} erro(s)`,
      ausentes: ausentesIds.length,
      detalhes: resultados,
      fechamento,
      snapshot,
      notificacao,
    };
  }

  private async registrarFechamentoOficial(input: {
    dataRef: string;
    ausentesIds: string[];
    resultados: Array<Record<string, unknown>>;
    actor?: AuthUser;
    observacoes?: string;
  }) {
    const rows = await this.estadiaRepository.query<Array<{ casa: string; total: number | string }>>(`
      SELECT c.casa, COUNT(e.id)::int AS total
      FROM estadias e
      JOIN camas c ON c.id = e.cama_id
      WHERE e.status = 'ativa'
      GROUP BY c.casa
    `);
    const porQuarto = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.casa] = Number(row.total || 0);
      return acc;
    }, {});
    const totalPresentes = Object.values(porQuarto).reduce((sum, value) => sum + value, 0);
    const fechamento = this.triagemFechamentoRepository.create({
      data_ref: dateFromKey(input.dataRef),
      fechada_em: new Date(),
      fechada_por: input.actor?.displayName || input.actor?.name || input.actor?.login || 'sistema',
      total_presentes: totalPresentes,
      total_ausentes: input.ausentesIds.length,
      por_quarto: porQuarto,
      ausentes_ids: input.ausentesIds,
      resultado_processamento: {
        detalhes: input.resultados,
      },
      observacoes: input.observacoes || null,
    });

    return this.triagemFechamentoRepository.save(fechamento);
  }

  /**
   * Monta e envia o relatório de encerramento (Telegram + e-mail) com os números
   * calculados direto do banco: demografia, vagas livres e novos cadastros do dia.
   * Chamado automaticamente pelo encerrar() — não depende mais de números vindos da tela.
   */
  private async enviarRelatorioEncerramento(plantao: string, ausentes: number, fechadaPor: string) {
    // Ambos derivados do plantão que está sendo fechado — não de "agora". Isso importa
    // sobretudo no reenvio manual (reenviarRelatorioEncerramento), que pode ser chamado
    // bem depois da meia-noite ou pra um data_ref retroativo: usar new Date() aqui faria
    // o relatório mostrar novos cadastros e rodapé do dia errado.
    const [demografia, novosCadastros] = await Promise.all([
      this.calcularDemografiaAtiva(),
      this.getNovosCadastrosHoje(plantao),
    ]);

    const dataFormatada = dateFromKey(plantao).toLocaleDateString('pt-BR');

    const configs = [
      ...(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_GROUP_COORDENACAO
        ? [{ tipo: 'telegram', destino: process.env.TELEGRAM_GROUP_COORDENACAO, nome: 'Telegram coordenação', ativo: true }]
        : []),
      ...(process.env.RESEND_API_KEY && process.env.TRIAGEM_EMAIL_DESTINATION && process.env.RESEND_FROM
        ? [{ tipo: 'email', destino: process.env.TRIAGEM_EMAIL_DESTINATION, nome: 'Email triagem', ativo: true }]
        : []),
    ];
    const incluirDadosSensiveis = process.env.TRIAGEM_NOTIFICATION_INCLUDE_PII === 'true';

    const resultadoNotifs: { telegram: boolean; email: boolean; telegramError?: string; emailError?: string } = {
      telegram: false,
      email: false
    };

    // Enviar Telegram via TelegramService
    {
      try {
        // Vagas livres por casa
        const vagasPorCasa = await this.camaRepository
          .createQueryBuilder('cama')
          .select('cama.casa', 'casa')
          .addSelect('COUNT(*)', 'total')
          .addSelect("SUM(CASE WHEN cama.status = 'DISPONIVEL' THEN 1 ELSE 0 END)", 'livres')
          .groupBy('cama.casa')
          .getRawMany<{ casa: string; total: string; livres: string }>();

        const totalLivres = vagasPorCasa.reduce((s, r) => s + Number(r.livres), 0);
        const vagasTexto = vagasPorCasa
          .map(r => `${this.telegramService.escapeMarkdown(r.casa)}: ${r.livres}/${r.total}`)
          .join(' · ');

        // Seção de novos cadastros
        let novosCadastrosBloco: string | undefined;
        if (novosCadastros.length > 0 && incluirDadosSensiveis) {
          const blocosPessoas = novosCadastros.map((cadastro, index) => {
            const nomePrincipal = this.telegramService.escapeMarkdown(getNomePrincipal(cadastro));
            const linhasPessoa = [`${index + 1}. *${nomePrincipal}*${cadastro.lgbt ? ' (LGBT+)' : ''}`];
            if (cadastro.nome_social?.trim()) linhasPessoa.push(`   Nome civil: ${this.telegramService.escapeMarkdown(cadastro.nome)}`);
            linhasPessoa.push(`   Nascimento: ${cadastro.dataNascimento} (${cadastro.idade} anos)`);
            linhasPessoa.push(`   CPF: ${cadastro.cpf || 'Não informado'}`);
            linhasPessoa.push(`   Raça/Cor: ${this.telegramService.escapeMarkdown(cadastro.raca || 'Não informado')}`);
            linhasPessoa.push(`   Gênero: ${this.telegramService.escapeMarkdown(cadastro.genero)}`);
            return linhasPessoa.join('\n');
          });
          novosCadastrosBloco = `Novos cadastros (${novosCadastros.length}):\n\n${blocosPessoas.join('\n\n')}`;
        } else if (novosCadastros.length > 0) {
          novosCadastrosBloco = `Novos cadastros: ${novosCadastros.length} — consulte os detalhes no sistema.`;
        }

        const linhas: Array<string | undefined> = [
          `Total: ${demografia.total}`,
          `Homens: ${demografia.homens} · Mulheres: ${demografia.mulheres}`,
          `Homens idosos: ${demografia.homensIdosos} · Mulheres idosas: ${demografia.mulheresIdosas}`,
          `LGBT+: ${demografia.lgbt}`,
          `Ausentes: ${ausentes}`,
          `Vagas livres: ${totalLivres} (${vagasTexto})`,
          `Encerrada por: ${this.telegramService.escapeMarkdown(fechadaPor)}`,
        ];
        if (novosCadastrosBloco) linhas.push('', novosCadastrosBloco);

        const message = this.telegramService.formatarMensagem(
          'Relatório final da triagem',
          linhas,
          `Plantão: ${dataFormatada}`,
        );

        const ok = await this.telegramService.sendMessage(message);
        resultadoNotifs.telegram = ok;
        if (!ok) resultadoNotifs.telegramError = 'Falha ao enviar (sem token ou resposta não-ok)';
      } catch (error) {
        resultadoNotifs.telegramError = this.errorMessage(error);
        console.error('❌ Erro Telegram:', error);
      }
    }

    // Enviar Email
    const emailConfig = configs.find(c => c.tipo === 'email' && c.ativo);
    const emailFrom = process.env.RESEND_FROM;
    if (emailConfig && emailFrom) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Seção de novos cadastros para email
        let novosCadastrosHtml = '';
        if (novosCadastros.length > 0 && incluirDadosSensiveis) {
          novosCadastrosHtml = `
            <div style="margin-top: 30px; padding: 20px; background-color: #F0FDF4; border-radius: 8px; border-left: 4px solid #10B981;">
              <h2 style="color: #059669; margin-top: 0;">✨ ${novosCadastros.length} Novo(s) Cadastro(s) Hoje</h2>
              ${novosCadastros.map((cadastro) => `
                <div style="background-color: white; padding: 15px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #D1FAE5;">
                  <h3 style="margin-top: 0; color: #1F2937;">${getNomePrincipal(cadastro)}</h3>
                  <table style="width: 100%; font-size: 14px;">
                    ${cadastro.nome_social?.trim() ? `
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;"><strong>Nome civil:</strong></td>
                      <td style="padding: 5px 0;">${cadastro.nome}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;"><strong>Data de Nascimento:</strong></td>
                      <td style="padding: 5px 0;">${cadastro.dataNascimento} (${cadastro.idade} anos)</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;"><strong>CPF:</strong></td>
                      <td style="padding: 5px 0;">${cadastro.cpf || 'Não informado'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;"><strong>Raça/Cor:</strong></td>
                      <td style="padding: 5px 0;">${cadastro.raca || 'Não informado'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;"><strong>Gênero:</strong></td>
                      <td style="padding: 5px 0;">${cadastro.genero}</td>
                    </tr>
                  </table>
                </div>
              `).join('')}
            </div>
          `;
        } else if (novosCadastros.length > 0) {
          novosCadastrosHtml = `
            <div style="margin-top: 30px; padding: 20px; background-color: #F0FDF4; border-radius: 8px; border-left: 4px solid #10B981;">
              <h2 style="color: #059669; margin-top: 0;">${novosCadastros.length} novo(s) cadastro(s) hoje</h2>
              <p style="margin-bottom: 0; color: #374151;">Consulte os detalhes no sistema com um perfil autorizado.</p>
            </div>
          `;
        }

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1F2937; text-align: center;">Relatório Final da Triagem</h1>
            <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #E5E7EB;">
                  <th style="padding: 12px; text-align: left; border: 1px solid #D1D5DB;">Categoria</th>
                  <th style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">Quantidade</th>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Total de Pessoas</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB; font-weight: bold;">${demografia.total}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Homens</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${demografia.homens}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Mulheres</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${demografia.mulheres}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Homens idosos</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${demografia.homensIdosos}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Mulheres idosas</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${demografia.mulheresIdosas}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">LGBT+</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${demografia.lgbt}</td>
                </tr>
                <tr style="background-color: #FEF3C7;">
                  <td style="padding: 12px; border: 1px solid #D1D5DB; font-weight: bold;">Ausentes</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB; font-weight: bold; color: #DC2626;">${ausentes}</td>
                </tr>
              </table>
            </div>
            ${novosCadastrosHtml}
            <p style="text-align: center; color: #6B7280; margin-top: 20px;">
              Data do relatório: <strong>${dataFormatada}</strong>
            </p>
            <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
              Este é um relatório automático gerado pelo sistema de triagem.
            </p>
          </div>
        `;

        await resend.emails.send({
          from: emailFrom,
          to: emailConfig.destino,
          subject: 'Relatório Final da Triagem - ' + dataFormatada,
          html,
        });

        resultadoNotifs.email = true;
        console.log(`✅ Email enviado para ${emailConfig.nome}`);
      } catch (error) {
        resultadoNotifs.emailError = this.errorMessage(error);
        console.error(`❌ Erro Email:`, error);
      }
    }

    return {
      success: resultadoNotifs.telegram || resultadoNotifs.email,
      telegram: resultadoNotifs.telegram,
      email: resultadoNotifs.email,
      telegramError: resultadoNotifs.telegramError,
      emailError: resultadoNotifs.emailError
    };
  }

  /**
   * Reenvio manual do relatório de encerramento — recalcula tudo do banco de novo,
   * não recebe número nenhum de fora. Útil se o envio automático falhar.
   */
  async reenviarRelatorioEncerramento(dataRef?: string) {
    const plantao = dataRef || getOperationalPlantaoKey();
    const fechamento = await this.triagemFechamentoRepository.findOne({
      where: { data_ref: dateFromKey(plantao) },
    });
    const ausentes = fechamento?.total_ausentes ?? 0;
    const fechadaPor = fechamento?.fechada_por ?? 'sistema';
    return this.enviarRelatorioEncerramento(plantao, ausentes, fechadaPor);
  }


  /**
   * Busca pessoas cadastradas hoje
   * Retorna dados formatados para o relatório de triagem
   */
  /**
   * Novos cadastros de um dia. Sem argumento, é "hoje" (uso do endpoint de dashboard,
   * que sempre quer o dia corrente). Com dataRef, busca o dia daquele plantão — usado
   * pelo relatório de encerramento, inclusive no reenvio manual retroativo, pra não
   * misturar cadastro de outro dia com o plantão que está sendo reportado.
   */
  async getNovosCadastrosHoje(dataRef?: string): Promise<NovoCadastroTriagem[]> {
    const inicio = dataRef
      ? dateFromKey(dataRef)
      : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);

    const novasPessoas = await this.pessoaRepository
      .createQueryBuilder('pessoa')
      .where('pessoa.created_at >= :inicio', { inicio })
      .andWhere('pessoa.created_at < :fim', { fim })
      .andWhere('pessoa.ativo = true')
      .orderBy('pessoa.created_at', 'DESC')
      .getMany();

    return novasPessoas.map(pessoa => {
      // Calcular idade
      let idade = 0;
      if (pessoa.data_nascimento) {
        const nascimento = new Date(pessoa.data_nascimento);
        const hoje = new Date();
        idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
          idade--;
        }
      }

      // Formatar data de nascimento
      const dataNascimento = pessoa.data_nascimento 
        ? new Date(pessoa.data_nascimento).toLocaleDateString('pt-BR')
        : 'Não informado';

      // Mapear gênero para exibição
      const generoMap: { [key: string]: string } = {
        'masculino': 'Masculino',
        'feminino': 'Feminino',
        'nao_binario': 'Não-binário',
        'outro': 'Outro',
        'prefiro_nao_dizer': 'Prefiro não dizer'
      };

      return {
        nome: pessoa.nome,
        dataNascimento,
        idade,
        cpf: pessoa.cpf ?? null,
        raca: pessoa.cor ?? null,
        genero: pessoa.genero ? (generoMap[pessoa.genero] || pessoa.genero) : 'Não informado',
        lgbt: pessoa.lgbt,
        nome_social: pessoa.nome_social ?? null
      };
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Erro desconhecido';
  }
}
