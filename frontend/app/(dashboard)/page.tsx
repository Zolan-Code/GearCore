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
import { useRepuestos } from '../../hooks/repuestos/useRepuestos';

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

  // Inventario en vivo (aprovecha la cache de TanStack Query sin peticiones adicionales)
  const { data: inventarioData } = useRepuestos();
  const itemsInventario = inventarioData?.items || [];
  const totalRepuestos = itemsInventario.filter((i) => i.tipo !== 'INSUMO').length;
  const totalInsumos = itemsInventario.filter((i) => i.tipo === 'INSUMO').length;
  const totalCriticos = itemsInventario.filter((i) => i.stock <= (i.stockMinimo ?? 5)).length;

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

        {/* Tarjeta 4: Inventario de Taller y Enlaces */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Inventario de Taller</h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>Repuestos</span>
              <strong>{totalRepuestos} artículos</strong>
            </div>
            <div className={styles.statRow}>
              <span>Insumos de Taller</span>
              <strong>{totalInsumos} insumos</strong>
            </div>
            <div className={styles.statRow}>
              <span>Nivel de Stock</span>
              {totalCriticos > 0 ? (
                <strong style={{ color: '#ef4444' }}>{totalCriticos} en alerta</strong>
              ) : (
                <strong style={{ color: '#10b981' }}>Niveles Óptimos</strong>
              )}
            </div>
          </div>
          <div className={styles.cardActionsGroup}>
            <Link
              href="/inventario?tipo=TODOS"
              className={styles.cardAction}
              style={{ textAlign: 'center', textDecoration: 'none', margin: 0 }}
            >
              Inventario General →
            </Link>
            <div className={styles.cardActionSecondaryRow}>
              <Link href="/inventario?tipo=REPUESTO" className={styles.cardActionSubtle}>
                Repuestos
              </Link>
              <Link href="/inventario?tipo=INSUMO" className={styles.cardActionSubtle}>
                Insumos
              </Link>
            </div>
          </div>
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
            <span>Repuestos e Insumos Más Utilizados</span>
            <Link href="/inventario?tipo=TODOS" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
              Ver inventario general →
            </Link>
          </div>

          {rankingRepuestos.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              No hay movimientos de repuestos registrados en el periodo seleccionado.
            </p>
          ) : (
            <div className={styles.rankingList}>
              {rankingRepuestos.map((item, index) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={styles.rankingRow}
                  onClick={() => router.push(`/inventario?tipo=TODOS&search=${encodeURIComponent(item.codigo || item.nombre)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/inventario?tipo=TODOS&search=${encodeURIComponent(item.codigo || item.nombre)}`);
                    }
                  }}
                  title={`Ver ${item.tipo === 'INSUMO' ? 'insumo' : 'repuesto'} ${item.nombre} (${item.codigo}) en Inventario`}
                >
                  <div className={styles.rankingLeft}>
                    <div className={styles.rankingBadge}>#{index + 1}</div>
                    <div>
                      <div className={styles.rankingName}>
                        {item.nombre}
                        <span
                          className={`${styles.itemTypeBadge} ${
                            item.tipo === 'INSUMO' ? styles.badgeInsumo : styles.badgeRepuesto
                          }`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          {item.tipo === 'INSUMO' ? (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                              </svg>
                              Insumo
                            </>
                          ) : (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                              </svg>
                              Repuesto
                            </>
                          )}
                        </span>
                      </div>
                      <div className={styles.rankingCode}>Código: {item.codigo}</div>
                    </div>
                  </div>
                  <div className={styles.rankingRight}>
                    <div className={styles.rankingStats}>
                      <div className={styles.rankingCount}>{item.cantidad} un.</div>
                      {userRole === 'ADMINISTRADOR' && (
                        <div className={styles.rankingMoney}>
                          {formatearMoneda(item.totalGenerado)}
                        </div>
                      )}
                    </div>
                    <svg
                      className={styles.rankingChevron}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
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
