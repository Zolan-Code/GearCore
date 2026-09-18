import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

export interface ItemPdfData {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tipo: string;
}

export interface CotizacionPdfData {
  numero: number;
  creadoEn: Date | string;
  validezDias: number;
  fechaVencimiento?: Date | string | null;
  observaciones?: string | null;
  ordenTrabajo: {
    id: string;
    fallaReportada: string;
    vehiculo: {
      patente: string;
      marca: string;
      modelo: string;
      anio?: number | null;
      kilometraje?: number | null;
      cliente: {
        nombre: string;
        rut: string;
        telefono?: string | null;
        email?: string | null;
      };
    };
  };
  subtotalRepuestos: number;
  subtotalManoObra: number;
  subtotalOtros: number;
  descuento: number;
  subtotalNeto: number;
  aplicaIva: boolean;
  iva: number;
  total: number;
  items: ItemPdfData[];
}

@Injectable()
export class CotizacionesPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generarPdf(data: CotizacionPdfData): Promise<Buffer> {
    let configTaller: any = null;
    try {
      configTaller = await this.prisma.configuracionTaller.findUnique({
        where: { id: 'taller-config' },
      });
    } catch (err) {
      console.error('Error al leer configuracion en PDF:', err);
    }
    // console.log('DEBUG_PDF_CONFIG:', configTaller?.nombreComercial);

    const nombreTaller = configTaller?.nombreComercial || 'GEARCORE';
    const rutTaller = configTaller?.rut ? `RUT: ${configTaller.rut}` : '';
    const dirTaller = configTaller?.direccion || '';
    const telTaller = configTaller?.telefono ? `Tel: ${configTaller.telefono}` : '';
    const emailTaller = configTaller?.email ? `Email: ${configTaller.email}` : '';
    const ivaPorc = configTaller?.ivaPorDefecto ?? 19;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const formatoMoneda = (val: number) => {
          return `$${Math.round(val || 0).toLocaleString('es-CL')} CLP`;
        };

        const fechaFormateada = new Date(data.creadoEn).toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // ================= ENCABEZADO =================
        doc.fillColor('#1e293b').fontSize(18).font('Helvetica-Bold').text(nombreTaller, 40, 40);
        const subtitulo = [rutTaller, dirTaller, telTaller, emailTaller].filter(Boolean).join(' • ');
        doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(subtitulo || 'Servicio Mecánico y Mantención Automotriz', 40, 62, { width: 330 });

