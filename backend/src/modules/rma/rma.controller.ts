import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RmaService } from './rma.service';
import { UploadRmaDto } from './dto/upload-rma.dto';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { assertXlsxUpload, FILE_LIMITS } from '../../common/upload/file-validation';
import { ResultadoConferencia } from './interfaces/rma.interface';

@Controller('rma')
@Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EQUIPE_TECNICA)
export class RmaController {
  // Armazenamento temporário dos resultados (em produção, usar Redis ou banco)
  private resultadosCache = new Map<string, ResultadoConferencia>();

  constructor(private readonly rmaService: RmaService) {}

  /**
   * Upload do arquivo Excel e processamento da conferência
   */
  @Post('conferir')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: FILE_LIMITS.rmaPlanilha } }))
  async conferirRMA(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadRmaDto,
  ) {
    assertXlsxUpload(file);

    try {
      // 1. Ler arquivo Excel
      const pessoasGesuas = await this.rmaService.lerArquivoGesuas(file);

      // 2. Buscar estadias ativas no período
      const dataInicio = new Date(uploadDto.dataInicio);
      const dataFim = new Date(uploadDto.dataFim);
      const estadias = await this.rmaService.buscarEstadiasAtivas(dataInicio, dataFim);

      // 3. Comparar dados
      const resultado = await this.rmaService.compararDados(pessoasGesuas, estadias);
      resultado.periodo = { inicio: dataInicio, fim: dataFim };

      // 4. Salvar resultado em cache
      this.resultadosCache.set(resultado.id, resultado);

      return {
        success: true,
        message: 'Conferência realizada com sucesso',
        resultado,
      };
    } catch (error) {
      console.error('Erro ao processar conferência RMA:', error);
      throw new BadRequestException(error instanceof Error ? error.message : 'Erro ao processar conferência');
    }
  }

  /**
   * Buscar resultado de uma conferência
   */
  @Get('resultado/:id')
  async buscarResultado(@Param('id') id: string) {
    const resultado = this.resultadosCache.get(id);
    
    if (!resultado) {
      throw new BadRequestException('Resultado não encontrado ou expirado');
    }

    return {
      success: true,
      resultado,
    };
  }

  /**
   * Exportar relatório consolidado em Excel
   */
  @Get('exportar/:id')
  async exportarRelatorio(@Param('id') id: string, @Res() res: Response) {
    const resultado = this.resultadosCache.get(id);
    
    if (!resultado) {
      throw new BadRequestException('Resultado não encontrado ou expirado');
    }

    try {
      // Gerar relatório consolidado
      const relatorio = await this.rmaService.gerarRelatorioConsolidado(resultado);
      
      // Exportar para Excel
      const buffer = await this.rmaService.exportarParaExcel(relatorio);

      // Configurar headers para download
      const dataAtual = new Date().toISOString().split('T')[0];
      const filename = `relatorio-rma-${dataAtual}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw new BadRequestException('Erro ao exportar relatório');
    }
  }

  /**
   * Limpar cache de resultados antigos (chamar via cron job)
   */
  @Post('limpar-cache')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE)
  limparCache() {
    this.resultadosCache.clear();
    return {
      success: true,
      message: 'Cache limpo com sucesso',
    };
  }
}
