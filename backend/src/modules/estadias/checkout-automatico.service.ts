import { Injectable } from '@nestjs/common';
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

export interface CheckoutAutomaticoItem {
  id: string;
  pessoa: string;
  data_limite: string;
  status: 'sucesso' | 'erro';
  erro?: string;
}

@Injectable()
export class CheckoutAutomaticoService {
  constructor(
    @InjectRepository(Estadia)
    private estadiaRepository: Repository<Estadia>,
    private estadiasService: EstadiasService,
  ) {
    console.log('✅ CheckoutAutomaticoService inicializado - Cron configurado para meia-noite');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Executa diariamente à meia-noite
  async handleCheckoutAutomatico() {
    const dataHoraExecucao = new Date();
    console.log('\n🔄 ========================================');
    console.log('🔄 INICIANDO CHECKOUT AUTOMÁTICO');
    console.log('🔄 ========================================');
    console.log('⏰ Data/Hora:', dataHoraExecucao.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    console.log('\n📖 LÓGICA DE ESTADIA (30 NOITES):');
    console.log('   • Check-in dia 20/12 → Dia 20 já conta como 1ª noite');
    console.log('   • Período: 30 noites (20/12 a 18/01)');
    console.log('   • Data limite: 18/01 (última noite permitida)');
    console.log('   • Checkout automático: Meia-noite de 18/01 para 19/01');
    console.log('   • Resultado: Cama livre para nova triagem às 18h30 do dia 19/01');
    console.log('');

    try {
      // BUSCAR ESTADIAS VENCIDAS
      // Condição: data_limite <= CURRENT_DATE (corrigido de < para <=)
      // Lógica: Se data_limite = 19/01 (hoje), significa que a última noite foi 18/01
      //         Portanto, o checkout deve acontecer à meia-noite de 19/01 (hoje)
      // Exemplo: Check-in 21/12 → 30 noites → data_limite 19/01 → checkout 19/01 00:00
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

      console.log(`📋 Encontradas ${estadiasVencidas.length} estadias vencidas`);
      
      if (estadiasVencidas.length === 0) {
        console.log('✅ Nenhuma estadia vencida para processar');
        console.log('🔄 ========================================\n');
        return {
          success: true,
          totalProcessadas: 0,
          estadias: []
        };
      }

      console.log('\n📝 Estadias que serão processadas:');
      estadiasVencidas.forEach((e) => {
        console.log(`  • ${e.pessoa_nome} - Vencida há ${e.dias_vencidos} dia(s)`);
      });

      const results: CheckoutAutomaticoItem[] = [];
      let sucessos = 0;
      let falhas = 0;

      // Processar cada estadia usando o método checkout() existente
      for (const estadia of estadiasVencidas) {
        try {
          console.log(`\n🔄 Processando: ${estadia.pessoa_nome}...`);
          
          // USAR O MÉTODO CHECKOUT EXISTENTE QUE JÁ FUNCIONA
          await this.estadiasService.checkout(
            estadia.pessoa_id,
            'sistema_automatico',
            `Checkout automático - Estadia vencida em ${estadia.data_limite}`,
            MotivoSaida.AUTOMATICO
          );

          console.log(`✅ Checkout concluído: ${estadia.pessoa_nome}`);
          sucessos++;
          
          results.push({
            id: estadia.estadia_id,
            pessoa: estadia.pessoa_nome,
            data_limite: estadia.data_limite,
            status: 'sucesso'
          });
        } catch (error) {
          console.error(`❌ ERRO ao processar ${estadia.pessoa_nome}:`, error instanceof Error ? error.message : error);
          falhas++;
          
          results.push({
            id: estadia.estadia_id,
            pessoa: estadia.pessoa_nome,
            data_limite: estadia.data_limite,
            status: 'erro',
            erro: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      console.log('\n🏁 ========================================');
      console.log('🏁 CHECKOUT AUTOMÁTICO FINALIZADO');
      console.log(`📊 Sucessos: ${sucessos} | Falhas: ${falhas}`);
      console.log('🏁 ========================================\n');

      return {
        success: true,
        totalProcessadas: estadiasVencidas.length,
        sucessos,
        falhas,
        estadias: results
      };

    } catch (error) {
      console.error('\n❌ ========================================');
      console.error('❌ ERRO CRÍTICO NO CHECKOUT AUTOMÁTICO');
      console.error('❌ ========================================');
      console.error(error);
      console.error('❌ ========================================\n');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        totalProcessadas: 0
      };
    }
  }
}
