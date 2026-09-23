'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { useDashboard } from './DashboardContext';
import {
  useDashboardMetricas,
  descargarInformeDashboardPdf,
} from '../../hooks/dashboard/useDashboardMetricas';

export default function DashboardPage() {
  const router = useRouter();
  const { userRole } = useDashboard();
  const [activeTab, setActiveTab] = useState<'general' | 'mision' | 'politicas'>('general');

  // Filtros de fecha (SCRUM-38)
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const { data: metricas, isLoading, isFetching } = useDashboardMetricas({
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined,
  });

  const finanzas = metricas?.finanzas;
  const operaciones = metricas?.operaciones;
  const rankingRepuestos = metricas?.rankingRepuestos || [];
  const productividadMecanicos = metricas?.productividadMecanicos || [];

  async function handleDescargarInforme() {
    try {
      setDescargandoPdf(true);
      await descargarInformeDashboardPdf({
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      });
    } catch (err: any) {
      alert(`Error al descargar el informe: ${err?.message || 'Error del servidor'}`);
    } finally {
      setDescargandoPdf(false);
    }
  }

  function formatearMoneda(val: number) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  return (
    <>
      {/* Encabezado y Barra de Filtro de Fechas (SCRUM-38) */}
      <div className={styles.biHeaderBar}>
        <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
          <h2 className={styles.sectionTitle}>Dashboard</h2>
          <p className={styles.sectionSubtitle}>
            Métricas de productividad, ganancia y rendimiento en tiempo real
          </p>
        </div>

        <div className={styles.dateFilterGroup}>
          <label htmlFor="fechaInicio">Desde:</label>
          <input
            id="fechaInicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className={styles.dateInput}
          />
          <label htmlFor="fechaFin">Hasta:</label>
          <input
            id="fechaFin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className={styles.dateInput}
          />
          {(fechaInicio || fechaFin) && (
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
              }}
            >
              Limpiar filtro
            </button>
          )}

          {userRole === 'ADMINISTRADOR' && (
            <button
              type="button"
              className={styles.btnReportePdf}
              onClick={handleDescargarInforme}
              disabled={descargandoPdf || isLoading}
              title="Descargar informe ejecutivo en PDF del período filtrado"
            >
              {descargandoPdf ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Exportar Informe PDF</span>
                </>
              )}
            </button>
          )}

          {isFetching && <span style={{ fontSize: 11, color: '#3b82f6' }}>Actualizando...</span>}
        </div>
      </div>

      {/* Tarjetas Principales de Resumen (SCRUM-35) */}
      <section className={styles.cardsGrid}>
        {/* Tarjeta 1: Financiera (Solo ADMINISTRADOR) o Turno */}
        {userRole === 'ADMINISTRADOR' && finanzas ? (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>Ganancia Bruta (BI)</h4>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statRow}>
                <span>Margen Neto</span>
                <strong style={{ color: '#22c55e', fontSize: 16 }}>
                  {formatearMoneda(finanzas.gananciaBruta)}
                </strong>
              </div>
              <div className={styles.statRow}>
                <span>Facturación Total</span>
                <strong>{formatearMoneda(finanzas.totalFacturado)}</strong>
              </div>
              <div className={styles.statRow}>
                <span>Margen Promedio</span>
                <strong>{finanzas.margenPromedio}%</strong>
              </div>
            </div>
            <Link href="/cotizaciones" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
              Ver Cotizaciones ({finanzas.cotizacionesAprobadas})
            </Link>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>Jornada / Horas</h4>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statRow}>
                <span>Horas taller invertidas</span>
                <strong>{operaciones?.horasInvertidasTotal || 0} hrs</strong>
              </div>
              <div className={styles.statRow}>
                <span>Estado actual</span>
                <strong style={{ color: '#10b981' }}>En Operación</strong>
              </div>
            </div>
            <button type="button" className={styles.cardAction}>Ver Turno</button>
          </div>
        )}

        {/* Tarjeta 2: Cumplimiento OT a tiempo (SCRUM-35) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>OTs a Tiempo (SLA)</h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>Completadas a tiempo</span>
              <strong style={{ color: '#3b82f6', fontSize: 16 }}>
                {operaciones?.porcentajeATiempo || 100}%
              </strong>
            </div>
            <div className={styles.statRow}>
              <span>Total Entregadas</span>
              <strong>{operaciones?.otCompletadasTotal || 0}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Horas Invertidas</span>
              <strong>{operaciones?.horasInvertidasTotal || 0} hrs</strong>
            </div>
          </div>
          <Link href="/ordenes" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
            Ir a Órdenes
          </Link>
        </div>

        {/* Tarjeta 3: Órdenes en Proceso */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Carga Activa de Taller</h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>OTs en Curso</span>
              <strong style={{ color: '#f59e0b', fontSize: 16 }}>
                {operaciones?.ordenesEnProceso || 0}
              </strong>
            </div>
            <div className={styles.statRow}>
              <span>Total Registradas</span>
              <strong>{operaciones?.totalOT || 0}</strong>
            </div>
          </div>
          <Link href="/ordenes" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
            Gestionar Órdenes
          </Link>
        </div>

        {/* Tarjeta 4: Inventario Crítico y Enlaces */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Inventario Operativo</h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>Top repuestos en OT</span>
              <strong>{rankingRepuestos.length} tipos</strong>
            </div>
            <div className={styles.statRow}>
              <span>{userRole === 'MECANICO' ? 'Mi Taller' : 'Clientes Registrados'}</span>
              <strong>Activo</strong>
            </div>
          </div>
          <Link href="/inventario" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
            Ver Catálogo de Repuestos
          </Link>
        </div>
      </section>

      {/* Embudo de Flujo de OTs por Estado (Pipeline) */}
      <section className={styles.pipelineContainer}>
        <div className={styles.pipelineHeader}>
          <span className={styles.pipelineTitle}>Flujo de Órdenes en Taller (Pipeline)</span>
          <Link href="/ordenes" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
            Ver Tablero Completo →
          </Link>
        </div>
        <div className={styles.pipelineSteps}>
          {[
            { key: 'RECIBIDO', label: 'Recibido', color: 'statusRecibido' },
            { key: 'DIAGNOSTICO', label: 'Diagnóstico', color: 'statusDiagnostico' },
            { key: 'COTIZACION', label: 'Cotización', color: 'statusCotizacion' },
            { key: 'APROBADO', label: 'Aprobado', color: 'statusAprobado' },
            { key: 'EN_REPARACION', label: 'En Reparación', color: 'statusReparacion' },
            { key: 'CONTROL_CALIDAD', label: 'Control Calidad', color: 'statusCalidad' },
            { key: 'ENTREGADO', label: 'Entregado', color: 'statusEntregado' },
          ].map((step) => {
            const count = operaciones?.pipelineEstados?.[step.key] ?? 0;
            return (
              <Link key={step.key} href="/ordenes" className={styles.pipelineStep}>
                <span className={styles.pipelineStepLabel}>{step.label}</span>
                <span className={styles.pipelineStepCount}>{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tabla de Actividad Reciente: Últimas Órdenes */}
      <section className={styles.biPanel}>
        <div className={styles.biPanelTitle}>
          <span>Órdenes de Trabajo Recientes</span>
          <Link href="/ordenes" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
            Ver todas →
          </Link>
        </div>

        {(!metricas?.ultimasOrdenes || metricas.ultimasOrdenes.length === 0) ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            No hay órdenes registradas.
          </p>
        ) : (
          <div className={styles.recentTableWrapper}>
            <table className={styles.recentTable}>
              <thead>
                <tr>
                  <th>Patente</th>
                  <th>Vehículo</th>
                  <th>Cliente</th>
                  <th>Mecánico</th>
                  <th>Falla</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {metricas.ultimasOrdenes.map((ot) => (
                  <tr
                    key={ot.id}
                    className={styles.clickableRow}
                    onClick={() => router.push(`/ordenes?id=${ot.id.slice(0, 8)}`)}
                    title={`Ver detalles de orden #${ot.id.slice(0, 8).toUpperCase()}`}
                  >
                    <td>
                      <span className={styles.plateBadge}>{ot.vehiculo?.patente || 'S/P'}</span>
                    </td>
                    <td>{ot.vehiculo?.marca} {ot.vehiculo?.modelo}</td>
                    <td>{ot.vehiculo?.cliente?.nombre || 'Particular'}</td>
                    <td>{ot.mecanico?.nombre || 'Sin asignar'}</td>
                    <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ot.fallaReportada}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status${ot.estado.charAt(0) + ot.estado.slice(1).toLowerCase().replace(/_([a-z])/g, (_, l) => l.toUpperCase())}`] || ''}`}>
                        {ot.estado.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Grid de 2 Columnas para Business Intelligence (SCRUM-36 y SCRUM-37) */}
      <section className={styles.biTwoColumnGrid}>
        {/* Panel Izquierdo: Ranking de Repuestos Más Usados (SCRUM-36) */}
        <div className={styles.biPanel}>
          <div className={styles.biPanelTitle}>
            <span>Repuestos Más Utilizados en Reparaciones</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top 5</span>
          </div>

          {rankingRepuestos.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              No hay movimientos de repuestos registrados en el periodo seleccionado.
            </p>
          ) : (
            <div className={styles.rankingList}>
              {rankingRepuestos.map((item, index) => (
                <div key={item.id} className={styles.rankingRow}>
                  <div className={styles.rankingLeft}>
                    <div className={styles.rankingBadge}>#{index + 1}</div>
                    <div>
                      <div className={styles.rankingName}>{item.nombre}</div>
                      <div className={styles.rankingCode}>Código: {item.codigo}</div>
                    </div>
                  </div>
                  <div className={styles.rankingStats}>
                    <div className={styles.rankingCount}>{item.cantidad} un.</div>
                    {userRole === 'ADMINISTRADOR' && (
                      <div className={styles.rankingMoney}>
                        {formatearMoneda(item.totalGenerado)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel Derecho: Carga de Trabajo y Eficiencia por Mecánico (SCRUM-37) */}
        <div className={styles.biPanel}>
          <div className={styles.biPanelTitle}>
            <span>Productividad y Carga por Mecánico</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Taller Activo</span>
          </div>

          {productividadMecanicos.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              {userRole === 'MECANICO'
                ? 'Panel asignado a mecánicos del taller.'
                : 'No hay mecánicos con órdenes en el periodo seleccionado.'}
            </p>
          ) : (
            <div className={styles.rankingList}>
              {productividadMecanicos.map((mec) => (
                <div key={mec.id} className={styles.mecanicoCard}>
                  <div className={styles.mecanicoHeader}>
                    <span className={styles.mecanicoName}>{mec.nombre}</span>
                    <span className={styles.mecanicoBadge}>
                      {mec.eficiencia}% Tasa de cierre
                    </span>
                  </div>

                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${Math.min(mec.eficiencia, 100)}%` }}
                    />
                  </div>

                  <div className={styles.mecanicoMeta}>
                    <span>OTs: {mec.finalizadas} finalizadas / {mec.enCurso} en curso</span>
                    <span>{mec.horasHombre} horas hombre</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
