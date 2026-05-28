import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UsuarioRole } from '../../entities/usuario.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  login!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  displayName?: string;

  @IsEnum(UsuarioRole)
  role!: UsuarioRole;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  temporaryPassword!: string;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
