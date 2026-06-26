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
import { DashboardService } from '../dashboard/dashboard.service';
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
    private readonly dashboardService: DashboardService,
  ) {}

  async getStatus(dataRef?: string) {
    const plantao = dataRef || getOperationalPlantaoKey();
    const fechamento = await this.triagemFechamentoRepository.findOne({
      where: { data_ref: dateFromKey(plantao) },
    });

    return {
      data_ref: plantao,
      encerrada: Boolean(fechamento),
      fechamento,
    };
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

    return {
      success: erros === 0,
      message: `Processamento concluído: ${sucessos} checkout(s) efetuado(s), ${erros} erro(s)`,
      ausentes: ausentesIds.length,
      detalhes: resultados,
      fechamento,
      snapshot,
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
      fechada_por: input.actor?.displayName || input.actor?.login || 'sistema',
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

  async notificarEncerramento(dadosRelatorio: {
    total: number;
    masc: number;
    fem: number;
    idosos: number;
    ausentes: number;
    lgbt?: number;
    data: string;
  }) {
    // Buscar novos cadastros do dia
    const novosCadastros = await this.getNovosCadastrosHoje();

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

    // Enviar Telegram
    const telegramConfig = configs.find(c => c.tipo === 'telegram' && c.ativo);
    if (telegramConfig) {
      try {
        const lgbtInfo = dadosRelatorio.lgbt ? `\n🏳️‍🌈 **LGBT+:** ${dadosRelatorio.lgbt}` : '';
        
        // Seção de novos cadastros
        let novosCadastrosTexto = '';
        if (novosCadastros.length > 0 && incluirDadosSensiveis) {
          novosCadastrosTexto = `\n\n✨ *${novosCadastros.length} Novo(s) Cadastro(s) Hoje:*\n\n`;
          novosCadastros.forEach((cadastro, index) => {
            novosCadastrosTexto += `${index + 1}. *${getNomePrincipal(cadastro)}*`;
            
            // Adicionar indicador LGBT
            if (cadastro.lgbt) {
              novosCadastrosTexto += ` 🏳️‍🌈`;
            }
            
            novosCadastrosTexto += `\n`;
            
            // O nome civil permanece disponível apenas como informação cadastral complementar.
            if (cadastro.nome_social?.trim()) {
              novosCadastrosTexto += `   • Nome civil: ${cadastro.nome}\n`;
            }
            
            novosCadastrosTexto += `   • Nascimento: ${cadastro.dataNascimento} (${cadastro.idade} anos)\n`;
            novosCadastrosTexto += `   • CPF: ${cadastro.cpf || 'Não informado'}\n`;
            novosCadastrosTexto += `   • Raça/Cor: ${cadastro.raca || 'Não informado'}\n`;
            novosCadastrosTexto += `   • Gênero: ${cadastro.genero}\n\n`;
          });
        } else if (novosCadastros.length > 0) {
          novosCadastrosTexto = `\n\n✨ *${novosCadastros.length} novo(s) cadastro(s) hoje.* Consulte os detalhes no sistema.`;
        }

        const message = `🌙 *Relatório Final da Triagem*\n\n📊 **Total:** ${dadosRelatorio.total}\n👨 **Masculino:** ${dadosRelatorio.masc}\n👩 **Feminino:** ${dadosRelatorio.fem}\n👴 **Idosos:** ${dadosRelatorio.idosos}${lgbtInfo}\n❌ **Ausentes:** ${dadosRelatorio.ausentes}${novosCadastrosTexto}\n📅 Data: ${dadosRelatorio.data}`;

        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramConfig.destino,
            text: message,
            parse_mode: 'Markdown'
          }),
        });
        
        if (response.ok) {
          resultadoNotifs.telegram = true;
          console.log(`✅ Telegram enviado para ${telegramConfig.nome}`);
        } else {
          const error = await response.text();
          resultadoNotifs.telegramError = error;
          console.error(`❌ Erro Telegram:`, error);
        }
      } catch (error) {
        resultadoNotifs.telegramError = this.errorMessage(error);
        console.error(`❌ Erro Telegram:`, error);
      }
    }

    // Enviar Email
    const emailConfig = configs.find(c => c.tipo === 'email' && c.ativo);
    const emailFrom = process.env.RESEND_FROM;
    if (emailConfig && emailFrom) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const lgbtRow = dadosRelatorio.lgbt ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #D1D5DB;">LGBT+</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${dadosRelatorio.lgbt}</td>
          </tr>` : '';

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
            <h1 style="color: #1F2937; text-align: center;">🌙 Relatório Final da Triagem</h1>
            <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #E5E7EB;">
                  <th style="padding: 12px; text-align: left; border: 1px solid #D1D5DB;">Categoria</th>
                  <th style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">Quantidade</th>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Total de Pessoas</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB; font-weight: bold;">${dadosRelatorio.total}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Masculino</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${dadosRelatorio.masc}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Feminino</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${dadosRelatorio.fem}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Idosos</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${dadosRelatorio.idosos}</td>
                </tr>${lgbtRow}
                <tr style="background-color: #FEF3C7;">
                  <td style="padding: 12px; border: 1px solid #D1D5DB; font-weight: bold;">Ausentes</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB; font-weight: bold; color: #DC2626;">${dadosRelatorio.ausentes}</td>
                </tr>
              </table>
            </div>
            ${novosCadastrosHtml}
            <p style="text-align: center; color: #6B7280; margin-top: 20px;">
              📅 Data do relatório: <strong>${dadosRelatorio.data}</strong>
            </p>
            <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
              Este é um relatório automático gerado pelo sistema de triagem.
            </p>
          </div>
        `;

        await resend.emails.send({
          from: emailFrom,
          to: emailConfig.destino,
          subject: '🌙 Relatório Final da Triagem - ' + dadosRelatorio.data,
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
   * Busca pessoas cadastradas hoje
   * Retorna dados formatados para o relatório de triagem
   */
  async getNovosCadastrosHoje(): Promise<NovoCadastroTriagem[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const novasPessoas = await this.pessoaRepository
      .createQueryBuilder('pessoa')
      .where('pessoa.created_at >= :hoje', { hoje })
      .andWhere('pessoa.created_at < :amanha', { amanha })
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

      // Mapear raça/cor para exibição
      const racaMap: { [key: string]: string } = {
        'branca': 'Branca',
        'preta': 'Preta',
        'parda': 'Parda',
        'amarela': 'Amarela',
        'indigena': 'Indígena',
        'nao_declarada': 'Não declarada'
      };

      return {
        nome: pessoa.nome,
        dataNascimento,
        idade,
        cpf: pessoa.cpf ?? null,
        raca: pessoa.raca ? racaMap[pessoa.raca] : null,
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
