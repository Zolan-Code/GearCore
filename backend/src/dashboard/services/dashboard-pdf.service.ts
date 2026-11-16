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

// Paleta del informe (coherente con la interfaz web)
const C = {
  marca: '#1e1b4b',
  acento: '#0284c7',
  texto: '#0f172a',
  textoSec: '#475569',
  textoTenue: '#94a3b8',
  borde: '#e2e8f0',
  fondoSuave: '#f8fafc',
  fondoTabla: '#f1f5f9',
  verde: '#16a34a',
  ambar: '#d97706',
};

// Colores por estado de OT (mismos que el pipeline del dashboard web)
const ESTADOS_OT = [
  { key: 'RECIBIDO', label: 'Recibido', color: '#3b82f6' },
  { key: 'DIAGNOSTICO', label: 'Diagnóstico', color: '#ca8a04' },
  { key: 'COTIZACION', label: 'Cotización', color: '#a855f7' },
  { key: 'APROBADO', label: 'Aprobado', color: '#10b981' },
  { key: 'EN_REPARACION', label: 'En Reparación', color: '#2563eb' },
  { key: 'CONTROL_CALIDAD', label: 'Control Calidad', color: '#ea580c' },
  { key: 'ENTREGADO', label: 'Entregado', color: '#16a34a' },
];

