import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao } from '../../entities/solicitacao.entity';

@Injectable()
export class SolicitacoesService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
  ) {}

  async findAll(): Promise<Solicitacao[]> {
    return this.solicitacaoRepository.find({
      relations: ['pessoa'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Solicitacao | null> {
    return this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['pessoa'],
    });
  }

  async create(solicitacaoData: Partial<Solicitacao>): Promise<Solicitacao> {
    const solicitacao = this.solicitacaoRepository.create(solicitacaoData);
    return this.solicitacaoRepository.save(solicitacao);
  }

  async update(id: string, solicitacaoData: Partial<Solicitacao>): Promise<Solicitacao | null> {
    await this.solicitacaoRepository.update(id, solicitacaoData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.solicitacaoRepository.delete(id);
  }
}
