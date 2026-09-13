import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';

@Module({
  imports: [PrismaModule, AuthModule, ClientesModule, VehiculosModule],
})
export class AppModule {}
