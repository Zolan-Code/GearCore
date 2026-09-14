import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [SupabaseAuthGuard, RolesGuard, AuthService],
  exports: [SupabaseAuthGuard, RolesGuard, AuthService],
})
export class AuthModule {}

