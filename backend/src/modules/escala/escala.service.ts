import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escala } from '../../entities/escala.entity';
import { RegraEscala } from '../../entities/regra-escala.entity';
import { Plantao } from '../../entities/plantao.entity';
import { Colaborador } from '../../entities/colaborador.entity';

@Injectable()
export class EscalaService {
  private readonly logger = new Logger(EscalaService.name);

  // Data de referência: 01/01/2024 foi plantão da Equipe A
  private readonly DATA_REFERENCIA = new Date(2024, 0, 1);

  constructor(
    @InjectRepository(Escala)
    private readonly escalaRepository: Repository<Escala>,
    @InjectRepository(RegraEscala)
    private readonly regraRepository: Repository<RegraEscala>,
    @InjectRepository(Plantao)
    private readonly plantaoRepository: Repository<Plantao>,
    @InjectRepository(Colaborador)
    private readonly colaboradorRepository: Repository<Colaborador>,
  ) {}

  /**
   * Calcula a diferença em dias entre uma data e a data de referência
   */
  private calcularDiferencaDias(data: Date): number {
    const diffTime = data.getTime() - this.DATA_REFERENCIA.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica qual equipe trabalha no dia para escala 12x36
   * Equipe A trabalha em dias PARES desde a referência (01/01/2024)
   * Equipe B trabalha em dias ÍMPARES desde a referência
   */
  private getEquipeDoDia(data: Date): 'A' | 'B' {
    const diasDesdeReferencia = this.calcularDiferencaDias(data);
    return diasDesdeReferencia % 2 === 0 ? 'A' : 'B';
  }

  /**
   * Retorna o número da semana no ano (1-52)
   */
  private getNumeroSemana(data: Date): number {
    const primeiroDiaAno = new Date(data.getFullYear(), 0, 1);
    const diasPassados = Math.floor((data.getTime() - primeiroDiaAno.getTime()) / (1000 * 60 * 60 * 24));
    return Math.ceil((diasPassados + primeiroDiaAno.getDay() + 1) / 7);
  }

  /**
   * Verifica se o volante trabalha no final de semana baseado no revezamento
   * - Alternado_A: Semana ímpar = Sábado, Semana par = Domingo
   * - Alternado_B: Semana ímpar = Domingo, Semana par = Sábado
   */
  private volanteTrabalhaNoDiaFDS(revezamento: string, data: Date): boolean {
    const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
    
    // Para calcular a semana do FDS, usar o sábado como referência
    // Se for domingo, considera a semana do sábado anterior
    let dataParaSemana = data;
    if (diaSemana === 0) {
      dataParaSemana = new Date(data);
      dataParaSemana.setDate(dataParaSemana.getDate() - 1); // Volta para o sábado
    }
    const numeroSemana = this.getNumeroSemana(dataParaSemana);
    const semanaImpar = numeroSemana % 2 !== 0;

    switch (revezamento) {
      case 'TodoSabado':
        return diaSemana === 6;
      case 'TodoDomingo':
        return diaSemana === 0;
      case 'Alternado_A':
        // Semana ímpar = Sábado, Semana par = Domingo
        return semanaImpar ? diaSemana === 6 : diaSemana === 0;
      case 'Alternado_B':
        // Semana ímpar = Domingo, Semana par = Sábado (inverso do A)
        return semanaImpar ? diaSemana === 0 : diaSemana === 6;
      case 'NaoTrabalha':
      default:
        return false;
    }
  }

  async gerarEscalaMensal(mes: number, ano: number): Promise<{ message: string; plantaoesGerados: number }> {
    throw new Error('Método antigo removido. Use gerarEscalaAutomatica.');
  }

  async gerarEscalaAutomatica(mesAno: string): Promise<{ message: string; plantaoesGerados: number }> {
    this.logger.log(`Iniciando geração de escala para: ${mesAno}`);

    const [ano, mes] = mesAno.split('-').map(Number);
    if (!ano || !mes) {
      throw new Error('Formato inválido. Use YYYY-MM (ex: 2025-12)');
    }

    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    let plantaoesGerados = 0;

    // LIMPAR escala existente do mês antes de gerar nova
    const primeiroDiaStr = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDiaStr = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia.getDate()}`;
    
    const deletados = await this.plantaoRepository
      .createQueryBuilder()
      .delete()
      .where('data >= :inicio AND data <= :fim', { inicio: primeiroDiaStr, fim: ultimoDiaStr })
      .execute();
    
    this.logger.log(`Plantões anteriores removidos: ${deletados.affected || 0}`);

    // Buscar colaboradores ativos
    const colaboradoresAtivos = await this.colaboradorRepository.find({ where: { ativo: true } });
    
    // Separar por modelo de escala
    const educadores12x36 = colaboradoresAtivos.filter(c => c.modelo_escala === '12x36');
    const volantes = colaboradoresAtivos.filter(c => c.modelo_escala === 'Semanal');

    this.logger.log(`Colaboradores: ${educadores12x36.length} educadores 12x36, ${volantes.length} volantes semanais`);

    // Iterar por cada dia do mês
    for (let data = new Date(primeiroDia); data <= ultimoDia; data.setDate(data.getDate() + 1)) {
      const dataAtual = new Date(data);
      // Formatar data como YYYY-MM-DD sem conversão de timezone
      const ano = dataAtual.getFullYear();
      const mesStr = String(dataAtual.getMonth() + 1).padStart(2, '0');
      const diaStr = String(dataAtual.getDate()).padStart(2, '0');
      const dataISO = `${ano}-${mesStr}-${diaStr}`;
      const diaSemana = dataAtual.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

      // ========================================
      // CASO 1: Educadores 12x36 (dia sim, dia não)
      // ========================================
      const equipeDoDia = this.getEquipeDoDia(dataAtual);
      
      for (const educador of educadores12x36) {
        if (!educador.nome || !educador.id) continue;

        // Verificar se o educador é da equipe que trabalha hoje
        if (educador.equipe_12x36 !== equipeDoDia) {
          continue; // Não é dia dessa equipe
        }

        // Verificar se já existe plantão
        const plantaoExistente = await this.plantaoRepository.findOne({
          where: { data: dataAtual, colaborador_id: educador.id }
        });

        if (!plantaoExistente) {
          try {
            const novoPlantao = this.plantaoRepository.create({
              data: dataAtual,
              colaborador_id: educador.id,
              resumo_turno: educador.turno_12x36 || 'Noite (19-07)',
              unidade: educador.unidade || 'Geral',
            });
            await this.plantaoRepository.save(novoPlantao);
            plantaoesGerados++;
          } catch (error) {
            this.logger.error(`Erro ao salvar plantão 12x36 para ${educador.nome}:`, error);
          }
        }
      }

      // ========================================
      // CASO 2: Volantes Semanais (Seg-Sex + revezamento FDS)
      // ========================================
      for (const volante of volantes) {
        if (!volante.nome || !volante.id) continue;

        let deveTrabalhar = false;
        
        // Verificar se é dia útil (Seg-Sex)
        if (diaSemana >= 1 && diaSemana <= 5) {
          // Parse dos dias da semana que o volante trabalha
          let diasSemanais: number[] = [];
          
          if (typeof volante.dias_semanais === 'string') {
            try {
              const parsed = JSON.parse(volante.dias_semanais);
              // Converter strings para números (pode vir como ["1","2","3","4","5"])
              diasSemanais = Array.isArray(parsed) ? parsed.map((d: any) => Number(d)) : [1, 2, 3, 4, 5];
            } catch {
              diasSemanais = [1, 2, 3, 4, 5]; // Seg-Sex por padrão
            }
          } else if (Array.isArray(volante.dias_semanais)) {
            diasSemanais = (volante.dias_semanais as any[]).map((d: any) => Number(d));
          } else {
            diasSemanais = [1, 2, 3, 4, 5]; // Seg-Sex por padrão
          }

          deveTrabalhar = diasSemanais.includes(diaSemana);
        } else {
          // É final de semana - verificar revezamento
          deveTrabalhar = this.volanteTrabalhaNoDiaFDS(volante.revezamento_fds || 'NaoTrabalha', dataAtual);
        }

        if (deveTrabalhar) {
          // Verificar se já existe plantão
          const plantaoExistente = await this.plantaoRepository.findOne({
            where: { data: dataAtual, colaborador_id: volante.id }
          });

          if (!plantaoExistente) {
            try {
              const novoPlantao = this.plantaoRepository.create({
                data: dataAtual,
                colaborador_id: volante.id,
                resumo_turno: volante.horario_semanal || '08:00 - 17:00',
                unidade: volante.unidade || 'Geral',
              });
              await this.plantaoRepository.save(novoPlantao);
              plantaoesGerados++;
            } catch (error) {
              this.logger.error(`Erro ao salvar plantão semanal para ${volante.nome}:`, error);
            }
          }
        }
      }
    }

    this.logger.log(`Escala gerada! Total de plantões: ${plantaoesGerados}`);

    return {
      message: `Escala gerada com sucesso para ${mes}/${ano}`,
      plantaoesGerados,
    };
  }

  async findAll(): Promise<Escala[]> {
    return this.escalaRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Escala | null> {
    return this.escalaRepository.findOne({ where: { id } });
  }

  async create(escalaData: Partial<Escala>): Promise<Escala> {
    const escala = this.escalaRepository.create(escalaData);
    return this.escalaRepository.save(escala);
  }

  async update(id: string, escalaData: Partial<Escala>): Promise<Escala | null> {
    await this.escalaRepository.update(id, escalaData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.escalaRepository.delete(id);
  }
}
