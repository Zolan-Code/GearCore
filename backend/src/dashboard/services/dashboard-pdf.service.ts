import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

export interface DashboardPdfData {
  periodo: {
    fechaInicio?: string | null;
    fechaFin?: string | null;
  };
  operaciones: {
    totalOT: number;
    otCompletadasTotal: number;
    ordenesEnProceso: number;
    porcentajeATiempo: number;
    horasInvertidasTotal: number;
    pipelineEstados: Record<string, number>;
  };
  rankingRepuestos: Array<{
    codigo: string;
    nombre: string;
    cantidad: number;
    totalGenerado: number;
  }>;
  productividadMecanicos: Array<{
    nombre: string;
    totalAsignadas: number;
    finalizadas: number;
    enCurso: number;
    horasHombre: number;
    eficiencia: number;
  }>;
  finanzas: {
    totalFacturado: number;
    totalCosto: number;
    gananciaBruta: number;
    margenPromedio: number;
    cotizacionesAprobadas: number;
  } | null;
}

@Injectable()
export class DashboardPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generarPdf(data: DashboardPdfData): Promise<Buffer> {
    let configTaller: any = null;
    try {
      configTaller = await this.prisma.configuracionTaller.findUnique({
        where: { id: 'taller-config' },
      });
    } catch (err) {
      console.error('Error al leer configuracion en reporte PDF:', err);
    }

    const nombreTaller = configTaller?.nombreComercial || 'GEARCORE';
    const rutTaller = configTaller?.rut ? `RUT: ${configTaller.rut}` : '';
    const dirTaller = configTaller?.direccion || '';
    const telTaller = configTaller?.telefono ? `Tel: ${configTaller.telefono}` : '';
    const emailTaller = configTaller?.email ? `Email: ${configTaller.email}` : '';

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

        const fechaEmision = new Date().toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // 1. ENCABEZADO
        doc.fillColor('#1e293b').fontSize(18).font('Helvetica-Bold').text(nombreTaller, 40, 40);
        const subtitulo = [rutTaller, dirTaller, telTaller, emailTaller].filter(Boolean).join(' • ');
        doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(subtitulo || 'Servicio Mecánico y Mantención Automotriz', 40, 62, { width: 330 });

        // Caja de Período y Fecha
        doc.rect(380, 35, 190, 55).lineWidth(1).strokeColor('#cbd5e1').fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold').text('INFORME EJECUTIVO BI', 390, 45);
        doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
        doc.text(`Emisión: ${fechaEmision}`, 390, 59);

        let rangoTexto = 'Histórico general';
        if (data.periodo.fechaInicio && data.periodo.fechaFin) {
          rangoTexto = `${data.periodo.fechaInicio} al ${data.periodo.fechaFin}`;
        } else if (data.periodo.fechaInicio) {
          rangoTexto = `Desde ${data.periodo.fechaInicio}`;
        } else if (data.periodo.fechaFin) {
          rangoTexto = `Hasta ${data.periodo.fechaFin}`;
        }
        doc.text(`Período: ${rangoTexto}`, 390, 71, { width: 175 });

        // 2. RESUMEN FINANCIERO Y OPERATIVO (KPIs)
        let yPos = 108;
        doc.rect(40, yPos, 530, 22).fillColor('#0f172a').fill();
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('RESUMEN FINANCIERO Y OPERATIVO', 50, yPos + 6);
        yPos += 22;

        const { finanzas, operaciones } = data;

        // Cuadrantes de KPIs
        const cardWidth = 125;
        const cardHeight = 48;
        const gap = 10;
        const kpiItems = [
          {
            label: 'Margen Neto (BI)',
            val: finanzas ? formatoMoneda(finanzas.gananciaBruta) : 'N/D',
            color: '#16a34a',
          },
          {
            label: 'Facturación Total',
            val: finanzas ? formatoMoneda(finanzas.totalFacturado) : 'N/D',
            color: '#0f172a',
          },
          {
            label: 'OTs Entregadas / Total',
            val: `${operaciones.otCompletadasTotal} / ${operaciones.totalOT}`,
            color: '#0284c7',
          },
          {
            label: 'Cumplimiento a Tiempo',
            val: `${operaciones.porcentajeATiempo}%`,
            color: operaciones.porcentajeATiempo >= 80 ? '#16a34a' : '#d97706',
          },
        ];

        kpiItems.forEach((kpi, i) => {
          const x = 40 + i * (cardWidth + gap);
          doc.rect(x, yPos + 8, cardWidth, cardHeight).strokeColor('#e2e8f0').fillAndStroke('#f8fafc', '#e2e8f0');
          doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text(kpi.label, x + 8, yPos + 16, { width: cardWidth - 16 });
          doc.fillColor(kpi.color).fontSize(11).font('Helvetica-Bold').text(kpi.val, x + 8, yPos + 30, { width: cardWidth - 16 });
        });

        yPos += cardHeight + 20;

        // 3. PIPELINE DE ÓRDENES DE TRABAJO
        doc.rect(40, yPos, 530, 20).fillColor('#1e293b').fill();
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('ESTADO DEL FLUJO DE TRABAJO (PIPELINE DE OTs)', 50, yPos + 5);
        yPos += 20;

