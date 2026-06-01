import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterFrontendErrorDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  componentStack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  release?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
