'use client';

import { useState } from 'react';
import styles from './cotizaciones.module.css';
import DataTable, { Column } from './DataTable';
import Skeleton from './Skeleton';
import {
  useCotizaciones,
  useCrearCotizacion,
  useActualizarCotizacion,
  useCambiarEstadoCotizacion,
  useHistorialCotizacion,
  descargarCotizacionPdf,
  obtenerCotizacionPdfBlob,
  limpiarTelefonoWhatsApp,
  generarMensajeCotizacionWhatsApp,
  generarNombreArchivoCotizacion,
  Cotizacion,
  EstadoCotizacion,
  TipoItemCotizacion,
} from '../../hooks/cotizaciones/useCotizaciones';
import { useOrdenesTrabajo, OrdenTrabajo } from '../../hooks/ordenes-trabajo/useOrdenesTrabajo';

interface Props {
  userRole: 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';
}

const ESTADOS_FILTRO: { id: EstadoCotizacion | 'TODAS'; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'BORRADOR', label: 'Borrador' },
  { id: 'ENVIADA', label: 'Enviadas' },
  { id: 'APROBADA', label: 'Aprobadas' },
  { id: 'RECHAZADA', label: 'Rechazadas' },
];

export default function CotizacionesView({ userRole }: Props) {
  const [filtroEstado, setFiltroEstado] = useState<EstadoCotizacion | 'TODAS'>('TODAS');
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState<Cotizacion | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [historialCotizacionId, setHistorialCotizacionId] = useState<string | null>(null);
  const [descargandoPdfId, setDescargandoPdfId] = useState<string | null>(null);
  const [enviandoWspId, setEnviandoWspId] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  // Modal de confirmación integrado (reemplaza window.confirm)
  const [modalConfirmacion, setModalConfirmacion] = useState<{
    abierto: boolean;
    titulo: string;
    mensaje: string;
    tipo: 'APROBAR' | 'RECHAZAR' | 'GENERICO';
    textoBoton: string;
    onConfirm: () => Promise<void> | void;
  }>({
    abierto: false,
    titulo: '',
    mensaje: '',
    tipo: 'GENERICO',
    textoBoton: 'Confirmar',
    onConfirm: () => {},
  });

  // Consultas TanStack Query
  const {
    data: cotizaciones = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCotizaciones(filtroEstado === 'TODAS' ? undefined : { estado: filtroEstado });

  const { data: ordenes = [] } = useOrdenesTrabajo();
  const { data: historial = [], isLoading: cargandoHistorial } = useHistorialCotizacion(
    historialCotizacionId || undefined,
  );

  // Mutaciones
  const crearMutation = useCrearCotizacion();
  const actualizarMutation = useActualizarCotizacion();
  const cambiarEstadoMutation = useCambiarEstadoCotizacion();

  // Estados para formulario de edición
  const [editMotivo, setEditMotivo] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [editHorasHombre, setEditHorasHombre] = useState<number>(0);
  const [editValorHora, setEditValorHora] = useState<number>(25000);
  const [editCostoHora, setEditCostoHora] = useState<number>(12000);
  const [editDescuento, setEditDescuento] = useState<number>(0);
  const [editAplicaIva, setEditAplicaIva] = useState<boolean>(true);

  // Estados para formulario de creación
  const [nuevoOTId, setNuevoOTId] = useState('');
  const [nuevoValidezDias, setNuevoValidezDias] = useState(15);
  const [nuevoObservaciones, setNuevoObservaciones] = useState('');
  const [nuevoValorHora, setNuevoValorHora] = useState(25000);
  const [nuevoCostoHora, setNuevoCostoHora] = useState(12000);
  const [nuevoHorasHombre, setNuevoHorasHombre] = useState(1);
  const [nuevoDescuento, setNuevoDescuento] = useState(0);
  const [nuevoAplicaIva, setNuevoAplicaIva] = useState(true);

  // Formato de moneda chilena
  const formatoMoneda = (val?: number) => {
    return `$${Math.round(val || 0).toLocaleString('es-CL')} CLP`;
  };

  // KPIs
  const totalCotizaciones = cotizaciones.length;
  const aprobadas = cotizaciones.filter((c) => c.estado === 'APROBADA').length;
  const rechazadas = cotizaciones.filter((c) => c.estado === 'RECHAZADA').length;
  const montoTotalCobrado = cotizaciones
    .filter((c) => c.estado === 'APROBADA')
    .reduce((acc, c) => acc + (c.total || 0), 0);

  // Métricas exclusivas para ADMINISTRADOR
  const promedioMargenNeto =
    userRole === 'ADMINISTRADOR'
      ? cotizaciones
          .filter((c) => c.porcentajeMargen !== undefined && c.porcentajeMargen > 0)
          .reduce((acc, c, _, arr) => acc + (c.porcentajeMargen || 0) / arr.length, 0)
      : 0;

  // Manejador: Descarga PDF
  const handleDescargarPdf = async (c: Cotizacion) => {
    try {
      setDescargandoPdfId(c.id);
      await descargarCotizacionPdf(c.id, generarNombreArchivoCotizacion(c));
    } catch (err: any) {
      alert('Error al descargar PDF: ' + (err.message || 'Error del servidor'));
    } finally {
      setDescargandoPdfId(null);
    }
  };

  // Manejador: Enviar documento por WhatsApp
  const handleEnviarWhatsApp = async (c: Cotizacion) => {
    const nombreArchivo = generarNombreArchivoCotizacion(c);

    // 1. Abrir el chat de WhatsApp ANTES de cualquier espera (await).
    //    Los navegadores solo permiten window.open inmediatamente después del clic;
    //    si se abre tras descargar el PDF (lento si el servidor está despertando),
    //    el navegador bloquea la ventana sin avisar.
    const telefono = limpiarTelefonoWhatsApp(c.ordenTrabajo?.vehiculo?.cliente?.telefono);
    const mensaje = generarMensajeCotizacionWhatsApp(c);
    const urlWsp = telefono
      ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWsp, '_blank', 'noopener,noreferrer');

    try {
      setEnviandoWspId(c.id);

      // 2. Descargar documento PDF al equipo para adjuntarlo en el chat
      const blob = await obtenerCotizacionPdfBlob(c.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Liberar la URL con retraso: revocarla de inmediato puede cancelar la descarga en Safari/Firefox
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      // 3. Si la cotización estaba en BORRADOR, ofrecer actualizar estado a ENVIADA
      if (c.estado === 'BORRADOR') {
        const esMovil =
          typeof window !== 'undefined' &&
          window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
        const instruccion = esMovil
          ? `En el chat, toca el clip 📎 → Documento y elige ${nombreArchivo} desde Descargas.`
          : `Arrástralo al chat de WhatsApp.`;
        setModalConfirmacion({
          abierto: true,
          titulo: '¿Marcar como Enviada?',
          mensaje: `Se abrió el chat con el cliente y se descargó ${nombreArchivo}. ${instruccion} ¿Deseas actualizar su estado a ENVIADA?`,
          tipo: 'GENERICO',
          textoBoton: 'Sí, marcar como ENVIADA',
          onConfirm: async () => {
            try {
              await cambiarEstadoMutation.mutateAsync({
                id: c.id,
                payload: { estado: 'ENVIADA' },
              });
              setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
            } catch (err: any) {
              alert('Error al actualizar estado: ' + (err.message || 'Error del servidor'));
            }
          },
        });
      }
    } catch (err: any) {
      alert(
        'Se abrió WhatsApp, pero no se pudo descargar el PDF: ' +
          (err.message || 'Error inesperado') +
          '. Usa el botón de descarga PDF y adjúntalo manualmente.',
      );
    } finally {
      setEnviandoWspId(null);
    }
  };

  // Manejador: Abrir Modal de Edición
  const handleAbrirEdicion = (c: Cotizacion) => {
    setCotizacionSeleccionada(c);
    setEditMotivo('');
    setEditObservaciones(c.observaciones || '');
    setEditHorasHombre(c.horasHombre || 0);
    setEditValorHora(c.valorHoraHombre || 25000);
    setEditCostoHora(c.costoHoraHombre || 12000);
    setEditDescuento(c.descuento || 0);
    setEditAplicaIva(c.aplicaIva ?? true);
    setErrorAccion(null);
    setModalDetalleAbierto(true);
  };

  // Manejador: Guardar Edición con Motivo Obligatorio
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cotizacionSeleccionada) return;

    if (!editMotivo.trim()) {
      setErrorAccion('El motivo de la modificación es obligatorio para registrar la trazabilidad de precios.');
      return;
    }

    try {
      await actualizarMutation.mutateAsync({
        id: cotizacionSeleccionada.id,
        payload: {
          motivo: editMotivo.trim(),
          observaciones: editObservaciones,
          horasHombre: editHorasHombre,
          valorHoraHombre: editValorHora,
          costoHoraHombre: userRole === 'ADMINISTRADOR' ? editCostoHora : undefined,
          descuento: editDescuento,
          aplicaIva: editAplicaIva,
        },
      });

      setModalDetalleAbierto(false);
      setCotizacionSeleccionada(null);
    } catch (err: any) {
      setErrorAccion(err.message || 'Error al actualizar cotización.');
    }
  };

  // Manejador: Cambiar Estado con Modal Integrado de la Web
  const handleCambiarEstado = (c: Cotizacion, nuevoEstado: EstadoCotizacion) => {
    if (nuevoEstado === 'APROBADA') {
      setModalConfirmacion({
        abierto: true,
        titulo: '¿Aprobar Cotización?',
        mensaje: `¿Estás seguro de dar el visto bueno a la cotización N° ${c.numero}? La Orden de Trabajo #${c.ordenTrabajoId.slice(0, 8).toUpperCase()} avanzará automáticamente a APROBADO para coordinar los trabajos mecánicos.`,
        tipo: 'APROBAR',
        textoBoton: 'Sí, Aprobar Cotización',
        onConfirm: async () => {
          try {
            await cambiarEstadoMutation.mutateAsync({
              id: c.id,
              payload: { estado: 'APROBADA' },
            });
            setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
          } catch (err: any) {
            alert('Error al aprobar cotización: ' + (err.message || 'Error del servidor'));
          }
        },
      });
    } else if (nuevoEstado === 'RECHAZADA') {
      setModalConfirmacion({
        abierto: true,
        titulo: '¿Rechazar Cotización?',
        mensaje: `¿Deseas marcar como rechazada la cotización N° ${c.numero}? La Orden de Trabajo #${c.ordenTrabajoId.slice(0, 8).toUpperCase()} volverá a DIAGNÓSTICO para su renegociación o ajuste técnico.`,
        tipo: 'RECHAZAR',
        textoBoton: 'Sí, Rechazar Cotización',
        onConfirm: async () => {
          try {
            await cambiarEstadoMutation.mutateAsync({
              id: c.id,
              payload: { estado: 'RECHAZADA' },
            });
            setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
          } catch (err: any) {
            alert('Error al rechazar cotización: ' + (err.message || 'Error del servidor'));
          }
        },
      });
    } else {
      setModalConfirmacion({
        abierto: true,
        titulo: `¿Cambiar estado a ${nuevoEstado}?`,
        mensaje: `Se actualizará el estado de la cotización N° ${c.numero} a ${nuevoEstado}.`,
        tipo: 'GENERICO',
        textoBoton: 'Aceptar',
        onConfirm: async () => {
          try {
            await cambiarEstadoMutation.mutateAsync({
              id: c.id,
              payload: { estado: nuevoEstado },
            });
            setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
          } catch (err: any) {
            alert('Error al cambiar estado: ' + (err.message || 'Error del servidor'));
          }
        },
      });
    }
  };

  // Manejador: Abrir Modal Historial
  const handleAbrirHistorial = (c: Cotizacion) => {
    setHistorialCotizacionId(c.id);
    setCotizacionSeleccionada(c);
    setModalHistorialAbierto(true);
  };

  // Manejador: Crear Cotización
  const handleCrearCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoOTId) {
      setErrorAccion('Debe seleccionar una Orden de Trabajo.');
      return;
    }

    try {
      await crearMutation.mutateAsync({
        ordenTrabajoId: nuevoOTId,
        validezDias: nuevoValidezDias,
        observaciones: nuevoObservaciones,
        horasHombre: nuevoHorasHombre,
        valorHoraHombre: nuevoValorHora,
        costoHoraHombre: userRole === 'ADMINISTRADOR' ? nuevoCostoHora : undefined,
        descuento: nuevoDescuento,
        aplicaIva: nuevoAplicaIva,
      });

      setModalNuevoAbierto(false);
      setNuevoOTId('');
      setNuevoObservaciones('');
      setNuevoDescuento(0);
    } catch (err: any) {
      setErrorAccion(err.message || 'Error al emitir cotización.');
    }
  };

  // OTs elegibles para nueva cotización (sin cotización previa o en estado diagnóstico/recibido)
  const otsElegibles = ordenes.filter(
    (ot) =>
      ot.estado === 'RECIBIDO' ||
      ot.estado === 'DIAGNOSTICO' ||
      ot.estado === 'COTIZACION',
  );

  return (
    <div className={styles.container}>
      {/* Encabezado */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Cotizaciones y Facturación</h2>
          <p className={styles.subtitle}>
            Generación de presupuestos, cálculo de margen neto y exportación de cotizaciones
          </p>
        </div>
      </div>

      {/* KPIs de Resumen */}
      <div className={styles.kpisGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Cotizaciones Emitidas</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            </svg>
          </div>
          <div className={styles.kpiValue}>{isLoading ? <Skeleton width="55%" height={28} /> : totalCotizaciones}</div>
          <div className={styles.kpiDetail}>Total de presupuestos registrados</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Aprobadas por Cliente</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className={styles.kpiValue} style={{ color: '#059669' }}>
            {isLoading ? <Skeleton width="55%" height={28} /> : aprobadas}
          </div>
          <div className={styles.kpiDetail}>Listas o en proceso de reparación</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Monto Total Aprobado</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.kpiValue}>{isLoading ? <Skeleton width="55%" height={28} /> : formatoMoneda(montoTotalCobrado)}</div>
          <div className={styles.kpiDetail}>Facturación total comprometida</div>
        </div>

        {/* Tarjeta de Rentabilidad Interna (Solo ADMINISTRADOR) */}
        {userRole === 'ADMINISTRADOR' && (
          <div className={`${styles.kpiCard} ${styles.kpiCardAdmin}`}>
            <div className={styles.kpiHeader}>
              <span>Margen Neto Taller</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div className={styles.kpiValue}>{isLoading ? <Skeleton width="55%" height={28} /> : `${promedioMargenNeto.toFixed(1)}%`}</div>
            <div className={styles.kpiDetail}>Rentabilidad neta promedio (repuestos + mano de obra)</div>
          </div>
        )}
      </div>

      {/* Pestañas Rápidas de Estado de Cotización */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '-8px' }}>
        <div className={styles.tabsGroup}>
          {ESTADOS_FILTRO.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabBtn} ${filtroEstado === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setFiltroEstado(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE COTIZACIONES (DATATABLE) */}
      <DataTable<Cotizacion>
        data={cotizaciones}
        keyExtractor={(c) => c.id}
        storageKey="cotizaciones-table-layout"
        searchPlaceholder="Buscar por folio, cliente, RUT, patente u OT..."
        loading={isLoading}
        loadingMessage="Cargando cotizaciones..."
        error={isError ? error : null}
        errorMessage={`Error al consultar cotizaciones: ${(error as any)?.message || 'Error del servidor'}`}
        onRetry={() => refetch()}
        emptyMessage="No se encontraron cotizaciones con los criterios seleccionados."
        actions={
          userRole !== 'MECANICO' ? (
            <button
              type="button"
              className={styles.btnTablePrimary}
              style={{ height: '36px', padding: '0 14px', fontSize: '12.5px' }}
              onClick={() => {
                setErrorAccion(null);
                setModalNuevoAbierto(true);
              }}
              title="Emitir nueva cotización comercial"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nueva Cotización</span>
            </button>
          ) : null
        }
        onRowClick={(c) => handleAbrirEdicion(c)}
        renderCard={(c) => {
          const badgeClass =
            c.estado === 'APROBADA'
              ? styles.statusAprobada
              : c.estado === 'RECHAZADA'
              ? styles.statusRechazada
              : c.estado === 'ENVIADA'
              ? styles.statusEnviada
              : c.estado === 'VENCIDA'
              ? styles.statusVencida
              : styles.statusBorrador;

          const clienteNombre = c.ordenTrabajo?.vehiculo?.cliente?.nombre || 'Cliente sin asignar';
          const vehiculoTexto = c.ordenTrabajo?.vehiculo
            ? `${c.ordenTrabajo.vehiculo.marca} ${c.ordenTrabajo.vehiculo.modelo} (${c.ordenTrabajo.vehiculo.patente})`
            : 'Vehículo S/I';

          return (
            <div
              key={c.id}
              className={styles.cotizacionCard}
              onClick={() => handleAbrirEdicion(c)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAbrirEdicion(c);
                }
              }}
            >
              {/* Header: Folio, Estado y OT */}
              <div className={styles.cotCardHeader}>
                <div className={styles.cotCardHeaderLeft}>
                  <span className={styles.folioBadge}>
                    COT-{String(c.numero).padStart(5, '0')}
                  </span>
                  <span className={badgeClass}>{c.estado}</span>
                </div>
                <div className={styles.cotCardHeaderRight}>
                  <span className={styles.otBadge}>
                    #{c.ordenTrabajoId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Body: Cliente y Vehículo */}
              <div className={styles.cotCardBody}>
                <div className={styles.cotCardClientRow}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.7 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className={styles.cotCardClientName}>{clienteNombre}</span>
                </div>
                <div className={styles.cotCardVehicleRow}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.7 }}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span className={styles.cotCardVehicleText}>{vehiculoTexto}</span>
                </div>

                {/* Importes y Margen */}
                <div className={styles.cotCardAmountsRow}>
                  <div className={styles.cotCardTotalBlock}>
                    <span className={styles.cotCardAmountLabel}>Total Cliente</span>
                    <span className={styles.cotCardTotalVal}>{formatoMoneda(c.total)}</span>
                  </div>
                  {userRole === 'ADMINISTRADOR' && c.porcentajeMargen !== undefined && (
                    <div className={styles.cotCardMarginBlock}>
                      <span className={styles.cotCardAmountLabel}>Margen Taller</span>
                      <div className={styles.marginBadge}>
                        <span className={(c.margenNeto || 0) >= 0 ? styles.marginValuePositivo : styles.marginValueNegativo}>
                          {formatoMoneda(c.margenNeto)}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                          {c.porcentajeMargen.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: Acciones */}
              <div className={styles.cotCardFooter}>
                <div className={styles.cotCardFooterLeft}>
                  {/* Descargar PDF */}
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnPdf}`}
                    title="Descargar PDF comercial"
                    disabled={descargandoPdfId === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDescargarPdf(c);
                    }}
                  >
                    {descargandoPdfId === c.id ? (
                      <span style={{ fontSize: '0.7rem' }}>...</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                  </button>

                  {/* Enviar por WhatsApp */}
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnWsp}`}
                    title="Enviar documento por WhatsApp"
                    disabled={enviandoWspId === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnviarWhatsApp(c);
                    }}
                  >
                    {enviandoWspId === c.id ? (
                      <span style={{ fontSize: '0.7rem' }}>...</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    )}
                  </button>

                  {/* Historial de Auditoría */}
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="Historial de cambios"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAbrirHistorial(c);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>

                  {/* Aprobar rápido */}
                  {c.estado !== 'APROBADA' && (
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                      title="Aprobar"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCambiarEstado(c, 'APROBADA');
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}

                  {/* Rechazar rápido */}
                  {c.estado !== 'RECHAZADA' && (
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      title="Rechazar"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCambiarEstado(c, 'RECHAZADA');
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className={styles.cotCardFooterRight}>
                  <span className={styles.cotCardVerMas}>
                    Ver Ficha
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          );
        }}
        columns={[
          {
            id: 'numero',
            accessor: 'numero',
            header: 'Folio',
            cell: (c) => (
              <span className={styles.folioBadge}>
                COT-{String(c.numero).padStart(5, '0')}
              </span>
            ),
            filterFn: (c, q) =>
              `cot-${String(c.numero).padStart(5, '0')}`.toLowerCase().includes(q) ||
              String(c.numero).includes(q),
          },
          {
            id: 'ordenTrabajoId',
            accessor: 'ordenTrabajoId',
            header: 'OT Asociada',
            cell: (c) => (
              <div>
                <strong>#{c.ordenTrabajoId.slice(0, 8).toUpperCase()}</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {c.ordenTrabajo?.fallaReportada?.slice(0, 28)}...
                </div>
              </div>
            ),
            filterFn: (c, q) =>
              c.ordenTrabajoId.toLowerCase().includes(q) ||
              (c.ordenTrabajo?.fallaReportada || '').toLowerCase().includes(q),
          },
          {
            id: 'cliente',
            header: 'Cliente y Vehículo',
            cell: (c) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {c.ordenTrabajo?.vehiculo?.cliente?.nombre}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {c.ordenTrabajo?.vehiculo?.marca} {c.ordenTrabajo?.vehiculo?.modelo} (
                  {c.ordenTrabajo?.vehiculo?.patente})
                </div>
              </div>
            ),
            filterFn: (c, q) => {
              const cli = (c.ordenTrabajo?.vehiculo?.cliente?.nombre || '').toLowerCase();
              const rut = (c.ordenTrabajo?.vehiculo?.cliente?.rut || '').toLowerCase();
              const pat = (c.ordenTrabajo?.vehiculo?.patente || '').toLowerCase();
              const veh = `${c.ordenTrabajo?.vehiculo?.marca || ''} ${c.ordenTrabajo?.vehiculo?.modelo || ''}`.toLowerCase();
              return cli.includes(q) || rut.includes(q) || pat.includes(q) || veh.includes(q);
            },
          },
          {
            id: 'subtotalNeto',
            accessor: 'subtotalNeto',
            header: 'Subtotal Neto',
            cell: (c) => formatoMoneda(c.subtotalNeto),
          },
          {
            id: 'iva',
            accessor: 'iva',
            header: 'IVA (19%)',
            cell: (c) => formatoMoneda(c.iva),
          },
          {
            id: 'total',
            accessor: 'total',
            header: 'Total Cliente',
            cell: (c) => (
              <strong style={{ color: 'var(--text-primary)' }}>{formatoMoneda(c.total)}</strong>
            ),
          },
          ...(userRole === 'ADMINISTRADOR'
            ? [
                {
                  id: 'margenNeto',
                  accessor: 'margenNeto' as const,
                  header: 'Margen Taller',
                  cell: (c: Cotizacion) => (
                    <div className={styles.marginBadge}>
                      <span
                        className={
                          (c.margenNeto || 0) >= 0
                            ? styles.marginValuePositivo
                            : styles.marginValueNegativo
                        }
                      >
                        {formatoMoneda(c.margenNeto)}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        {c.porcentajeMargen !== undefined
                          ? `${c.porcentajeMargen.toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                  ),
                },
              ]
            : []),
          {
            id: 'estado',
            accessor: 'estado',
            header: 'Estado',
            cell: (c) => {
              const badgeClass =
                c.estado === 'APROBADA'
                  ? styles.statusAprobada
                  : c.estado === 'RECHAZADA'
                  ? styles.statusRechazada
                  : c.estado === 'ENVIADA'
                  ? styles.statusEnviada
                  : c.estado === 'VENCIDA'
                  ? styles.statusVencida
                  : styles.statusBorrador;
              return <span className={badgeClass}>{c.estado}</span>;
            },
          },
          {
            header: 'Acciones',
            align: 'right',
            sortable: false,
            filterable: false,
            cell: (c) => (
              <div className={styles.actionButtons} style={{ justifyContent: 'flex-end' }}>
                {/* Exportar PDF */}
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnPdf}`}
                  title="Descargar PDF comercial para cliente"
                  disabled={descargandoPdfId === c.id}
                  onClick={() => handleDescargarPdf(c)}
                >
                  {descargandoPdfId === c.id ? (
                    <span style={{ fontSize: '0.7rem' }}>...</span>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                </button>

                {/* Enviar por WhatsApp */}
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnWsp}`}
                  title="Enviar documento por WhatsApp"
                  disabled={enviandoWspId === c.id}
                  onClick={() => handleEnviarWhatsApp(c)}
                >
                  {enviandoWspId === c.id ? (
                    <span style={{ fontSize: '0.7rem' }}>...</span>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  )}
                </button>

                {/* Ver / Editar */}
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="Ver detalle o modificar"
                  data-row-click="true"
                  onClick={() => handleAbrirEdicion(c)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>

                {/* Historial de Trazabilidad */}
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="Trazabilidad de cambios de precio"
                  data-prevent-row-click="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAbrirHistorial(c);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </button>

                {/* Acción rápida: Aprobar */}
                {c.estado !== 'APROBADA' && (
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                    title="Aprobar presupuesto"
                    data-prevent-row-click="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCambiarEstado(c, 'APROBADA');
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}

                {/* Acción rápida: Rechazar */}
                {c.estado !== 'RECHAZADA' && (
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    title="Marcar rechazada"
                    data-prevent-row-click="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCambiarEstado(c, 'RECHAZADA');
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* MODAL 1: DETALLE Y EDICIÓN (con trazabilidad) */}
      {modalDetalleAbierto && cotizacionSeleccionada && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h3 className={styles.modalTitle} style={{ margin: 0 }}>
                  Cotización COT-{String(cotizacionSeleccionada.numero).padStart(5, '0')}
                </h3>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnWsp}`}
                  title="Enviar documento por WhatsApp"
                  disabled={enviandoWspId === cotizacionSeleccionada.id}
                  onClick={() => handleEnviarWhatsApp(cotizacionSeleccionada)}
                >
                  {enviandoWspId === cotizacionSeleccionada.id ? (
                    <span style={{ fontSize: '0.7rem' }}>...</span>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnPdf}`}
                  title="Descargar PDF comercial para cliente"
                  disabled={descargandoPdfId === cotizacionSeleccionada.id}
                  onClick={() => handleDescargarPdf(cotizacionSeleccionada)}
                >
                  {descargandoPdfId === cotizacionSeleccionada.id ? (
                    <span style={{ fontSize: '0.7rem' }}>...</span>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalDetalleAbierto(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion}>
              <div className={styles.modalBody}>
                {errorAccion && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                    {errorAccion}
                  </div>
                )}

                {/* Datos del Cliente y Vehículo */}
                <div className={styles.infoBox}>
                  <div>
                    <span className={styles.infoLabel}>Cliente</span>
                    <span className={styles.infoValue}>
                      {cotizacionSeleccionada.ordenTrabajo.vehiculo.cliente.nombre} (
                      {cotizacionSeleccionada.ordenTrabajo.vehiculo.cliente.rut})
                    </span>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>Vehículo</span>
                    <span className={styles.infoValue}>
                      {cotizacionSeleccionada.ordenTrabajo.vehiculo.marca}{' '}
                      {cotizacionSeleccionada.ordenTrabajo.vehiculo.modelo} [
                      {cotizacionSeleccionada.ordenTrabajo.vehiculo.patente}]
                    </span>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>Estado OT</span>
                    <span className={styles.infoValue}>
                      {cotizacionSeleccionada.ordenTrabajo.estado}
                    </span>
                  </div>
                </div>

                {/* Panel de Rentabilidad Interna (Solo ADMINISTRADOR) */}
                {userRole === 'ADMINISTRADOR' && (
                  <div className={styles.profitPanel}>
                    <h4 className={styles.profitTitle}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      Rentabilidad Interna Taller (Margen Neto)
                    </h4>
                    <div className={styles.profitGrid}>
                      <div className={styles.profitItem}>
                        <span className={styles.profitLabel}>Costo Repuestos</span>
                        <span className={styles.profitAmount}>
                          {formatoMoneda(cotizacionSeleccionada.costoRepuestos)}
                        </span>
                      </div>
                      <div className={styles.profitItem}>
                        <span className={styles.profitLabel}>Costo Mano Obra</span>
                        <span className={styles.profitAmount}>
                          {formatoMoneda(cotizacionSeleccionada.costoManoObra)}
                        </span>
                      </div>
                      <div className={styles.profitItem}>
                        <span className={styles.profitLabel}>Costo Total Taller</span>
                        <span className={styles.profitAmount}>
                          {formatoMoneda(cotizacionSeleccionada.costoTotal)}
                        </span>
                      </div>
                      <div className={styles.profitItem}>
                        <span className={styles.profitLabel}>Ganancia Neta</span>
                        <span className={`${styles.profitAmount} ${styles.profitHighlight}`}>
                          {formatoMoneda(cotizacionSeleccionada.margenNeto)}
                        </span>
                      </div>
                      <div className={styles.profitItem}>
                        <span className={styles.profitLabel}>% Rentabilidad</span>
                        <span className={`${styles.profitAmount} ${styles.profitHighlight}`}>
                          {cotizacionSeleccionada.porcentajeMargen !== undefined
                            ? `${cotizacionSeleccionada.porcentajeMargen.toFixed(1)}%`
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Desglose de Partidas / Ítems */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                    Partidas en Snapshot de Cotización
                  </h4>
                  <div className={styles.modalTableWrapper}>
                    <table className={styles.modalTable}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Tipo</th>
                          <th style={{ textAlign: 'left' }}>Descripción</th>
                          <th style={{ textAlign: 'right' }}>Cant.</th>
                          <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                          <th style={{ textAlign: 'right' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cotizacionSeleccionada.items?.map((it) => (
                          <tr key={it.id}>
                            <td>{it.tipo}</td>
                            <td>{it.descripcion}</td>
                            <td style={{ textAlign: 'right' }}>{it.cantidad}</td>
                            <td style={{ textAlign: 'right' }}>
                              {formatoMoneda(it.precioUnitario)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {formatoMoneda(it.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Campos Editables */}
                <div className={styles.formGrid2Col}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Horas Hombre Estimadas
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editHorasHombre}
                      onChange={(e) => setEditHorasHombre(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Precio Cobrado por Hora (CLP)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={editValorHora}
                      onChange={(e) => setEditValorHora(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                </div>

                {userRole === 'ADMINISTRADOR' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Costo Interno Taller por Hora (CLP) - Solo Admin
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={editCostoHora}
                      onChange={(e) => setEditCostoHora(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                )}

                <div className={styles.formGrid2Col}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Descuento Comercial (CLP)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={editDescuento}
                      onChange={(e) => setEditDescuento(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
                    <input
                      type="checkbox"
                      id="editIva"
                      checked={editAplicaIva}
                      onChange={(e) => setEditAplicaIva(e.target.checked)}
                    />
                    <label htmlFor="editIva" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Aplicar IVA (19%)
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Observaciones / Términos de Garantía
                  </label>
                  <textarea
                    rows={2}
                    value={editObservaciones}
                    onChange={(e) => setEditObservaciones(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem', resize: 'vertical' }}
                  />
                </div>

                {/* Campo Obligatorio de Trazabilidad */}
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', padding: '0.85rem', borderRadius: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Motivo de la Modificación (Obligatorio para Trazabilidad) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Renegociación tras rechazo del cliente, descuento en mano de obra..."
                    value={editMotivo}
                    onChange={(e) => setEditMotivo(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Se guardará un snapshot inmutable de los valores e ítems anteriores en el historial de precios.
                  </span>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalDetalleAbierto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={actualizarMutation.isPending}
                >
                  {actualizarMutation.isPending ? 'Guardando...' : 'Guardar y Registrar Historial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HISTORIAL DE TRAZABILIDAD */}
      {modalHistorialAbierto && cotizacionSeleccionada && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Historial de Precios y Auditoría: COT-{String(cotizacionSeleccionada.numero).padStart(5, '0')}
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalHistorialAbierto(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {cargandoHistorial ? (
                <div className={styles.loadingSpinner}>Cargando historial de cambios...</div>
              ) : historial.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Esta cotización conserva su versión original (sin modificaciones registradas).</p>
                </div>
              ) : (
                <div className={styles.timeline}>
                  {historial.map((entry) => {
                    let snapshotItems: any[] = [];
                    try {
                      if (entry.detalles) {
                        const parsed = JSON.parse(entry.detalles);
                        snapshotItems = parsed.itemsAnteriores || [];
                      }
                    } catch {}

                    return (
                      <div key={entry.id} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        <div className={styles.timelineHeader}>
                          <span className={styles.timelineUser}>
                            Modificado por: {entry.usuario?.nombre || 'Usuario del Taller'} (
                            {entry.usuario?.rol || 'Rol'})
                          </span>
                          <span className={styles.timelineDate}>
                            {new Date(entry.creadoEn).toLocaleString('es-CL')}
                          </span>
                        </div>

                        <div className={styles.timelineMotivo}>
                          <strong>Motivo:</strong> {entry.motivo}
                        </div>

                        <div className={styles.timelineDeltas}>
                          <div>
                            <span className={styles.infoLabel}>Total Anterior</span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {formatoMoneda(entry.totalAnterior)}
                            </span>
                          </div>
                          <div>
                            <span className={styles.infoLabel}>Total Nuevo</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                              {formatoMoneda(entry.totalNuevo)}
                            </span>
                          </div>
                          <div>
                            <span className={styles.infoLabel}>Variación</span>
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  entry.totalNuevo - entry.totalAnterior >= 0
                                    ? '#059669'
                                    : '#dc2626',
                              }}
                            >
                              {entry.totalNuevo - entry.totalAnterior >= 0 ? '+' : ''}
                              {formatoMoneda(entry.totalNuevo - entry.totalAnterior)}
                            </span>
                          </div>
                        </div>

                        {/* Snapshot detallado de ítems anteriores */}
                        {snapshotItems.length > 0 && (
                          <details style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#475569' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0284c7' }}>
                              Ver lista de {snapshotItems.length} partida(s) de la versión anterior
                            </summary>
                            <div style={{ marginTop: '0.5rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.35rem', padding: '0.5rem' }}>
                              {snapshotItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px dashed #f1f5f9' }}>
                                  <span>{item.cantidad}x {item.descripcion}</span>
                                  <strong>{formatoMoneda(item.subtotal)}</strong>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setModalHistorialAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR COTIZACIÓN */}
      {modalNuevoAbierto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Emitir Cotización desde Orden de Trabajo</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalNuevoAbierto(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCotizacion}>
              <div className={styles.modalBody}>
                {errorAccion && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                    {errorAccion}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Seleccionar Orden de Trabajo (OT) *
                  </label>
                  <select
                    required
                    value={nuevoOTId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setNuevoOTId(selId);
                      const otObj = otsElegibles.find((o) => o.id === selId);
                      if (otObj && otObj.horasHombre && otObj.horasHombre > 0) {
                        setNuevoHorasHombre(otObj.horasHombre);
                      }
                    }}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  >
                    <option value="">-- Seleccione una OT --</option>
                    {otsElegibles.map((ot) => (
                      <option key={ot.id} value={ot.id}>
                        OT #{ot.id.slice(0, 8).toUpperCase()} - {ot.vehiculo?.cliente?.nombre} (
                        {ot.vehiculo?.patente}) - {ot.fallaReportada?.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Los repuestos asignados a la OT y horas hombre se incluirán automáticamente como un snapshot fijo.
                  </span>
                </div>

                <div className={styles.formGrid3Col}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Horas Estimadas (HH)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={nuevoHorasHombre}
                      onChange={(e) => setNuevoHorasHombre(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Valor Cobrado por HH
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={nuevoValorHora}
                      onChange={(e) => setNuevoValorHora(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Días de Validez
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={nuevoValidezDias}
                      onChange={(e) => setNuevoValidezDias(parseInt(e.target.value) || 15)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                </div>

                {userRole === 'ADMINISTRADOR' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Costo Interno Taller por Hora (CLP) - Solo Admin
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={nuevoCostoHora}
                      onChange={(e) => setNuevoCostoHora(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                )}

                <div className={styles.formGrid2Col}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Descuento Comercial (CLP)
                    </label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={nuevoDescuento}
                      onChange={(e) => setNuevoDescuento(parseFloat(e.target.value) || 0)}
                      placeholder="0 (opcional)"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
                    <input
                      type="checkbox"
                      id="nuevoIva"
                      checked={nuevoAplicaIva}
                      onChange={(e) => setNuevoAplicaIva(e.target.checked)}
                    />
                    <label htmlFor="nuevoIva" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Calcular IVA (19%)
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Observaciones y Condiciones Comerciales
                  </label>
                  <textarea
                    rows={2}
                    value={nuevoObservaciones}
                    onChange={(e) => setNuevoObservaciones(e.target.value)}
                    placeholder="Garantía de 90 días o 5.000 km. Precios en pesos chilenos..."
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.35rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalNuevoAbierto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={crearMutation.isPending}
                >
                  {crearMutation.isPending ? 'Emitiendo...' : 'Crear Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMACIÓN INTEGRADA DE LA WEB (Visto Bueno / Rechazo) */}
      {modalConfirmacion.abierto && (
        <div className={styles.modalOverlay} style={{ zIndex: 1200 }}>
          <div className={styles.confirmModalContent}>
            <div
              className={`${styles.confirmIconBox} ${
                modalConfirmacion.tipo === 'APROBAR'
                  ? styles.confirmIconBoxSuccess
                  : styles.confirmIconBoxDanger
              }`}
            >
              {modalConfirmacion.tipo === 'APROBAR' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            <h3 className={styles.confirmTitle}>{modalConfirmacion.titulo}</h3>
            <p className={styles.confirmDesc}>{modalConfirmacion.mensaje}</p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.btnCancelConfirm}
                onClick={() => setModalConfirmacion((prev) => ({ ...prev, abierto: false }))}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className={
                  modalConfirmacion.tipo === 'APROBAR'
                    ? styles.btnConfirmSuccess
                    : styles.btnConfirmDanger
                }
                disabled={cambiarEstadoMutation.isPending}
                onClick={() => modalConfirmacion.onConfirm()}
              >
                {cambiarEstadoMutation.isPending ? 'Procesando...' : modalConfirmacion.textoBoton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