        const estados = [
          { label: 'Recibido', key: 'RECIBIDO' },
          { label: 'Diagnóstico', key: 'DIAGNOSTICO' },
          { label: 'Cotización', key: 'COTIZACION' },
          { label: 'Aprobado', key: 'APROBADO' },
          { label: 'En Reparación', key: 'EN_REPARACION' },
          { label: 'Control Calidad', key: 'CONTROL_CALIDAD' },
          { label: 'Entregado', key: 'ENTREGADO' },
        ];

        const stepWidth = 530 / estados.length;
        estados.forEach((st, i) => {
          const x = 40 + i * stepWidth;
          const count = operaciones.pipelineEstados[st.key] || 0;
          doc.rect(x, yPos, stepWidth, 34).strokeColor('#e2e8f0').fillAndStroke(i % 2 === 0 ? '#ffffff' : '#f8fafc', '#e2e8f0');
          doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(st.label, x + 4, yPos + 6, { width: stepWidth - 8, align: 'center' });
          doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(String(count), x + 4, yPos + 18, { width: stepWidth - 8, align: 'center' });
        });

        yPos += 46;

        // 4. TABLA: REPUESTOS CON MAYOR ROTACIÓN
        doc.rect(40, yPos, 530, 20).fillColor('#0f172a').fill();
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('TOP REPUESTOS CON MAYOR ROTACIÓN Y VENTAS', 50, yPos + 5);
        yPos += 20;

        // Encabezados de tabla de repuestos
        doc.rect(40, yPos, 530, 18).fillColor('#f1f5f9').fill();
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
        doc.text('CÓDIGO', 50, yPos + 5);
        doc.text('DESCRIPCIÓN', 130, yPos + 5);
        doc.text('UNIDADES USADAS', 350, yPos + 5, { width: 90, align: 'right' });
        doc.text('TOTAL GENERADO', 460, yPos + 5, { width: 100, align: 'right' });
        yPos += 18;

        if (data.rankingRepuestos.length === 0) {
          doc.rect(40, yPos, 530, 22).fillColor('#ffffff').fill();
          doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('No hay registros de consumo de repuestos en el período.', 50, yPos + 7);
          yPos += 22;
        } else {
          data.rankingRepuestos.slice(0, 5).forEach((r, idx) => {
            const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(40, yPos, 530, 20).fillColor(bg).fill();
            doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text(r.codigo, 50, yPos + 6);
            doc.fillColor('#334155').font('Helvetica').text(r.nombre, 130, yPos + 6, { width: 210, ellipsis: true });
            doc.text(`${r.cantidad} uds`, 350, yPos + 6, { width: 90, align: 'right' });
            doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatoMoneda(r.totalGenerado), 460, yPos + 6, { width: 100, align: 'right' });
            yPos += 20;
          });
        }

        yPos += 16;

        // 5. TABLA: PRODUCTIVIDAD DEL PERSONAL TÉCNICO
        doc.rect(40, yPos, 530, 20).fillColor('#0f172a').fill();
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('PRODUCTIVIDAD Y EFECTIVIDAD DEL PERSONAL TÉCNICO', 50, yPos + 5);
        yPos += 20;

        doc.rect(40, yPos, 530, 18).fillColor('#f1f5f9').fill();
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
        doc.text('MECÁNICO', 50, yPos + 5);
        doc.text('ASIGNADAS', 220, yPos + 5, { width: 60, align: 'center' });
        doc.text('FINALIZADAS', 290, yPos + 5, { width: 70, align: 'center' });
        doc.text('EN CURSO', 370, yPos + 5, { width: 60, align: 'center' });
        doc.text('HORAS TRAB.', 440, yPos + 5, { width: 60, align: 'right' });
        doc.text('EFECTIVIDAD', 510, yPos + 5, { width: 50, align: 'right' });
        yPos += 18;

        if (data.productividadMecanicos.length === 0) {
          doc.rect(40, yPos, 530, 22).fillColor('#ffffff').fill();
          doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('No hay mecánicos con órdenes en el período.', 50, yPos + 7);
          yPos += 22;
        } else {
          data.productividadMecanicos.forEach((m, idx) => {
            const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(40, yPos, 530, 20).fillColor(bg).fill();
            doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text(m.nombre, 50, yPos + 6);
            doc.fillColor('#334155').font('Helvetica').text(String(m.totalAsignadas), 220, yPos + 6, { width: 60, align: 'center' });
            doc.text(String(m.finalizadas), 290, yPos + 6, { width: 70, align: 'center' });
            doc.text(String(m.enCurso), 370, yPos + 6, { width: 60, align: 'center' });
            doc.text(`${m.horasHombre}h`, 440, yPos + 6, { width: 60, align: 'right' });
            doc.fillColor(m.eficiencia >= 75 ? '#16a34a' : '#d97706').font('Helvetica-Bold').text(`${m.eficiencia}%`, 510, yPos + 6, { width: 50, align: 'right' });
            yPos += 20;
          });
        }

        // 6. PIE DE PÁGINA
        const yFooter = 710;
        doc.moveTo(40, yFooter).lineTo(570, yFooter).lineWidth(0.8).strokeColor('#cbd5e1').stroke();
        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica');
        doc.text(`Generado automáticamente por GearCore ERP • ${nombreTaller}`, 40, yFooter + 8);
        doc.text('Documento Confidencial de Gestión Interna', 380, yFooter + 8, { width: 190, align: 'right' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
