import { IsString, IsOptional, IsDateString, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoVaga } from '../../../entities/pessoa.entity';

export class CreatePessoaDto {
  @ApiProperty({ description: 'Nome completo da pessoa' })
  @IsString()
  @Length(2, 255)
  nome!: string;

  @ApiProperty({ description: 'Nome social da pessoa', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  nome_social?: string;

  @ApiProperty({ description: 'CPF da pessoa', required: false })
  @IsOptional()
  @IsString()
  @Length(11, 14)
  cpf?: string;

  @ApiProperty({ description: 'RG da pessoa', required: false })
  @IsOptional()
  @IsString()
  @Length(5, 20)
  rg?: string;

  @ApiProperty({ description: 'NIS da pessoa', required: false })
  @IsOptional()
  @IsString()
  @Length(11, 11)
  nis?: string;

  @ApiProperty({ description: 'Data de nascimento', required: false })
  @IsOptional()
  @IsDateString()
  data_nascimento?: Date;

  @ApiProperty({ description: 'Naturalidade', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  naturalidade?: string;

  @ApiProperty({ description: 'Telefone de contato', required: false })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({ description: 'Sexo da pessoa', required: false })
  @IsOptional()
  @IsString()
  sexo?: string;

  @ApiProperty({ description: 'Gênero da pessoa', required: false })
  @IsOptional()
  @IsString()
  genero?: string;

  @ApiProperty({ description: 'Cor da pessoa', required: false })
  @IsOptional()
  @IsString()
  cor?: string;

  @ApiProperty({ description: 'Raça da pessoa', required: false })
  @IsOptional()
  @IsString()
  raca?: string;

  @ApiProperty({ description: 'Sexualidade da pessoa', required: false })
  @IsOptional()
  @IsString()
  sexualidade?: string;

  @ApiProperty({ description: 'Endereço completo', required: false })
  @IsOptional()
  @IsString()
  @Length(5, 255)
  endereco?: string;

  @ApiProperty({ description: 'Cidade', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  cidade?: string;

  @ApiProperty({ description: 'UF (estado)', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @ApiProperty({ description: 'CEP', required: false })
  @IsOptional()
  @IsString()
  @Length(8, 10)
  cep?: string;

  @ApiProperty({ description: 'Nome da mãe', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nome_mae?: string;

  @ApiProperty({ description: 'Nome do pai', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nome_pai?: string;

  @ApiProperty({ description: 'Contato de emergência', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  contato_emergencia?: string;

  @ApiProperty({ description: 'Telefone de emergência', required: false })
  @IsOptional()
  @IsString()
  telefone_emergencia?: string;

  @ApiProperty({ description: 'Tipo de vaga solicitada' })
  @IsEnum(TipoVaga)
  tipo_vaga!: TipoVaga;

  @ApiProperty({ description: 'Observações gerais', required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ description: 'Alergias conhecidas', required: false })
  @IsOptional()
  @IsString()
  alergias?: string;

  @ApiProperty({ description: 'Condições crônicas de saúde', required: false })
  @IsOptional()
  @IsString()
  condicoes_cronicas?: string;

  @ApiProperty({ description: 'Medicamentos de uso contínuo', required: false })
  @IsOptional()
  @IsString()
  medicamentos_uso_continuo?: string;

  @ApiProperty({ description: 'Pessoa LGBT', required: false })
  @IsOptional()
  lgbt?: boolean;
}