const PAGINA = { izq: 40, der: 572, ancho: 532, limiteInferior: 742 };

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
        const doc = new PDFDocument({ margin: 40, size: 'LETTER', bufferPages: true });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const moneda = (val: number) => `$${Math.round(val || 0).toLocaleString('es-CL')}`;

        const fechaEmision = new Date().toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        let rangoTexto = 'Histórico general';
        if (data.periodo.fechaInicio && data.periodo.fechaFin) {
          rangoTexto = `${data.periodo.fechaInicio} al ${data.periodo.fechaFin}`;
        } else if (data.periodo.fechaInicio) {
          rangoTexto = `Desde ${data.periodo.fechaInicio}`;
        } else if (data.periodo.fechaFin) {
          rangoTexto = `Hasta ${data.periodo.fechaFin}`;
        }

        let y = 0;

        // Salta a una página nueva si el bloque siguiente no cabe
        const asegurarEspacio = (alto: number) => {
          if (y + alto > PAGINA.limiteInferior) {
            doc.addPage();
            doc.rect(0, 0, 612, 5).fill(C.marca);
            y = 40;
          }
        };

        // Título de sección: barra de acento + texto + línea fina
        const tituloSeccion = (titulo: string, subtitulo?: string) => {
          asegurarEspacio(60);
          doc.rect(PAGINA.izq, y + 1, 3, 13).fill(C.acento);
          doc.fillColor(C.texto).font('Helvetica-Bold').fontSize(11).text(titulo, PAGINA.izq + 10, y + 2, { lineBreak: false });
          if (subtitulo) {
            doc.fillColor(C.textoTenue).font('Helvetica').fontSize(8)
              .text(subtitulo, PAGINA.izq, y + 4, { width: PAGINA.ancho, align: 'right', lineBreak: false });
          }
          y += 20;
          doc.moveTo(PAGINA.izq, y).lineTo(PAGINA.der, y).lineWidth(0.6).strokeColor(C.borde).stroke();
          y += 10;
        };

        // Tarjeta KPI con borde superior de color
        const tarjetaKpi = (x: number, ancho: number, etiqueta: string, valor: string, color: string, nota?: string) => {
          const alto = 54;
          doc.roundedRect(x, y, ancho, alto, 4).lineWidth(0.8).fillAndStroke(C.fondoSuave, C.borde);
          doc.rect(x, y, ancho, 3).fill(color);
          doc.fillColor(C.textoSec).font('Helvetica-Bold').fontSize(7)
            .text(etiqueta.toUpperCase(), x + 10, y + 11, { width: ancho - 20, lineBreak: false, characterSpacing: 0.3 });
          doc.fillColor(color).font('Helvetica-Bold').fontSize(14)
            .text(valor, x + 10, y + 23, { width: ancho - 20, lineBreak: false });
          if (nota) {
            doc.fillColor(C.textoTenue).font('Helvetica').fontSize(6.5)
              .text(nota, x + 10, y + 41, { width: ancho - 20, lineBreak: false, ellipsis: true, height: 10 });
          }
        };

        const filaKpis = (items: Array<[string, string, string, string?]>) => {
          asegurarEspacio(62);
          const gap = 10;
          const ancho = (PAGINA.ancho - gap * (items.length - 1)) / items.length;
          items.forEach(([etiqueta, valor, color, nota], i) => {
            tarjetaKpi(PAGINA.izq + i * (ancho + gap), ancho, etiqueta, valor, color, nota);
          });
          y += 54 + 10;
        };

        // ───────────────────────── 1. ENCABEZADO ─────────────────────────
        doc.rect(0, 0, 612, 5).fill(C.marca);

        doc.fillColor(C.texto).font('Helvetica-Bold').fontSize(18).text(nombreTaller, PAGINA.izq, 34, { width: 330 });
        const subtitulo = [rutTaller, dirTaller, telTaller, emailTaller].filter(Boolean).join('  •  ');
        doc.fillColor(C.textoSec).font('Helvetica').fontSize(8)
          .text(subtitulo || 'Servicio Mecánico y Mantención Automotriz', PAGINA.izq, doc.y + 3, { width: 330 });
        const finEncabezadoIzq = doc.y;

        const cajaX = 392;
        doc.roundedRect(cajaX, 30, 180, 58, 5).fill(C.marca);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10.5).text('INFORME EJECUTIVO', cajaX + 12, 40, { lineBreak: false });
        doc.fillColor('#c7d2fe').font('Helvetica').fontSize(7.5);
        doc.text(`Emisión: ${fechaEmision}`, cajaX + 12, 56, { width: 156, lineBreak: false });
        doc.text(`Período: ${rangoTexto}`, cajaX + 12, 68, { width: 156, lineBreak: false, ellipsis: true, height: 10 });

        y = Math.max(finEncabezadoIzq, 88) + 22;

        const { finanzas, operaciones } = data;

        // ───────────────────── 2. RESUMEN FINANCIERO ─────────────────────
        tituloSeccion('Resumen financiero', 'Cotizaciones aprobadas en el período');
        if (finanzas) {
          const ticketPromedio =
            finanzas.cotizacionesAprobadas > 0 ? finanzas.totalFacturado / finanzas.cotizacionesAprobadas : 0;
          filaKpis([
            ['Facturación total', moneda(finanzas.totalFacturado), C.texto, `${finanzas.cotizacionesAprobadas} cotizaciones aprobadas`],
            ['Margen neto', moneda(finanzas.gananciaBruta), C.verde, `Costo total: ${moneda(finanzas.totalCosto)}`],
            ['Margen promedio', `${finanzas.margenPromedio}%`, finanzas.margenPromedio >= 30 ? C.verde : C.ambar, 'Promedio por cotización'],
            ['Ticket promedio', moneda(ticketPromedio), C.acento, 'Facturación / cotizaciones'],
          ]);
        } else {
          asegurarEspacio(24);
          doc.fillColor(C.textoTenue).font('Helvetica').fontSize(8.5)
            .text('Información financiera no disponible para este perfil.', PAGINA.izq, y);
          y += 24;
        }

        // ───────────────────── 3. RESUMEN OPERATIVO ─────────────────────
        y += 6;
        tituloSeccion('Resumen operativo', 'Órdenes de trabajo del período');
        filaKpis([
          ['OTs registradas', String(operaciones.totalOT), C.texto, 'Total ingresadas al taller'],
          ['OTs entregadas', String(operaciones.otCompletadasTotal), C.verde, 'Vehículos devueltos al cliente'],
          ['OTs en proceso', String(operaciones.ordenesEnProceso), C.ambar, 'Aún no entregadas'],
          [
            'Cumplimiento a tiempo',
            `${operaciones.porcentajeATiempo}%`,
            operaciones.porcentajeATiempo >= 80 ? C.verde : C.ambar,
            `${operaciones.horasInvertidasTotal} h invertidas`,
          ],
        ]);

        // ─────────────── 4. GRÁFICO: PIPELINE DE OTs POR ESTADO ───────────────
        y += 6;
        tituloSeccion('Flujo de órdenes por estado', 'Cantidad de OTs en cada etapa');
        const maxEstado = Math.max(1, ...ESTADOS_OT.map((e) => operaciones.pipelineEstados[e.key] || 0));
        const etiquetaAncho = 92;
        const barraMaxAncho = PAGINA.ancho - etiquetaAncho - 40;
        const altoFila = 14;
        asegurarEspacio(ESTADOS_OT.length * altoFila + 8);
        ESTADOS_OT.forEach((estado) => {
          const cantidad = operaciones.pipelineEstados[estado.key] || 0;
          const anchoBarra = cantidad > 0 ? Math.max(4, (cantidad / maxEstado) * barraMaxAncho) : 0;
          doc.fillColor(C.textoSec).font('Helvetica').fontSize(8)
            .text(estado.label, PAGINA.izq, y + 2.5, { width: etiquetaAncho - 8, align: 'right', lineBreak: false });
          doc.roundedRect(PAGINA.izq + etiquetaAncho, y + 2, barraMaxAncho, 9, 2).fill(C.fondoTabla);
          if (anchoBarra > 0) {
            doc.roundedRect(PAGINA.izq + etiquetaAncho, y + 2, anchoBarra, 9, 2).fill(estado.color);
          }
          doc.fillColor(C.texto).font('Helvetica-Bold').fontSize(8.5)
            .text(String(cantidad), PAGINA.izq + etiquetaAncho + barraMaxAncho + 8, y + 2.5, { width: 30, lineBreak: false });
          y += altoFila;
        });
        y += 10;

        // ─────────── 5. TOP REPUESTOS (tabla con barra de ingresos) ───────────
        tituloSeccion('Repuestos e insumos más utilizados', 'Top 5 por ingresos generados');
        const colRep = { codigo: PAGINA.izq + 8, nombre: PAGINA.izq + 92, uds: PAGINA.izq + 290, barra: PAGINA.izq + 350, total: PAGINA.izq + 440 };
        const encabezadoTabla = (columnas: Array<[string, number, number, 'left' | 'right' | 'center']>) => {
          doc.rect(PAGINA.izq, y, PAGINA.ancho, 18).fill(C.fondoTabla);
          doc.fillColor(C.textoSec).font('Helvetica-Bold').fontSize(7);
          columnas.forEach(([texto, x, ancho, align]) => {
            doc.text(texto, x, y + 6, { width: ancho, align, lineBreak: false, characterSpacing: 0.3 });
          });
          y += 18;
        };

        const topRepuestos = data.rankingRepuestos.slice(0, 5);
        asegurarEspacio(18 + Math.max(1, topRepuestos.length) * 20 + 10);
        encabezadoTabla([
          ['CÓDIGO', colRep.codigo, 80, 'left'],
          ['DESCRIPCIÓN', colRep.nombre, 190, 'left'],
          ['UNIDADES', colRep.uds, 50, 'right'],
          ['PARTICIPACIÓN', colRep.barra, 80, 'left'],
          ['TOTAL GENERADO', colRep.total, 84, 'right'],
        ]);

        if (topRepuestos.length === 0) {
          doc.fillColor(C.textoTenue).font('Helvetica').fontSize(8)
            .text('No hay registros de consumo de repuestos en el período.', colRep.codigo, y + 7);
          y += 24;
        } else {
          const maxTotal = Math.max(1, ...topRepuestos.map((r) => r.totalGenerado || 0));
          topRepuestos.forEach((r, idx) => {
            if (idx % 2 === 1) doc.rect(PAGINA.izq, y, PAGINA.ancho, 20).fill(C.fondoSuave);
            doc.fillColor(C.texto).font('Helvetica-Bold').fontSize(7.5)
              .text(r.codigo, colRep.codigo, y + 6.5, { width: 80, lineBreak: false, ellipsis: true, height: 10 });
            doc.fillColor(C.textoSec).font('Helvetica').fontSize(8)
              .text(r.nombre, colRep.nombre, y + 6, { width: 190, lineBreak: false, ellipsis: true, height: 10 });
            doc.text(`${r.cantidad}`, colRep.uds, y + 6, { width: 50, align: 'right', lineBreak: false });
            const anchoBarra = Math.max(3, ((r.totalGenerado || 0) / maxTotal) * 76);
            doc.roundedRect(colRep.barra, y + 7, 76, 6, 2).fill(C.fondoTabla);
            doc.roundedRect(colRep.barra, y + 7, anchoBarra, 6, 2).fill(C.acento);
            doc.fillColor(C.texto).font('Helvetica-Bold').fontSize(8)
              .text(moneda(r.totalGenerado), colRep.total, y + 6, { width: 84, align: 'right', lineBreak: false });
            y += 20;
          });
        }
        y += 12;

        // ─────────── 6. PRODUCTIVIDAD DEL PERSONAL TÉCNICO ───────────
        tituloSeccion('Productividad del personal técnico', 'OTs asignadas por mecánico');
        const colMec = { nombre: PAGINA.izq + 8, asig: PAGINA.izq + 190, fin: PAGINA.izq + 250, curso: PAGINA.izq + 310, horas: PAGINA.izq + 370, efec: PAGINA.izq + 430 };
        asegurarEspacio(18 + 20 + 10);
        encabezadoTabla([
          ['MECÁNICO', colMec.nombre, 170, 'left'],
          ['ASIGNADAS', colMec.asig, 55, 'center'],
          ['FINALIZADAS', colMec.fin, 55, 'center'],
          ['EN CURSO', colMec.curso, 55, 'center'],
          ['HORAS', colMec.horas, 50, 'center'],
          ['EFECTIVIDAD', colMec.efec, 94, 'right'],
        ]);

        if (data.productividadMecanicos.length === 0) {
          doc.fillColor(C.textoTenue).font('Helvetica').fontSize(8)
            .text('No hay mecánicos con órdenes en el período.', colMec.nombre, y + 7);
          y += 24;
        } else {
          data.productividadMecanicos.forEach((m, idx) => {
            asegurarEspacio(20);
            if (idx % 2 === 1) doc.rect(PAGINA.izq, y, PAGINA.ancho, 20).fill(C.fondoSuave);
            doc.fillColor(C.texto).font('Helvetica-Bold').fontSize(8)
              .text(m.nombre, colMec.nombre, y + 6, { width: 170, lineBreak: false, ellipsis: true, height: 10 });
            doc.fillColor(C.textoSec).font('Helvetica').fontSize(8);
            doc.text(String(m.totalAsignadas), colMec.asig, y + 6, { width: 55, align: 'center', lineBreak: false });
            doc.text(String(m.finalizadas), colMec.fin, y + 6, { width: 55, align: 'center', lineBreak: false });
            doc.text(String(m.enCurso), colMec.curso, y + 6, { width: 55, align: 'center', lineBreak: false });
            doc.text(`${m.horasHombre} h`, colMec.horas, y + 6, { width: 50, align: 'center', lineBreak: false });
            const colorEf = m.eficiencia >= 75 ? C.verde : C.ambar;
            doc.roundedRect(colMec.efec + 18, y + 7, 40, 6, 2).fill(C.fondoTabla);
            doc.roundedRect(colMec.efec + 18, y + 7, Math.max(2, (m.eficiencia / 100) * 40), 6, 2).fill(colorEf);
            doc.fillColor(colorEf).font('Helvetica-Bold').fontSize(8)
              .text(`${m.eficiencia}%`, colMec.efec + 62, y + 6, { width: 32, align: 'right', lineBreak: false });
            y += 20;
          });
        }
        y += 12;

        // ─────────── 7. NOTAS: DEFINICIÓN DE MÉTRICAS ───────────
        const notas = [
          'Facturación y ticket promedio incluyen IVA. Margen neto: subtotal neto (sin IVA) menos costo, en cotizaciones aprobadas.',
          'Cumplimiento a tiempo: OTs entregadas dentro de 72 h desde su recepción (o con hasta 8 h-hombre) / OTs entregadas.',
          'Efectividad: OTs finalizadas / OTs asignadas a cada mecánico en el período.',
        ];
        const altoNotas = 14 + notas.length * 11;
        asegurarEspacio(altoNotas);
        doc.roundedRect(PAGINA.izq, y, PAGINA.ancho, altoNotas, 4).lineWidth(0.6).fillAndStroke('#ffffff', C.borde);
        doc.fillColor(C.textoSec).font('Helvetica-Bold').fontSize(7).text('NOTAS', PAGINA.izq + 10, y + 7, { lineBreak: false, characterSpacing: 0.3 });
        doc.fillColor(C.textoTenue).font('Helvetica').fontSize(7);
        notas.forEach((nota, i) => {
          doc.text(`•  ${nota}`, PAGINA.izq + 50, y + 7 + i * 11, { width: PAGINA.ancho - 60, lineBreak: false, ellipsis: true, height: 10 });
        });

        // ─────────── 8. PIE DE PÁGINA EN TODAS LAS PÁGINAS ───────────
        const rango = doc.bufferedPageRange();
        for (let i = rango.start; i < rango.start + rango.count; i++) {
          doc.switchToPage(i);
          const margenOriginal = doc.page.margins.bottom;
          doc.page.margins.bottom = 0; // permite escribir bajo el margen sin crear páginas nuevas
          const yPie = 752;
          doc.moveTo(PAGINA.izq, yPie).lineTo(PAGINA.der, yPie).lineWidth(0.6).strokeColor(C.borde).stroke();
          doc.fillColor(C.textoTenue).font('Helvetica').fontSize(7);
          doc.text(`Generado por GearCore ERP  •  ${nombreTaller}  •  Documento confidencial de gestión interna`, PAGINA.izq, yPie + 7, { width: 400, lineBreak: false });
          doc.text(`Página ${i - rango.start + 1} de ${rango.count}`, PAGINA.izq, yPie + 7, { width: PAGINA.ancho, align: 'right', lineBreak: false });
          doc.page.margins.bottom = margenOriginal;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