        // Caja de Folio y Fecha (Derecha)
        doc.rect(380, 35, 190, 55).lineWidth(1).strokeColor('#cbd5e1').fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`COTIZACIÓN N° ${String(data.numero).padStart(5, '0')}`, 390, 45);
        doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Fecha: ${fechaFormateada}`, 390, 60);
        doc.text(`Válida por: ${data.validezDias} días`, 390, 72);

        doc.moveDown(2);

        // ================= DATOS CLIENTE Y VEHÍCULO =================
        const yInfo = 105;
        doc.rect(40, yInfo, 255, 95).strokeColor('#e2e8f0').fillAndStroke('#ffffff', '#e2e8f0');
        doc.rect(315, yInfo, 255, 95).strokeColor('#e2e8f0').fillAndStroke('#ffffff', '#e2e8f0');

        // Cliente
        doc.fillColor('#0284c7').fontSize(9).font('Helvetica-Bold').text('DATOS DEL CLIENTE', 50, yInfo + 10);
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9).text('Nombre: ', 50, yInfo + 25);
        doc.font('Helvetica').text(data.ordenTrabajo.vehiculo.cliente.nombre, 95, yInfo + 25, { width: 190 });
        doc.font('Helvetica-Bold').text('RUT: ', 50, yInfo + 40);
        doc.font('Helvetica').text(data.ordenTrabajo.vehiculo.cliente.rut, 95, yInfo + 40);
        doc.font('Helvetica-Bold').text('Teléfono: ', 50, yInfo + 55);
        doc.font('Helvetica').text(data.ordenTrabajo.vehiculo.cliente.telefono || 'No registrado', 95, yInfo + 55);
        doc.font('Helvetica-Bold').text('Email: ', 50, yInfo + 70);
        doc.font('Helvetica').text(data.ordenTrabajo.vehiculo.cliente.email || 'No registrado', 95, yInfo + 70, { width: 190 });

        // Vehículo & OT
        doc.fillColor('#0284c7').fontSize(9).font('Helvetica-Bold').text('DATOS DEL VEHÍCULO Y SERVICIO', 325, yInfo + 10);
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9).text('Vehículo: ', 325, yInfo + 25);
        doc.font('Helvetica').text(`${data.ordenTrabajo.vehiculo.marca} ${data.ordenTrabajo.vehiculo.modelo} (${data.ordenTrabajo.vehiculo.anio || 'S/A'})`, 375, yInfo + 25);
        doc.font('Helvetica-Bold').text('Patente: ', 325, yInfo + 40);
        doc.font('Helvetica').text(data.ordenTrabajo.vehiculo.patente, 375, yInfo + 40);
        doc.font('Helvetica-Bold').text('Kilometraje: ', 325, yInfo + 55);
        doc.font('Helvetica').text(data.ordenTrabajo.vehiculo.kilometraje ? `${data.ordenTrabajo.vehiculo.kilometraje.toLocaleString('es-CL')} km` : 'No registrado', 390, yInfo + 55);
        doc.font('Helvetica-Bold').text('OT Ref: ', 325, yInfo + 70);
        doc.font('Helvetica').text(`#${data.ordenTrabajo.id.slice(0, 8).toUpperCase()}`, 375, yInfo + 70);

        // ================= TABLA DE ÍTEMS =================
        let yTable = 215;
        doc.rect(40, yTable, 530, 22).fillColor('#0f172a').fill();
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('TIPO', 50, yTable + 6);
        doc.text('DESCRIPCIÓN', 130, yTable + 6);
        doc.text('CANT.', 360, yTable + 6, { width: 40, align: 'right' });
        doc.text('P. UNITARIO', 410, yTable + 6, { width: 70, align: 'right' });
        doc.text('SUBTOTAL', 490, yTable + 6, { width: 70, align: 'right' });

        yTable += 22;
        doc.font('Helvetica').fontSize(8.5);

        data.items.forEach((item, index) => {
          const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
          doc.rect(40, yTable, 530, 20).fillColor(bgColor).fill();

          doc.fillColor('#334155');
          const tipoLabel = item.tipo === 'REPUESTO' ? 'Repuesto' : item.tipo === 'MANO_DE_OBRA' ? 'Mano de Obra' : 'Servicio';
          doc.text(tipoLabel, 50, yTable + 5);
          doc.text(item.descripcion, 130, yTable + 5, { width: 220, ellipsis: true });
          doc.text(String(item.cantidad), 360, yTable + 5, { width: 40, align: 'right' });
          doc.text(formatoMoneda(item.precioUnitario), 410, yTable + 5, { width: 70, align: 'right' });
          doc.text(formatoMoneda(item.subtotal), 490, yTable + 5, { width: 70, align: 'right' });

          yTable += 20;

          // Salto de página si la tabla es muy larga
          if (yTable > 650) {
            doc.addPage();
            yTable = 50;
          }
        });

        // ================= DESGLOSE DE TOTALES =================
        yTable += 15;
        if (yTable > 640) {
          doc.addPage();
          yTable = 50;
        }

        const yTotales = yTable;
        // Observaciones a la izquierda
        if (data.observaciones) {
          doc.rect(40, yTotales, 300, 95).strokeColor('#cbd5e1').fillAndStroke('#ffffff', '#cbd5e1');
          doc.fillColor('#0284c7').fontSize(9).font('Helvetica-Bold').text('OBSERVACIONES / CONDICIONES', 50, yTotales + 10);
          doc.fillColor('#475569').fontSize(8).font('Helvetica').text(data.observaciones, 50, yTotales + 25, { width: 280 });
        }

        // Totales a la derecha
        doc.rect(360, yTotales, 210, 95).strokeColor('#cbd5e1').fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#334155').fontSize(8.5).font('Helvetica');

        let offset = yTotales + 10;
        doc.text('Subtotal Repuestos:', 370, offset);
        doc.text(formatoMoneda(data.subtotalRepuestos), 470, offset, { width: 90, align: 'right' });
        offset += 15;

        doc.text('Subtotal Mano de Obra:', 370, offset);
        doc.text(formatoMoneda(data.subtotalManoObra), 470, offset, { width: 90, align: 'right' });
        offset += 15;

        if (data.descuento > 0) {
          doc.text('Descuento:', 370, offset);
          doc.fillColor('#dc2626').text(`-${formatoMoneda(data.descuento)}`, 470, offset, { width: 90, align: 'right' });
          doc.fillColor('#334155');
          offset += 15;
        }

        if (data.aplicaIva) {
          doc.text(`IVA (${ivaPorc}%):`, 370, offset);
          doc.text(formatoMoneda(data.iva), 470, offset, { width: 90, align: 'right' });
          offset += 15;
        }

        doc.moveTo(370, offset).lineTo(560, offset).lineWidth(1).strokeColor('#cbd5e1').stroke();
        offset += 6;

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('TOTAL A PAGAR:', 370, offset);
        doc.text(formatoMoneda(data.total), 470, offset, { width: 90, align: 'right' });

        // ================= PIE DE PÁGINA Y FIRMAS =================
        const yFirmas = Math.max(yTotales + 120, 680);
        doc.moveTo(70, yFirmas + 40).lineTo(230, yFirmas + 40).lineWidth(0.8).strokeColor('#94a3b8').stroke();
        doc.moveTo(370, yFirmas + 40).lineTo(530, yFirmas + 40).lineWidth(0.8).strokeColor('#94a3b8').stroke();

        doc.fillColor('#64748b').fontSize(8).font('Helvetica');
        doc.text(`Firma y Timbre ${nombreTaller}`, 70, yFirmas + 45, { width: 160, align: 'center' });
        doc.text('Aprobación y Firma Cliente', 370, yFirmas + 45, { width: 160, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
