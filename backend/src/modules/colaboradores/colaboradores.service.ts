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

export type ColaboradorResponse = Omit<Colaborador, 'dias_semanais'> & {
  dias_semanais: number[];
};

type ColaboradorPersistInput = Omit<Partial<Colaborador>, 'dias_semanais'> & {
  dias_semanais?: string | null;
};

@Injectable()
export class ColaboradoresService {
  constructor(
    @InjectRepository(Colaborador)
    private colaboradorRepository: Repository<Colaborador>,
  ) {}

  async create(createColaboradorDto: CreateColaboradorDto): Promise<ColaboradorResponse> {
    const dto = this.toPersistInput(createColaboradorDto);
    const colaborador = this.colaboradorRepository.create(dto as Partial<Colaborador>);
    return this.toResponse(await this.colaboradorRepository.save(colaborador));
  }

  async findAll(): Promise<ColaboradorResponse[]> {
    const colaboradores = await this.colaboradorRepository.find({
      order: { created_at: 'DESC' },
    });

    return colaboradores.map((colaborador) => this.toResponse(colaborador));
  }

  async findOne(id: string): Promise<ColaboradorResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async update(id: string, updateColaboradorDto: UpdateColaboradorDto): Promise<ColaboradorResponse> {
    const colaborador = await this.findEntity(id);
    Object.assign(colaborador, this.toPersistInput(updateColaboradorDto));
    return this.toResponse(await this.colaboradorRepository.save(colaborador));
  }

  async remove(id: string): Promise<void> {
    const colaborador = await this.findEntity(id);
    await this.colaboradorRepository.remove(colaborador);
  }

  private async findEntity(id: string): Promise<Colaborador> {
    const colaborador = await this.colaboradorRepository.findOne({ where: { id } });
    if (!colaborador) {
      throw new NotFoundException(`Colaborador com ID ${id} não encontrado`);
    }

    return colaborador;
  }

  private toPersistInput(dto: CreateColaboradorDto | UpdateColaboradorDto): ColaboradorPersistInput {
    const { dias_semanais, ...rest } = dto;
    return {
      ...rest,
      ...(Array.isArray(dias_semanais) ? { dias_semanais: JSON.stringify(dias_semanais) } : {}),
    };
  }

  private toResponse(colaborador: Colaborador): ColaboradorResponse {
    const { dias_semanais, ...rest } = colaborador;
    return {
      ...rest,
      dias_semanais: this.parseDiasSemanais(dias_semanais),
    };
  }

  private parseDiasSemanais(value: string | null): number[] {
    if (!value) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((dia) => Number(dia)).filter((dia) => Number.isFinite(dia))
        : [];
    } catch {
      return [];
    }
  }
}
