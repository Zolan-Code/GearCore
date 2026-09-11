import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticación.');
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = process.env.SUPABASE_JWT_SECRET;

    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET no está configurado en el backend.');
    }

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      request.user = { id: payload.sub, email: payload['email'] };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}
