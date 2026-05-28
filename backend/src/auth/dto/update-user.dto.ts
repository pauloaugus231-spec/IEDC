import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UsuarioRole } from '../../entities/usuario.entity';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  displayName?: string;

  @IsEnum(UsuarioRole)
  @IsOptional()
  role?: UsuarioRole;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
