import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { RepuestosController } from './repuestos.controller';
import { RepuestosService } from './repuestos.service';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [RepuestosController],
  providers: [RepuestosService],
  exports: [RepuestosService],
})
export class RepuestosModule {}
