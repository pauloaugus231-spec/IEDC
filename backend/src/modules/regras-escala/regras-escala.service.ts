import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegraEscala, TipoAlocacao } from '../../entities/regra-escala.entity';

export interface CreateRegraEscalaDto {
  colaborador_id?: string | null;
  turno_id: string;
  tipo_alocacao?: TipoAlocacao;
  dias_semana?: number[];
  data_inicio?: string;
  data_fim?: string;
}

export interface UpdateRegraEscalaDto {
  colaborador_id?: string;
  turno_id?: string;
  tipo_alocacao?: TipoAlocacao;
  dias_semana?: string[];
  data_inicio?: string;
  data_fim?: string;
}

@Injectable()
export class RegrasEscalaService {
  constructor(
    @InjectRepository(RegraEscala)
    private regraEscalaRepository: Repository<RegraEscala>,
  ) {}

  async create(createRegraEscalaDto: CreateRegraEscalaDto): Promise<RegraEscala> {
    const regra = this.regraEscalaRepository.create({
      ...createRegraEscalaDto,
      colaborador_id: createRegraEscalaDto.colaborador_id || undefined,
      data_inicio: createRegraEscalaDto.data_inicio ? new Date(createRegraEscalaDto.data_inicio) : undefined,
      data_fim: createRegraEscalaDto.data_fim ? new Date(createRegraEscalaDto.data_fim) : undefined,
    });
    return this.regraEscalaRepository.save(regra);
  }

  async findAll(): Promise<RegraEscala[]> {
    return this.regraEscalaRepository.find({
      relations: ['colaborador', 'turno'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<RegraEscala> {
    const regra = await this.regraEscalaRepository.findOne({
      where: { id },
      relations: ['colaborador', 'turno'],
    });
    if (!regra) {
      throw new NotFoundException(`Regra de escala com ID ${id} não encontrada`);
    }
    return regra;
  }

  async update(id: string, updateRegraEscalaDto: UpdateRegraEscalaDto): Promise<RegraEscala> {
    const regra = await this.findOne(id);
    Object.assign(regra, {
      ...updateRegraEscalaDto,
      data_inicio: updateRegraEscalaDto.data_inicio ? new Date(updateRegraEscalaDto.data_inicio) : regra.data_inicio,
      data_fim: updateRegraEscalaDto.data_fim ? new Date(updateRegraEscalaDto.data_fim) : regra.data_fim,
    });
    return this.regraEscalaRepository.save(regra);
  }

  async remove(id: string): Promise<void> {
    const regra = await this.findOne(id);
    await this.regraEscalaRepository.remove(regra);
  }
}
