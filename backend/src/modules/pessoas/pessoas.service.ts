import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pessoa, StatusCadastro } from '../../entities/pessoa.entity';
import { StatusEstadia } from '../../entities/estadia.entity';
import { Bloqueio } from '../../entities/bloqueio.entity';
import { Ocorrencia, TipoOcorrencia, SeveridadeOcorrencia } from '../../entities/ocorrencia.entity';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { PaginatedResult, createPaginatedResult } from '../../common/dto/pagination.dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { assertImageUpload, resolveImageExtension } from '../../common/upload/file-validation';
import { AuthUser } from '../../auth/auth.types';

@Injectable()
export class PessoasService {
  constructor(
    @InjectRepository(Pessoa)
    private pessoaRepository: Repository<Pessoa>,
    @InjectRepository(Bloqueio)
    private bloqueioRepository: Repository<Bloqueio>,
    @InjectRepository(Ocorrencia)
    private ocorrenciaRepository: Repository<Ocorrencia>,
  ) {}

  async create(createPessoaDto: CreatePessoaDto): Promise<Pessoa> {
    const pessoa = this.pessoaRepository.create(createPessoaDto);
    return this.pessoaRepository.save(pessoa);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: StatusCadastro,
    onlyLiberados = false,
  ): Promise<PaginatedResult<Pessoa>> {
    // ✅ OTIMIZADO: Query Builder com paginação e índices
    const queryBuilder = this.pessoaRepository
      .createQueryBuilder('pessoa')
      .leftJoinAndSelect('pessoa.estadias', 'estadia', 'estadia.status = :estadiaStatus', { estadiaStatus: StatusEstadia.ATIVA })
      .leftJoinAndSelect('estadia.cama', 'cama')
      .addSelect("COALESCE(NULLIF(BTRIM(pessoa.nome_social), ''), pessoa.nome)", 'nome_exibicao');

    // Usar índice idx_pessoas_ativo_status
    queryBuilder.where('pessoa.ativo = true');

    if (search) {
      // ✅ OTIMIZADO: ILIKE para busca case-insensitive (usa índice idx_pessoas_nome_trgm)
      queryBuilder.andWhere(
        '(pessoa.nome ILIKE :search OR pessoa.nome_social ILIKE :search OR pessoa.cpf ILIKE :search OR pessoa.nis ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('pessoa.status_cadastro = :pessoaStatus', { pessoaStatus: status });
    }

    if (onlyLiberados) {
      queryBuilder.andWhere('pessoa.liberacao_antecipada = true');
    }

    // ✅ OTIMIZADO: COUNT separado (mais rápido)
    const total = await queryBuilder.getCount();

    // ✅ OTIMIZADO: Buscar apenas a página atual
    const data = await queryBuilder
      .orderBy('nome_exibicao', 'ASC')
      .addOrderBy('pessoa.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return createPaginatedResult(data, total, page, limit);
  }

  async getResumo(): Promise<{
    total: number;
    hospedados: number;
    aprovados: number;
    liberados: number;
  }> {
    const [total, hospedados, aprovados, liberados] = await Promise.all([
      this.pessoaRepository.count({ where: { ativo: true } }),
      this.pessoaRepository.count({ where: { ativo: true, status_cadastro: StatusCadastro.ATIVA } }),
      this.pessoaRepository.count({ where: { ativo: true, status_cadastro: StatusCadastro.APROVADO } }),
      this.pessoaRepository.count({ where: { ativo: true, liberacao_antecipada: true } }),
    ]);

    return {
      total,
      hospedados,
      aprovados,
      liberados,
    };
  }

  async findOne(id: string): Promise<Pessoa> {
    const pessoa = await this.pessoaRepository.findOne({
      where: { id, ativo: true },
      relations: ['estadias', 'estadias.cama'],
    });

    if (!pessoa) {
      throw new NotFoundException('Pessoa não encontrada');
    }

    return pessoa;
  }

  async findByCpf(cpf: string): Promise<Pessoa | null> {
    return this.pessoaRepository.findOne({
      where: { cpf, ativo: true },
      relations: ['estadias'],
    });
  }

  async update(id: string, updatePessoaDto: UpdatePessoaDto): Promise<Pessoa> {
    const pessoa = await this.findOne(id);

    // Remover campos que não devem ser atualizados diretamente
    const dadosPermitidos: Record<string, unknown> = { ...updatePessoaDto };
    delete dadosPermitidos.estadias;
    delete dadosPermitidos.bloqueios;
    delete dadosPermitidos.created_at;
    delete dadosPermitidos.updated_at;
    delete dadosPermitidos.id;

    Object.assign(pessoa, dadosPermitidos);

    return this.pessoaRepository.save(pessoa);
  }

  async remove(id: string): Promise<void> {
    const pessoa = await this.findOne(id);

    // Soft delete
    pessoa.ativo = false;
    await this.pessoaRepository.save(pessoa);
  }

  async search(query?: string): Promise<Pessoa[]> {
    const qb = this.pessoaRepository
      .createQueryBuilder('pessoa')
      .leftJoinAndSelect('pessoa.estadias', 'estadia', 'estadia.status = :status', { status: StatusEstadia.ATIVA })
      .leftJoinAndSelect('estadia.cama', 'cama')
      .addSelect("COALESCE(NULLIF(BTRIM(pessoa.nome_social), ''), pessoa.nome)", 'nome_exibicao')
      .where('pessoa.ativo = true');

    if (query && query.trim()) {
      qb.andWhere(
        '(pessoa.nome ILIKE :query OR pessoa.nome_social ILIKE :query OR pessoa.cpf ILIKE :query OR pessoa.nis ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    qb.take(20).orderBy('nome_exibicao', 'ASC');
    return qb.getMany();
  }

  async liberarAntecipadamente(pessoa_id: string, actor?: AuthUser, motivo?: string): Promise<Pessoa> {
    const pessoa = await this.pessoaRepository.findOne({ where: { id: pessoa_id } });
    if (!pessoa) {
      throw new NotFoundException(`Pessoa com ID ${pessoa_id} não encontrada.`);
    }

    const responsavel = actor?.displayName || actor?.login || 'sistema';

    // Liberar pessoa
    pessoa.liberacao_antecipada = true;
    pessoa.data_liberacao_antecipada = new Date();
    pessoa.status_cadastro = StatusCadastro.APROVADO;

    // Liberar bloqueios ativos
    const bloqueiosAtivos = await this.bloqueioRepository.find({
      where: { pessoa_id, ativo: true }
    });

    for (const bloqueio of bloqueiosAtivos) {
      bloqueio.ativo = false;
      bloqueio.liberacao_antecipada = true;
      bloqueio.data_liberacao_antecipada = new Date();
      bloqueio.liberado_por = responsavel;
      await this.bloqueioRepository.save(bloqueio);
    }

    // Registrar ocorrência no histórico
    const descricaoBase = `Liberação antecipada autorizada por ${responsavel}. ${bloqueiosAtivos.length} bloqueio(s) removido(s).`;
    const descricao = motivo ? `${descricaoBase} Motivo: ${motivo}` : descricaoBase;

    const ocorrencia = this.ocorrenciaRepository.create({
      pessoa_id,
      tipo: TipoOcorrencia.OUTROS,
      severidade: SeveridadeOcorrencia.BAIXA,
      titulo: 'Liberação Antecipada',
      descricao,
      data_ocorrencia: new Date(),
      criado_por: responsavel,
    });

    await this.ocorrenciaRepository.save(ocorrencia);

    return this.pessoaRepository.save(pessoa);
  }

  async uploadFoto(pessoaId: string, file: Express.Multer.File): Promise<Pessoa> {
    const pessoa = await this.pessoaRepository.findOne({ where: { id: pessoaId } });
    if (!pessoa) {
      throw new NotFoundException('Pessoa não encontrada');
    }

    assertImageUpload(file);

    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), 'uploads', 'fotos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const fileExtension = resolveImageExtension(file);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Salvar arquivo
    fs.writeFileSync(filePath, file.buffer);

    // Remover foto anterior se existir
    if (pessoa.foto_url) {
      const oldFilePath = path.join(process.cwd(), pessoa.foto_url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Atualizar pessoa com nova foto
    pessoa.foto_url = '/' + path.join('uploads', 'fotos', fileName).replace(/\\/g, '/');
    return await this.pessoaRepository.save(pessoa);
  }

  async deleteFoto(pessoaId: string): Promise<Pessoa> {
    const pessoa = await this.pessoaRepository.findOne({ where: { id: pessoaId } });
    if (!pessoa) {
      throw new NotFoundException('Pessoa não encontrada');
    }

    if (pessoa.foto_url) {
      const filePath = path.join(process.cwd(), pessoa.foto_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      pessoa.foto_url = undefined;
      return await this.pessoaRepository.save(pessoa);
    }

    return pessoa;
  }

  async findAtivos(): Promise<Pessoa[]> {
    return this.pessoaRepository
      .createQueryBuilder('pessoa')
      .innerJoinAndSelect('pessoa.estadias', 'estadia', 'estadia.status = :status', { status: StatusEstadia.ATIVA })
      .leftJoinAndSelect('estadia.cama', 'cama')
      .where('pessoa.ativo = true')
      .getMany();
  }

  async updatePresenca(id: string, presente: boolean): Promise<Pessoa> {
    const pessoa = await this.findOne(id);
    if (!pessoa) {
      throw new NotFoundException('Pessoa não encontrada');
    }

    if (!('presente' in pessoa)) {
      throw new BadRequestException('Campo "presente" não existe na entidade Pessoa. Execute a migration necessária.');
    }

    pessoa.presente = presente;
    return this.pessoaRepository.save(pessoa);
  }
}
