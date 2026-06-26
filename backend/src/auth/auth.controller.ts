import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthRequest } from './auth.types';
import { Roles } from './roles.decorator';
import { UsuarioRole } from '../entities/usuario.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Throttle } from '@nestjs/throttler';

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('profiles')
  profiles() {
    return this.authService.listProfiles();
  }

  @Public()
  @Post('login')
  @Throttle({
    default: {
      limit: parsePositiveIntegerEnv('THROTTLE_AUTH_LIMIT', 5),
      ttl: parsePositiveIntegerEnv('THROTTLE_AUTH_TTL_MS', 60_000),
    },
  })
  login(@Body() dto: LoginDto, @Req() request: AuthRequest) {
    return this.authService.login(dto.login, dto.password, {
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Get('me')
  me(@Req() request: AuthRequest) {
    return request.user;
  }

  @Roles(UsuarioRole.SUPORTE)
  @Get('users')
  users() {
    return this.authService.listUsers();
  }

  @Roles(UsuarioRole.SUPORTE)
  @Post('users')
  createUser(@Body() dto: CreateUserDto, @Req() request: AuthRequest) {
    return this.authService.createUser(dto, request.user);
  }

  @Roles(UsuarioRole.SUPORTE)
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() request: AuthRequest) {
    return this.authService.updateUser(id, dto, request.user);
  }

  @Roles(UsuarioRole.SUPORTE)
  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @Req() request: AuthRequest) {
    return this.authService.resetPassword(id, dto, request.user);
  }

  @Post('me/change-password')
  changeOwnPassword(@Body() dto: ChangePasswordDto, @Req() request: AuthRequest) {
    return this.authService.changeOwnPassword(request.user!.uuid, dto);
  }
}
