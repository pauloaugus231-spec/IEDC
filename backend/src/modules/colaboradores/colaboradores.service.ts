import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colaborador } from '../../entities/colaborador.entity';

export interface CreateColaboradorDto {
  nome: string;
  funcao: string;
  ativo?: boolean;
  unidade?: string;
  modelo_escala?: string;
  equipe_12x36?: string;
  turno_12x36?: string;
  dias_semanais?: number[];
  horario_semanal?: string;
  revezamento_fds?: string;
}

export interface UpdateColaboradorDto {
  nome?: string;
  funcao?: string;
  ativo?: boolean;
  unidade?: string;
  modelo_escala?: string;
  equipe_12x36?: string;
  turno_12x36?: string;
  dias_semanais?: number[];
  horario_semanal?: string;
  revezamento_fds?: string;
}

@Injectable()
export class ColaboradoresService {
  constructor(
    @InjectRepository(Colaborador)
    private colaboradorRepository: Repository<Colaborador>,
  ) {}

  async create(createColaboradorDto: CreateColaboradorDto): Promise<Colaborador> {
    // Converter array dias_semanais para JSON string se necessário
    const dto = { ...createColaboradorDto };
    if (dto.dias_semanais && Array.isArray(dto.dias_semanais)) {
      (dto as any).dias_semanais = JSON.stringify(dto.dias_semanais);
    }

    const colaborador = this.colaboradorRepository.create(dto as Partial<Colaborador>);
    return this.colaboradorRepository.save(colaborador);
  }

  async findAll(): Promise<Colaborador[]> {
    const colaboradores = await this.colaboradorRepository.find({
      order: { created_at: 'DESC' },
    });

    // Converter string JSON dias_semanais de volta para array
    return colaboradores.map(colab => {
      if (colab.dias_semanais && typeof colab.dias_semanais === 'string') {
        try {
          (colab as any).dias_semanais = JSON.parse(colab.dias_semanais);
        } catch (error) {
          (colab as any).dias_semanais = [];
        }
      }
      return colab;
    });
  }

  async findOne(id: string): Promise<Colaborador> {
    const colaborador = await this.colaboradorRepository.findOne({ where: { id } });
    if (!colaborador) {
      throw new NotFoundException(`Colaborador com ID ${id} não encontrado`);
    }

    // Converter string JSON dias_semanais de volta para array
    if (colaborador.dias_semanais && typeof colaborador.dias_semanais === 'string') {
      try {
        (colaborador as any).dias_semanais = JSON.parse(colaborador.dias_semanais);
      } catch (error) {
        (colaborador as any).dias_semanais = [];
      }
    }

    return colaborador;
  }

  async update(id: string, updateColaboradorDto: UpdateColaboradorDto): Promise<Colaborador> {
    const colaborador = await this.findOne(id);

    // Converter array dias_semanais para JSON string se necessário
    const dto = { ...updateColaboradorDto };
    if (dto.dias_semanais && Array.isArray(dto.dias_semanais)) {
      (dto as any).dias_semanais = JSON.stringify(dto.dias_semanais);
    }

    Object.assign(colaborador, dto);
    return this.colaboradorRepository.save(colaborador);
  }

  async remove(id: string): Promise<void> {
    const colaborador = await this.findOne(id);
    await this.colaboradorRepository.remove(colaborador);
  }
}
