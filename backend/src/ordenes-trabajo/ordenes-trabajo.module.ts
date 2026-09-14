import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { OrdenesTrabajoController } from './ordenes-trabajo.controller';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { NotificadorWhatsAppService } from './notificadores/notificador-whatsapp.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [OrdenesTrabajoController],
  providers: [OrdenesTrabajoService, NotificadorWhatsAppService],
  exports: [OrdenesTrabajoService],
})
export class OrdenesTrabajoModule {}
