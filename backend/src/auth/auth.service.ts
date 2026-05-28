import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { Usuario, UsuarioRole, UsuarioServiceScope } from '../entities/usuario.entity';
import { AuthUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const scrypt = promisify(scryptCallback);

type InitialUser = Pick<
  Usuario,
  'login' | 'name' | 'displayName' | 'role' | 'roleLabel' | 'service' | 'serviceLabel' | 'homePath'
>;

export interface ManagedUser {
  id: string;
  login: string;
  name: string;
  displayName: string;
  role: UsuarioRole;
  roleLabel: string;
  service: UsuarioServiceScope;
  serviceLabel: string;
  homePath: string;
  ativo: boolean;
  mustChangePassword: boolean;
  passwordUpdatedAt: Date | null;
  lastLoginAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

type RoleProfile = Pick<Usuario, 'roleLabel' | 'service' | 'serviceLabel' | 'homePath'>;

const INITIAL_USERS: InitialUser[] = [
  {
    login: 'suporte',
    name: 'Suporte',
    displayName: 'Suporte',
    role: UsuarioRole.SUPORTE,
    roleLabel: 'Suporte',
    service: UsuarioServiceScope.SUPORTE,
    serviceLabel: 'Suporte institucional',
    homePath: '/suporte/usuarios',
  },
];

const ROLE_PROFILES: Record<UsuarioRole, RoleProfile> = {
  [UsuarioRole.GESTORA]: {
    roleLabel: 'Gestão',
    service: UsuarioServiceScope.GESTAO,
    serviceLabel: 'Gestão institucional',
    homePath: '/gestao',
  },
  [UsuarioRole.SUPORTE]: {
    roleLabel: 'Suporte',
    service: UsuarioServiceScope.SUPORTE,
    serviceLabel: 'Suporte institucional',
    homePath: '/suporte/usuarios',
  },
  [UsuarioRole.COORDENADOR_ALBERGUE]: {
    roleLabel: 'Coordenação',
    service: UsuarioServiceScope.ALBERGUE,
    serviceLabel: 'Albergue Noturno',
    homePath: '/albergue',
  },
  [UsuarioRole.COORDENADOR_CRECHE]: {
    roleLabel: 'Coordenação',
    service: UsuarioServiceScope.CRECHE,
    serviceLabel: 'E.E.I. Casa do Pequenino',
    homePath: '/creche',
  },
  [UsuarioRole.EQUIPE_TECNICA]: {
    roleLabel: 'Equipe técnica',
    service: UsuarioServiceScope.INSTITUCIONAL,
    serviceLabel: 'Atendimento institucional',
    homePath: '/gestao',
  },
  [UsuarioRole.EDUCADOR_ALBERGUE]: {
    roleLabel: 'Educador',
    service: UsuarioServiceScope.ALBERGUE,
    serviceLabel: 'Albergue Noturno',
    homePath: '/albergue',
  },
  [UsuarioRole.EDUCADOR_CRECHE]: {
    roleLabel: 'Educador',
    service: UsuarioServiceScope.CRECHE,
    serviceLabel: 'E.E.I. Casa do Pequenino',
    homePath: '/creche',
  },
  [UsuarioRole.FINANCEIRO]: {
    roleLabel: 'Financeiro',
    service: UsuarioServiceScope.FINANCEIRO,
    serviceLabel: 'Secretaria e Financeiro',
    homePath: '/lojas/secretaria',
  },
  [UsuarioRole.LOJA_BAZAR]: {
    roleLabel: 'Loja',
    service: UsuarioServiceScope.BAZAR,
    serviceLabel: 'Bazar',
    homePath: '/lojas/bazar',
  },
  [UsuarioRole.LOJA_BRECHO]: {
    roleLabel: 'Loja',
    service: UsuarioServiceScope.BRECHO,
    serviceLabel: 'Brechó',
    homePath: '/lojas/brecho',
  },
  [UsuarioRole.LOJA_FEIRAO]: {
    roleLabel: 'Loja',
    service: UsuarioServiceScope.FEIRAO,
    serviceLabel: 'Feirão',
    homePath: '/lojas/feirao',
  },
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedInitialUsers();
  }

  async listProfiles(): Promise<AuthUser[]> {
    const usuarios = await this.usuariosRepository.find({
      where: { ativo: true },
      order: { service: 'ASC', login: 'ASC' },
    });

    return usuarios.map((usuario) => this.toAuthUser(usuario));
  }

  async login(profileId: string, password: string) {
    const login = this.normalizeLogin(profileId);
    const usuario = await this.usuariosRepository.findOne({
      where: { login, ativo: true },
    });

    if (!usuario || !(await this.verifyPassword(password, usuario.passwordHash))) {
      throw new UnauthorizedException('Perfil ou senha inválido.');
    }

    usuario.lastLoginAt = new Date();
    await this.usuariosRepository.save(usuario);

    const user = this.toAuthUser(usuario);
    const accessToken = await this.jwtService.signAsync({
      sub: usuario.id,
      login: user.login,
      role: user.role,
      service: user.service,
    });

    return { accessToken, user };
  }

  async listUsers(): Promise<ManagedUser[]> {
    const usuarios = await this.usuariosRepository.find({
      order: { ativo: 'DESC', service: 'ASC', login: 'ASC' },
    });

    return usuarios.map((usuario) => this.toManagedUser(usuario));
  }

  async createUser(dto: CreateUserDto, actor?: AuthUser): Promise<ManagedUser> {
    const login = this.normalizeLogin(dto.login);
    this.assertValidLogin(login);
    this.assertCanManageUsers(actor);

    const existing = await this.usuariosRepository.findOne({ where: { login } });
    if (existing) {
      throw new ConflictException('Já existe um usuário com este login.');
    }

    const name = this.cleanRequiredText(dto.name, 'Nome');
    const profile = this.getRoleProfile(dto.role);
    const actorLogin = actor?.login ?? 'system';

    const usuario = this.usuariosRepository.create({
      login,
      name,
      displayName: this.cleanOptionalText(dto.displayName) || name,
      role: dto.role,
      ...profile,
      ativo: dto.ativo ?? true,
      passwordHash: await this.hashPassword(dto.temporaryPassword),
      mustChangePassword: true,
      passwordUpdatedAt: new Date(),
      lastLoginAt: null,
      createdBy: actorLogin,
      updatedBy: actorLogin,
    });

    return this.toManagedUser(await this.usuariosRepository.save(usuario));
  }

  async updateUser(id: string, dto: UpdateUserDto, actor?: AuthUser): Promise<ManagedUser> {
    const usuario = await this.findUserEntity(id);
    this.assertCanManageUsers(actor);

    if (dto.ativo === false && actor?.uuid === usuario.id) {
      throw new BadRequestException('Você não pode desativar a própria conta em uso.');
    }

    if (dto.name !== undefined) {
      usuario.name = this.cleanRequiredText(dto.name, 'Nome');
    }

    if (dto.displayName !== undefined) {
      usuario.displayName = this.cleanOptionalText(dto.displayName) || usuario.name;
    }

    if (dto.role !== undefined) {
      usuario.role = dto.role;
      Object.assign(usuario, this.getRoleProfile(dto.role));
    }

    if (dto.ativo !== undefined) {
      usuario.ativo = dto.ativo;
    }

    usuario.updatedBy = actor?.login ?? usuario.updatedBy;

    return this.toManagedUser(await this.usuariosRepository.save(usuario));
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actor?: AuthUser): Promise<ManagedUser> {
    const usuario = await this.findUserEntity(id);
    this.assertCanManageUsers(actor);

    usuario.passwordHash = await this.hashPassword(dto.temporaryPassword);
    usuario.mustChangePassword = true;
    usuario.passwordUpdatedAt = new Date();
    usuario.updatedBy = actor?.login ?? usuario.updatedBy;

    return this.toManagedUser(await this.usuariosRepository.save(usuario));
  }

  async changeOwnPassword(userId: string, dto: ChangePasswordDto): Promise<AuthUser> {
    const usuario = await this.findUserEntity(userId);

    if (!(await this.verifyPassword(dto.currentPassword, usuario.passwordHash))) {
      throw new UnauthorizedException('Senha atual inválida.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha precisa ser diferente da senha atual.');
    }

    usuario.passwordHash = await this.hashPassword(dto.newPassword);
    usuario.mustChangePassword = false;
    usuario.passwordUpdatedAt = new Date();
    usuario.updatedBy = usuario.login;

    return this.toAuthUser(await this.usuariosRepository.save(usuario));
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id, ativo: true },
    });

    return usuario ? this.toAuthUser(usuario) : null;
  }

  private async seedInitialUsers() {
    const existingUsers = await this.usuariosRepository.find({ select: { login: true } });
    const existingLogins = new Set(existingUsers.map((usuario) => usuario.login));
    const missingUsers = INITIAL_USERS.filter((usuario) => !existingLogins.has(usuario.login));

    if (!missingUsers.length) {
      return;
    }

    const defaultPassword = process.env.IEDC_DEFAULT_PASSWORD;

    if (!defaultPassword) {
      throw new Error('IEDC_DEFAULT_PASSWORD precisa ser definido para criar o usuário inicial de suporte.');
    }

    const passwordHash = await this.hashPassword(defaultPassword);
    const now = new Date();

    await this.usuariosRepository.save(
      missingUsers.map((usuario) => ({
        ...usuario,
        ativo: true,
        passwordHash,
        mustChangePassword: true,
        passwordUpdatedAt: now,
        lastLoginAt: null,
        createdBy: 'system',
        updatedBy: 'system',
      })),
    );

    console.warn('Usuário inicial de suporte criado. Troque a senha antes da implantação real.');
  }

  private async findUserEntity(id: string): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return usuario;
  }

  private getRoleProfile(role: UsuarioRole): RoleProfile {
    return ROLE_PROFILES[role];
  }

  private assertCanManageUsers(actor: AuthUser | undefined) {
    if (!actor || actor.role === UsuarioRole.SUPORTE) {
      return;
    }

    throw new ForbiddenException('Somente o suporte pode administrar usuários.');
  }

  private normalizeLogin(login: string): string {
    return login.trim().toLowerCase();
  }

  private assertValidLogin(login: string) {
    if (!login) {
      throw new BadRequestException('Login é obrigatório.');
    }

    if (!/^[a-z0-9._-]+$/.test(login)) {
      throw new BadRequestException('Use no login apenas letras, números, ponto, hífen ou sublinhado.');
    }
  }

  private cleanRequiredText(value: string, label: string): string {
    const cleaned = value.trim();

    if (!cleaned) {
      throw new BadRequestException(`${label} é obrigatório.`);
    }

    return cleaned;
  }

  private cleanOptionalText(value?: string): string | undefined {
    const cleaned = value?.trim();
    return cleaned || undefined;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split(':');

    if (algorithm !== 'scrypt' || !salt || !hash) {
      return false;
    }

    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const storedKey = Buffer.from(hash, 'hex');

    if (derivedKey.length !== storedKey.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, storedKey);
  }

  private toAuthUser(usuario: Usuario): AuthUser {
    return {
      id: usuario.login,
      uuid: usuario.id,
      login: usuario.login,
      name: usuario.name,
      displayName: usuario.displayName,
      role: usuario.role,
      roleLabel: usuario.roleLabel,
      service: usuario.service,
      serviceLabel: usuario.serviceLabel,
      homePath: usuario.homePath,
      mustChangePassword: usuario.mustChangePassword,
    };
  }

  private toManagedUser(usuario: Usuario): ManagedUser {
    return {
      id: usuario.id,
      login: usuario.login,
      name: usuario.name,
      displayName: usuario.displayName,
      role: usuario.role,
      roleLabel: usuario.roleLabel,
      service: usuario.service,
      serviceLabel: usuario.serviceLabel,
      homePath: usuario.homePath,
      ativo: usuario.ativo,
      mustChangePassword: usuario.mustChangePassword,
      passwordUpdatedAt: usuario.passwordUpdatedAt,
      lastLoginAt: usuario.lastLoginAt,
      createdBy: usuario.createdBy,
      updatedBy: usuario.updatedBy,
      criadoEm: usuario.criadoEm,
      atualizadoEm: usuario.atualizadoEm,
    };
  }
}
