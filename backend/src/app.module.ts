import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { OrdenesTrabajoModule } from './ordenes-trabajo/ordenes-trabajo.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RepuestosModule } from './repuestos/repuestos.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClientesModule,
    VehiculosModule,
    OrdenesTrabajoModule,
    AuditoriaModule,
    UsuariosModule,
    RepuestosModule,
  ],
})
export class AppModule {}
