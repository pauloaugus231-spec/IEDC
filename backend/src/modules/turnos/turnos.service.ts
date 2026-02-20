import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turno } from '../../entities/turno.entity';

export interface CreateTurnoDto {
  nome: string;
  hora_inicio: string;
  hora_fim: string;
}

export interface UpdateTurnoDto {
  nome?: string;
  hora_inicio?: string;
  hora_fim?: string;
}

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno)
    private turnoRepository: Repository<Turno>,
  ) {}

  async create(createTurnoDto: CreateTurnoDto): Promise<Turno> {
    const turno = this.turnoRepository.create(createTurnoDto);
    return this.turnoRepository.save(turno);
  }

  async findAll(): Promise<Turno[]> {
    return this.turnoRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({ where: { id } });
    if (!turno) {
      throw new NotFoundException(`Turno com ID ${id} não encontrado`);
    }
    return turno;
  }

  async update(id: string, updateTurnoDto: UpdateTurnoDto): Promise<Turno> {
    const turno = await this.findOne(id);
    Object.assign(turno, updateTurnoDto);
    return this.turnoRepository.save(turno);
  }

  async remove(id: string): Promise<void> {
    const turno = await this.findOne(id);
    await this.turnoRepository.remove(turno);
  }
}
