import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ocorrencia } from './ocorrencia.entity';
import { CreateOcorrenciaDto } from './dto/create-ocorrencia.dto';
import { UpdateOcorrenciaDto } from './dto/update-ocorrencia.dto';

@Injectable()
export class OcorrenciasService {
  constructor(
    @InjectRepository(Ocorrencia)
    private ocorrenciasRepository: Repository<Ocorrencia>,
  ) {}

  create(dto: CreateOcorrenciaDto) {
    return this.ocorrenciasRepository.save(dto);
  }

  findAll() {
    return this.ocorrenciasRepository.find({ order: { data_ocorrencia: 'DESC' } });
  }

  findByPessoa(pessoa_id: string) {
    return this.ocorrenciasRepository.find({ where: { pessoa_id }, order: { data_ocorrencia: 'DESC' } });
  }

  findOne(id: string) {
    return this.ocorrenciasRepository.findOne({ where: { id } });
  }

  update(id: string, dto: UpdateOcorrenciaDto) {
    return this.ocorrenciasRepository.update(id, dto);
  }

  remove(id: string) {
    return this.ocorrenciasRepository.delete(id);
  }
}
