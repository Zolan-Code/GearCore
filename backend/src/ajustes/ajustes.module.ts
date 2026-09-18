import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AjustesController } from './ajustes.controller';
import { AjustesService } from './ajustes.service';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [AjustesController],
  providers: [AjustesService],
  exports: [AjustesService],
})
export class AjustesModule {}
