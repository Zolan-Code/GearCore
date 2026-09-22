import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { OrdenesTrabajoModule } from './ordenes-trabajo/ordenes-trabajo.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RepuestosModule } from './repuestos/repuestos.module';
import { PerfilModule } from './perfil/perfil.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { AjustesModule } from './ajustes/ajustes.module';
import { DashboardModule } from './dashboard/dashboard.module';

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
    PerfilModule,
    CotizacionesModule,
    AjustesModule,
    DashboardModule,
  ],
})
export class AppModule {}
