import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, BadRequestException, Query, Patch } from '@nestjs/common';
import { EspacoCuidadosService } from './espaco-cuidados.service';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return getErrorMessage(error);
  return String(error);
}

@Controller('espaco-cuidados')
export class EspacoCuidadosController {
  constructor(private readonly espacoCuidadosService: EspacoCuidadosService) {}

  // ============================================
  // SESSÕES
  // ============================================

  @Post('sessao/iniciar')
  @HttpCode(HttpStatus.OK)
  async iniciarSessao(@Body() body: { data: string; equipe: string[] }) {
    try {
      const data = new Date(body.data);
      const sessao = await this.espacoCuidadosService.iniciarSessao(data, body.equipe);
      return {
        success: true,
        message: 'Sessão iniciada com sucesso',
        data: sessao,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  @Post('sessao/:id/encerrar')
  @HttpCode(HttpStatus.OK)
  async encerrarSessao(@Param('id') id: string) {
    try {
      const sessao = await this.espacoCuidadosService.encerrarSessao(id);
      return {
        success: true,
        message: 'Sessão encerrada com sucesso',
        data: sessao,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  @Get('sessao/ativa')
  async getSessaoAtiva() {
    const sessao = await this.espacoCuidadosService.getSessaoAtiva();
    if (!sessao) {
      return {
        success: false,
        message: 'Não há sessão ativa no momento',
        data: null,
      };
    }
    return {
      success: true,
      data: sessao,
    };
  }

  @Get('sessao/:id')
  async getSessaoPorId(@Param('id') id: string) {
    try {
      const sessao = await this.espacoCuidadosService.getSessaoPorId(id);
      return {
        success: true,
        data: sessao,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // ============================================
  // FILA - GERENCIAMENTO
  // ============================================

  @Post('fila/adicionar')
  @HttpCode(HttpStatus.CREATED)
  async adicionarNaFila(
    @Body() body: {
      pessoaId: string;
      querBanho: boolean;
      querAtendimento: boolean;
      observacoes?: string;
    }
  ) {
    try {
      const entrada = await this.espacoCuidadosService.adicionarPessoaNaFila(body);
      return {
        success: true,
        message: 'Pessoa adicionada à fila com sucesso',
        data: entrada,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  @Get('fila/:sessaoId')
  async getFilaCompleta(@Param('sessaoId') sessaoId: string) {
    const fila = await this.espacoCuidadosService.getFilaAtual(sessaoId);
    return {
      success: true,
      data: fila,
    };
  }

  @Get('fila/:sessaoId/banho')
  async getFilaBanho(@Param('sessaoId') sessaoId: string) {
    const fila = await this.espacoCuidadosService.getFilaBanho(sessaoId);
    return {
      success: true,
      data: fila,
    };
  }

  @Get('fila/:sessaoId/atendimento')
  async getFilaAtendimento(@Param('sessaoId') sessaoId: string) {
    const fila = await this.espacoCuidadosService.getFilaAtendimento(sessaoId);
    return {
      success: true,
      data: fila,
    };
  }

  // ============================================
  // BANHO
  // ============================================

  @Post('banho/:id/iniciar')
  @HttpCode(HttpStatus.OK)
  async iniciarBanho(@Param('id') id: string) {
    try {
      const entrada = await this.espacoCuidadosService.iniciarBanho(id);
      return {
        success: true,
        message: 'Banho iniciado',
        data: entrada,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  @Post('banho/:id/finalizar')
  @HttpCode(HttpStatus.OK)
  async finalizarBanho(@Param('id') id: string) {
    try {
      const entrada = await this.espacoCuidadosService.finalizarBanho(id);
      return {
        success: true,
        message: 'Banho finalizado',
        data: entrada,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // ============================================
  // ATENDIMENTO
  // ============================================

  @Post('atendimento/:id/iniciar')
  @HttpCode(HttpStatus.OK)
  async iniciarAtendimento(@Param('id') id: string) {
    try {
      const entrada = await this.espacoCuidadosService.iniciarAtendimento(id);
      return {
        success: true,
        message: 'Atendimento iniciado',
        data: entrada,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  @Post('atendimento/:id/finalizar')
  @HttpCode(HttpStatus.OK)
  async finalizarAtendimento(@Param('id') id: string) {
    try {
      const entrada = await this.espacoCuidadosService.finalizarAtendimento(id);
      return {
        success: true,
        message: 'Atendimento finalizado',
        data: entrada,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // ============================================
  // AÇÕES
  // ============================================

  @Post(':id/passar-vez')
  @HttpCode(HttpStatus.OK)
  async passarVez(@Param('id') id: string, @Body() body: { tipo: 'banho' | 'atendimento' }) {
    try {
      const entrada = await this.espacoCuidadosService.passarVez(id, body.tipo);
      
      let mensagem = `Vez passada (${body.tipo})`;
      if (entrada.vezes_passou_vez >= 3) {
        mensagem += ` - ATENÇÃO: Esta pessoa já passou a vez ${entrada.vezes_passou_vez} vezes!`;
      }

      return {
        success: true,
        message: mensagem,
        data: entrada,
        alerta: entrada.vezes_passou_vez >= 3,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  @Post(':id/desistir')
  @HttpCode(HttpStatus.OK)
  async marcarDesistencia(@Param('id') id: string) {
    try {
      const entrada = await this.espacoCuidadosService.marcarDesistencia(id);
      return {
        success: true,
        message: 'Desistência registrada',
        data: entrada,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // ============================================
  // ESTATÍSTICAS
  // ============================================

  @Get('estatisticas/:sessaoId')
  async getEstatisticas(@Param('sessaoId') sessaoId: string) {
    try {
      const estatisticas = await this.espacoCuidadosService.getEstatisticas(sessaoId);
      return {
        success: true,
        data: estatisticas,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // ============================================
  // ENDPOINTS DE MONITORAMENTO
  // ============================================

  @Get('dashboard')
  async getDashboard() {
    const sessaoAtiva = await this.espacoCuidadosService.getSessaoAtiva();
    
    if (!sessaoAtiva) {
      return {
        success: false,
        message: 'Não há sessão ativa',
        data: null,
      };
    }

    const estatisticas = await this.espacoCuidadosService.getEstatisticas(sessaoAtiva.id);
    const filaBanho = await this.espacoCuidadosService.getFilaBanho(sessaoAtiva.id);
    const filaAtendimento = await this.espacoCuidadosService.getFilaAtendimento(sessaoAtiva.id);

    return {
      success: true,
      data: {
        sessao: sessaoAtiva,
        estatisticas,
        filas: {
          banho: filaBanho,
          atendimento: filaAtendimento,
        },
      },
    };
  }

  // ============================================
  // HISTÓRICO DE SESSÕES
  // ============================================

  @Get('historico')
  async getHistorico(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ) {
    try {
      const result = await this.espacoCuidadosService.getHistoricoSessoes({
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
        status: status as any,
      });
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // ============================================
  // ANALYTICS COMPARATIVOS
  // ============================================

  @Get('analytics/comparativo')
  async getComparativo(@Query('sessoes') sessoes?: string) {
    try {
      const sessaoIds = sessoes ? sessoes.split(',') : undefined;
      const comparativo = await this.espacoCuidadosService.getAnalyticsComparativo(sessaoIds);
      return {
        success: true,
        data: comparativo,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  @Get('analytics/tendencias')
  async getTendencias(
    @Query('dias') dias?: string,
    @Query('tipo') tipo?: string,
  ) {
    try {
      const result = await this.espacoCuidadosService.getTendencias({
        dias: dias ? parseInt(dias) : 30,
        tipo: tipo as 'atendimentos' | 'tempos' | 'novos_cadastros' | undefined,
      });
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // ============================================
  // REORDENAR FILA (DRAG & DROP)
  // ============================================

  @Patch('fila/reordenar')
  @HttpCode(HttpStatus.OK)
  async reordenarFila(@Body() body: { sessaoId: string; ordemNova: string[] }) {
    try {
      await this.espacoCuidadosService.reordenarFila(body.sessaoId, body.ordemNova);
      return {
        success: true,
        message: 'Fila reordenada com sucesso',
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }
}
