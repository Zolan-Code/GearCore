import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { CalculadorMargenEstandarService } from './strategies/calculador-margen-estandar.service';
import { CotizacionesPdfService } from './services/cotizaciones-pdf.service';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [CotizacionesController],
  providers: [
    CotizacionesService,
    CalculadorMargenEstandarService,
    CotizacionesPdfService,
  ],
  exports: [CotizacionesService],
})
export class CotizacionesModule {}
