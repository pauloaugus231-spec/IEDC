import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  newPassword!: string;
}
