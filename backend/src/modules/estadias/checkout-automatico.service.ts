import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estadia, MotivoSaida } from '../../entities/estadia.entity';
import { EstadiasService } from './estadias.service';

interface EstadiaVencidaRow {
  estadia_id: string;
  pessoa_id: string;
  status: string;
  data_limite: string;
  pessoa_nome: string;
  data_hoje: string;
  dias_vencidos: number | string;
}

function toDateKey(value: unknown): string {
  if (typeof value === 'string') {
    return value.split('T')[0];
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new Error(`Data invalida: ${String(value)}`);
}

export interface CheckoutAutomaticoItem {
  id: string;
  pessoa: string;
  data_limite: string;
  status: 'sucesso' | 'erro';
  erro?: string;
}

@Injectable()
export class CheckoutAutomaticoService implements OnApplicationBootstrap {
  private processing = false;

  constructor(
    @InjectRepository(Estadia)
    private estadiaRepository: Repository<Estadia>,
    private estadiasService: EstadiasService,
  ) {
    console.log('CheckoutAutomaticoService inicializado - cron configurado para meia-noite');
  }

  async onApplicationBootstrap() {
    await this.handleCheckoutAutomatico('startup');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: process.env.TZ || 'America/Sao_Paulo',
  })
  async handleCheckoutAutomatico(origem: 'cron' | 'startup' = 'cron') {
    if (this.processing) {
      console.log(`Checkout automatico ja em execucao, ignorando disparo de ${origem}.`);
      return;
    }

    this.processing = true;
    const dataHoraExecucao = new Date();
    console.log('\n========================================');
    console.log('INICIANDO CHECKOUT AUTOMATICO');
    console.log(`Origem: ${origem}`);
    console.log('========================================');
    console.log('Data/Hora:', dataHoraExecucao.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    console.log('\nLOGICA DE ESTADIA (30 NOITES):');
    console.log('  - Check-in conta como primeira noite');
    console.log('  - O ultimo dia permitido e o data_limite');
    console.log('  - O checkout automatico deve ocorrer na virada para esse dia');
    console.log('');

    try {
      const estadiasVencidas = await this.estadiaRepository.query<EstadiaVencidaRow[]>(`
        SELECT
          e.id as estadia_id,
          e.pessoa_id,
          e.status,
          e.data_limite,
          COALESCE(NULLIF(BTRIM(p.nome_social), ''), p.nome) as pessoa_nome,
          CURRENT_DATE as data_hoje,
          (CURRENT_DATE - e.data_limite) as dias_vencidos
        FROM estadias e
        JOIN pessoas p ON e.pessoa_id = p.id
        WHERE e.status = 'ativa'
          AND e.data_limite <= CURRENT_DATE
        ORDER BY e.data_limite
      `);

      console.log(`Encontradas ${estadiasVencidas.length} estadias vencidas`);

      if (estadiasVencidas.length === 0) {
        console.log('Nenhuma estadia vencida para processar');
        console.log('========================================\n');
        return {
          success: true,
          totalProcessadas: 0,
          estadias: [],
        };
      }

      console.log('\nEstadias que serao processadas:');
      estadiasVencidas.forEach((e) => {
        console.log(`  - ${e.pessoa_nome} - Vencida ha ${e.dias_vencidos} dia(s)`);
      });

      const results: CheckoutAutomaticoItem[] = [];
      let sucessos = 0;
      let falhas = 0;

      for (const estadia of estadiasVencidas) {
        try {
          console.log(`\nProcessando: ${estadia.pessoa_nome}...`);

          const dataLimite = toDateKey(estadia.data_limite);
          const checkoutEfetivo = new Date(`${dataLimite}T00:00:00`);

          await this.estadiasService.checkout(
            estadia.pessoa_id,
            'sistema_automatico',
            `Checkout automatico - Estadia vencida em ${dataLimite}`,
            MotivoSaida.AUTOMATICO,
            checkoutEfetivo,
          );

          console.log(`Checkout concluido: ${estadia.pessoa_nome}`);
          sucessos++;

          results.push({
            id: estadia.estadia_id,
            pessoa: estadia.pessoa_nome,
            data_limite: estadia.data_limite,
            status: 'sucesso',
          });
        } catch (error) {
          console.error(`ERRO ao processar ${estadia.pessoa_nome}:`, error instanceof Error ? error.message : error);
          falhas++;

          results.push({
            id: estadia.estadia_id,
            pessoa: estadia.pessoa_nome,
            data_limite: estadia.data_limite,
            status: 'erro',
            erro: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }

      console.log('\n========================================');
      console.log('CHECKOUT AUTOMATICO FINALIZADO');
      console.log(`Sucessos: ${sucessos} | Falhas: ${falhas}`);
      console.log('========================================\n');

      return {
        success: true,
        totalProcessadas: estadiasVencidas.length,
        sucessos,
        falhas,
        estadias: results,
      };
    } catch (error) {
      console.error('\n========================================');
      console.error('ERRO CRITICO NO CHECKOUT AUTOMATICO');
      console.error('========================================');
      console.error(error);
      console.error('========================================\n');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        totalProcessadas: 0,
      };
    } finally {
      this.processing = false;
    }
  }
}
