'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../../lib/api';
import styles from './ordenes-trabajo.module.css';
import {
  useOrdenesTrabajo,
  useMecanicos,
  useCrearOT,
  useCambiarEstadoOT,
  useActualizarOT,
  useRegistrarHorasOT,
  useAgregarRepuestoOT,
  useQuitarRepuestoOT,
  OrdenTrabajo,
  EstadoOT,
  Mecanico,
  DetalleOTRepuestoItem,
} from '../../hooks/ordenes-trabajo/useOrdenesTrabajo';
import { useRepuestos, Repuesto } from '../../hooks/repuestos/useRepuestos';

interface VehiculoSimple {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number | null;
  kilometraje: number | null;
  cliente: {
    id: string;
    nombre: string;
    rut: string;
    telefono: string | null;
  };
}

interface Props {
  userRole: 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';
  userId?: string;
}

const ESTADOS_OT: { id: EstadoOT; label: string; class: string }[] = [
  { id: 'RECIBIDO', label: 'Recibido', class: styles.statusRecibido },
  { id: 'DIAGNOSTICO', label: 'Diagnóstico', class: styles.statusDiagnostico },
  { id: 'COTIZACION', label: 'Cotización', class: styles.statusCotizacion },
  { id: 'APROBADO', label: 'Aprobado', class: styles.statusAprobado },
  { id: 'EN_REPARACION', label: 'En Reparación', class: styles.statusReparacion },
  { id: 'CONTROL_CALIDAD', label: 'Control Calidad', class: styles.statusCalidad },
  { id: 'ENTREGADO', label: 'Entregado', class: styles.statusEntregado },
];

const FALLAS_COMUNES = [
  { id: 'frenos', label: 'Frenos (Pastillas / Discos)', desc: 'Ruidos metálicos al frenar, pedal esponjoso o testigo encendido' },
  { id: 'aceite', label: 'Cambio de Aceite y Filtros', desc: 'Mantención preventiva regular de 10.000 km' },
  { id: 'bateria', label: 'Batería y Sistema Eléctrico', desc: 'Dificultad de arranque o descarga constante' },
  { id: 'suspension', label: 'Suspensión y Amortiguadores', desc: 'Golpeteo en baches o inestabilidad al andar' },
  { id: 'afinamiento', label: 'Afinamiento / Bujías', desc: 'Tirones en marcha, ralentí inestable, consumo alto' },
  { id: 'scanner', label: 'Scanner / Check Engine', desc: 'Lectura de códigos OBD-II por testigo motor encendido' },
  { id: 'clima', label: 'Aire Acondicionado', desc: 'Poco enfriamiento, recarga de gas o cambio filtro polen' },
  { id: 'ruido_motor', label: 'Ruido Anormal en Motor', desc: 'Traqueteo o chillido en correas de accesorios' },
];

function renderFallaIcon(id: string) {
  switch (id) {
    case 'frenos':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m4.93 4.93 4.24 4.24" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case 'aceite':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
        </svg>
      );
    case 'bateria':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="16" height="12" rx="2" />
          <path d="M22 11v4" />
          <path d="M7 11v4" />
          <path d="M11 13H5" />
        </svg>
      );
    case 'suspension':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case 'afinamiento':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'scanner':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'clima':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'ruido_motor':
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      );
  }
}

const NIVELES_COMBUSTIBLE = ['Reserva', '1/4', '1/2', '3/4', 'Lleno'];

export default function OrdenesTrabajoView({ userRole, userId }: Props) {
  const {
    data: ordenes = [],
    isLoading: loadingOTs,
    isFetching: fetchingOTs,
    isError: errorOTs,
    error: errOTs,
    refetch: refetchOTs,
  } = useOrdenesTrabajo();

  const { data: mecanicos = [] } = useMecanicos();
  const { data: repuestosData } = useRepuestos();
  const catalogoRepuestos = repuestosData?.items || [];

  const crearOTMutation = useCrearOT();
  const cambiarEstadoOTMutation = useCambiarEstadoOT();
  const actualizarOTMutation = useActualizarOT();
  const registrarHorasMutation = useRegistrarHorasOT();
  const agregarRepuestoMutation = useAgregarRepuestoOT();
  const quitarRepuestoMutation = useQuitarRepuestoOT();

  const [actualizandoEstadoId, setActualizandoEstadoId] = useState<string | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('TODAS');
  const [filtroMecanico, setFiltroMecanico] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal Crear OT
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [vehiculoSearch, setVehiculoSearch] = useState('');
  const [vehiculoResults, setVehiculoResults] = useState<VehiculoSimple[]>([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState<VehiculoSimple | null>(null);
  const [nuevaFalla, setNuevaFalla] = useState('');
  const [nuevoMecanicoId, setNuevoMecanicoId] = useState('');
  const [nuevoCombustible, setNuevoCombustible] = useState('1/2');
  const [nuevosRayones, setNuevosRayones] = useState('');
  const [nuevosValores, setNuevosValores] = useState('');
  const [nuevoKm, setNuevoKm] = useState<string>('');
  const [guardandoOT, setGuardandoOT] = useState(false);

  // Modal Técnico / Diagnóstico / Horas
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null);
  const [showTecnicoModal, setShowTecnicoModal] = useState(false);
  const [editDiagnostico, setEditDiagnostico] = useState('');
  const [editTrabajo, setEditTrabajo] = useState('');
  const [editFotos, setEditFotos] = useState<string[]>([]);
  const [nuevaFotoUrl, setNuevaFotoUrl] = useState('');
  const [horasInput, setHorasInput] = useState<string>('');
  const [comentarioHoras, setComentarioHoras] = useState<string>('');
  const [guardandoTecnico, setGuardandoTecnico] = useState(false);

  // Modal WhatsApp
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappData, setWhatsappData] = useState<{ url: string; texto: string; telefono: string } | null>(null);
  const [cargandoWhatsappId, setCargandoWhatsappId] = useState<string | null>(null);

  // Subida de archivos y visualización a detalle (Lightbox)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  // Repuestos en OT (SCRUM-23)
  const [repuestoSeleccionadoId, setRepuestoSeleccionadoId] = useState('');
  const [cantidadRepuesto, setCantidadRepuesto] = useState('1');
  const [guardandoRepuestoOT, setGuardandoRepuestoOT] = useState(false);
  const [quitandoRepuestoId, setQuitandoRepuestoId] = useState<string | null>(null);

  // Diálogo modal personalizado (reemplaza alert / confirm)
  const [dialogo, setDialogo] = useState<{
    tipo: 'success' | 'error' | 'confirm';
    titulo: string;
    mensaje: string;
    onConfirm?: () => void;
  } | null>(null);

  // Modal Ficha Integral / Detalle de OT
  const [otDetalle, setOtDetalle] = useState<OrdenTrabajo | null>(null);

  async function abrirDetalleOT(ot: OrdenTrabajo) {
    setOtDetalle(ot);
    try {
      const fresca = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${ot.id}`);
      if (fresca) {
        setOtDetalle(fresca);
      }
    } catch {
      // mantiene la existente si falla
    }
  }

  // Búsqueda de vehículos para modal
  useEffect(() => {
    if (!vehiculoSearch.trim()) {
      setVehiculoResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchWithAuth<VehiculoSimple[]>(`/vehiculos/buscar?patente=${encodeURIComponent(vehiculoSearch.trim())}`);
        setVehiculoResults(res || []);
      } catch {
        setVehiculoResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [vehiculoSearch]);

  // Manejador cambio de estado (SCRUM-12)
  async function handleCambiarEstado(otId: string, nuevoEstado: EstadoOT) {
    try {
      setActualizandoEstadoId(otId);
      const updated = await cambiarEstadoOTMutation.mutateAsync({ otId, estado: nuevoEstado });
      if (selectedOT && selectedOT.id === otId) {
        setSelectedOT(updated);
      }
      if (otDetalle && otDetalle.id === otId) {
        setOtDetalle(updated);
      }
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al actualizar estado',
        mensaje: err.message || 'No se pudo modificar el estado de la OT.',
      });
    } finally {
      setActualizandoEstadoId(null);
    }
  }

  // Crear OT (SCRUM-10, 11)
  async function handleCrearOT(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehiculo) {
      setDialogo({
        tipo: 'error',
        titulo: 'Vehículo requerido',
        mensaje: 'Debes seleccionar un vehículo para la orden.',
      });
      return;
    }
    if (!nuevaFalla.trim()) {
      setDialogo({
        tipo: 'error',
        titulo: 'Falla requerida',
        mensaje: 'Debes ingresar la falla reportada o motivo de ingreso.',
      });
      return;
    }

    try {
      setGuardandoOT(true);
      const payload: any = {
        vehiculoId: selectedVehiculo.id,
        fallaReportada: nuevaFalla.trim(),
        mecanicoId: nuevoMecanicoId || undefined,
        nivelCombustible: nuevoCombustible,
        rayonesCarroceria: nuevosRayones.trim() || undefined,
        elementosValor: nuevosValores.trim() || undefined,
        kilometrajeRecepcion: nuevoKm ? parseInt(nuevoKm, 10) : undefined,
      };

      await crearOTMutation.mutateAsync(payload);
      setShowCrearModal(false);
      resetCrearForm();
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al crear la OT',
        mensaje: err.message || 'No fue posible registrar la nueva orden de trabajo.',
      });
    } finally {
      setGuardandoOT(false);
    }
  }

  function resetCrearForm() {
    setSelectedVehiculo(null);
    setVehiculoSearch('');
    setNuevaFalla('');
    setNuevoMecanicoId('');
    setNuevoCombustible('1/2');
    setNuevosRayones('');
    setNuevosValores('');
    setNuevoKm('');
  }

  // Abrir Modal Técnico
  async function abrirModalTecnico(ot: OrdenTrabajo) {
    setSelectedOT(ot);
    setEditDiagnostico(ot.diagnostico || '');
    setEditTrabajo(ot.trabajoRealizado || '');
    setEditFotos(ot.fotosDiagnostico || []);
    setNuevaFotoUrl('');
    setHorasInput('');
    setComentarioHoras('');
    setRepuestoSeleccionadoId('');
    setCantidadRepuesto('1');
    setShowTecnicoModal(true);

    try {
      const fresca = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${ot.id}`);
      if (fresca) {
        setSelectedOT(fresca);
      }
    } catch {
      // mantener estado actual si falla fetch
    }
  }

  // SCRUM-23: Agregar Repuesto a la OT con descuento automático
  async function handleAgregarRepuestoOT() {
    if (!selectedOT || !repuestoSeleccionadoId) return;
    const cant = parseInt(cantidadRepuesto, 10);
    if (isNaN(cant) || cant <= 0) {
      setDialogo({
        tipo: 'error',
        titulo: 'Cantidad inválida',
        mensaje: 'Debes ingresar una cantidad mayor a cero.',
      });
      return;
    }

    const item = catalogoRepuestos.find((r) => r.id === repuestoSeleccionadoId);
    if (!item) return;

    if (item.stock < cant) {
      setDialogo({
        tipo: 'error',
        titulo: 'Stock insuficiente',
        mensaje: `No hay suficiente stock para [${item.codigo}] "${item.nombre}". Disponible: ${item.stock} uds, Solicitado: ${cant} uds.`,
      });
      return;
    }

    try {
      setGuardandoRepuestoOT(true);
      await agregarRepuestoMutation.mutateAsync({
        otId: selectedOT.id,
        repuestoId: repuestoSeleccionadoId,
        cantidad: cant,
      });

      // Refrescar OT seleccionada en modal
      const otActualizada = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${selectedOT.id}`);
      if (otActualizada) {
        setSelectedOT(otActualizada);
      }

      setRepuestoSeleccionadoId('');
      setCantidadRepuesto('1');

      setDialogo({
        tipo: 'success',
        titulo: 'Repuesto Asociado',
        mensaje: `Se asociaron ${cant} ud(s) de "${item.nombre}" a la OT y se descontaron del inventario.`,
      });
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al agregar repuesto',
        mensaje: err.message || 'No fue posible asociar el repuesto a la OT.',
      });
    } finally {
      setGuardandoRepuestoOT(false);
    }
  }

  // SCRUM-23: Quitar Repuesto de la OT con restitución automática de stock
  function solicitarQuitarRepuesto(detalle: DetalleOTRepuestoItem) {
    setDialogo({
      tipo: 'confirm',
      titulo: 'Confirmar Devolución al Stock',
      mensaje: `¿Deseas retirar "${detalle.repuesto.nombre}" (${detalle.cantidad} uds) de esta OT? Se reintegrarán automáticamente +${detalle.cantidad} unidades al stock del inventario.`,
      onConfirm: () => ejecutarQuitarRepuesto(detalle.id),
    });
  }

  async function ejecutarQuitarRepuesto(detalleId: string) {
    if (!selectedOT) return;
    try {
      setQuitandoRepuestoId(detalleId);
      await quitarRepuestoMutation.mutateAsync({
        otId: selectedOT.id,
        repuestoId: detalleId,
      });

      // Refrescar OT seleccionada en modal
      const otActualizada = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${selectedOT.id}`);
      if (otActualizada) {
        setSelectedOT(otActualizada);
      }

      setDialogo({
        tipo: 'success',
        titulo: 'Stock Reintegrado',
        mensaje: 'El repuesto fue retirado de la OT y las unidades se devolvieron exitosamente al inventario.',
      });
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al quitar repuesto',
        mensaje: err.message || 'No se pudo retirar el repuesto.',
      });
    } finally {
      setQuitandoRepuestoId(null);
    }
  }

  // Comprimir imagen localmente a HD WebP/JPEG optimizado (~70KB)
  function comprimirImagen(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Manejar selección de archivos desde PC o Galería de Celular
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setProcesandoFotos(true);
      const nuevasFotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const dataUrl = await comprimirImagen(file);
          nuevasFotos.push(dataUrl);
        }
      }
      setEditFotos((prev) => [...prev, ...nuevasFotos]);
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al procesar fotos',
        mensaje: 'Error al procesar imágenes: ' + err.message,
      });
    } finally {
      setProcesandoFotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Guardar Técnico (SCRUM-13, 19)
  async function handleGuardarTecnico() {
    if (!selectedOT) return;
    try {
      setGuardandoTecnico(true);
      await actualizarOTMutation.mutateAsync({
        otId: selectedOT.id,
        data: {
          diagnostico: editDiagnostico,
          trabajoRealizado: editTrabajo,
          fotosDiagnostico: editFotos,
        },
      });

      // Si se ingresaron horas
      if (horasInput && parseFloat(horasInput) > 0) {
        await registrarHorasMutation.mutateAsync({
          otId: selectedOT.id,
          horas: parseFloat(horasInput),
          comentario: comentarioHoras || undefined,
        });
      }

      const finalOT = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${selectedOT.id}`);
      if (finalOT) {
        setSelectedOT(finalOT);
      }
      setShowTecnicoModal(false);
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al guardar diagnóstico',
        mensaje: err.message || 'No fue posible guardar los cambios.',
      });
    } finally {
      setGuardandoTecnico(false);
    }
  }

  // Generar WhatsApp (SCRUM-20)
  async function handleGenerarWhatsapp(otId: string) {
    try {
      setCargandoWhatsappId(otId);
      const data = await fetchWithAuth<{ url: string; texto: string; telefono: string }>(
        `/ordenes-trabajo/${otId}/whatsapp`
      );
      setWhatsappData(data);
      setShowWhatsappModal(true);
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error de WhatsApp',
        mensaje: err.message || 'No se pudo generar el enlace de WhatsApp.',
      });
    } finally {
      setCargandoWhatsappId(null);
    }
  }

  // Filtrado de OTs en memoria
  const ordenesFiltradas = ordenes.filter((ot) => {
    if (filtroEstado !== 'TODAS' && ot.estado !== filtroEstado) return false;
    if (filtroMecanico !== 'TODOS') {
      if (filtroMecanico === 'SIN_ASIGNAR' && ot.mecanicoId) return false;
      if (filtroMecanico !== 'SIN_ASIGNAR' && ot.mecanicoId !== filtroMecanico) return false;
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const patenteMatch = ot.vehiculo.patente.toLowerCase().includes(q);
      const clienteMatch = ot.vehiculo.cliente.nombre.toLowerCase().includes(q);
      const fallaMatch = ot.fallaReportada.toLowerCase().includes(q);
      const modeloMatch = `${ot.vehiculo.marca} ${ot.vehiculo.modelo}`.toLowerCase().includes(q);
      if (!patenteMatch && !clienteMatch && !fallaMatch && !modeloMatch) return false;
    }
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Encabezado y Acciones */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.headerTitle}>
            <span>Órdenes de Trabajo (OT)</span>
            {fetchingOTs && !loadingOTs && (
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal', marginLeft: '10px' }}>
                Actualizando...
              </span>
            )}
          </h2>
          <p className={styles.headerSubtitle}>
            {userRole === 'MECANICO'
              ? 'Bandeja de órdenes asignadas: diagnóstico técnico, fotos y registro de horas hombre'
              : 'Recepción, diagnóstico técnico, registro de horas y trazabilidad en taller'}
          </p>
        </div>

        <div className={styles.toolbarActions}>
          {userRole !== 'MECANICO' && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                resetCrearForm();
                setShowCrearModal(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nueva Orden de Trabajo</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por patente, cliente o falla..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className={styles.filterControls}>
            {userRole !== 'MECANICO' ? (
              <select
                className={styles.selectInput}
                value={filtroMecanico}
                onChange={(e) => setFiltroMecanico(e.target.value)}
              >
                <option value="TODOS">Todos los mecánicos</option>
                <option value="SIN_ASIGNAR">Sin asignar</option>
                {mecanicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    Mecánico: {m.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Mis Órdenes Asignadas</span>
              </div>
            )}
          </div>
        </div>

        {/* Pestañas de Estado (Filtro Rápido) */}
        <div className={styles.statusTabs}>
          <button
            type="button"
            className={`${styles.statusTab} ${filtroEstado === 'TODAS' ? styles.statusTabActive : ''}`}
            onClick={() => setFiltroEstado('TODAS')}
          >
            <span>Todas</span>
            <span className={styles.tabCountBadge}>{ordenes.length}</span>
          </button>
          {ESTADOS_OT.map((est) => {
            const count = ordenes.filter((o) => o.estado === est.id).length;
            return (
              <button
                key={est.id}
                type="button"
                className={`${styles.statusTab} ${filtroEstado === est.id ? styles.statusTabActive : ''}`}
                onClick={() => setFiltroEstado(est.id)}
              >
                <span>{est.label}</span>
                <span className={styles.tabCountBadge}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido Principal: Listado de Tarjetas */}
      {errorOTs ? (
        <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#b91c1c' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong style={{ display: 'block', fontSize: '14px' }}>Error al cargar Órdenes de Trabajo</strong>
              <span style={{ fontSize: '12px' }}>{(errOTs as any)?.message || 'No fue posible conectar con el servidor.'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetchOTs()}
            style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      ) : loadingOTs ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Cargando órdenes de trabajo...
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <h4 className={styles.emptyStateTitle}>No se encontraron órdenes de trabajo</h4>
          <p>
            {busqueda || filtroEstado !== 'TODAS'
              ? 'Prueba modificando los filtros de búsqueda.'
              : 'Aún no hay órdenes registradas. Haz clic en "+ Nueva Orden de Trabajo" para ingresar una.'}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {ordenesFiltradas.map((ot) => {
            const estadoObj = ESTADOS_OT.find((e) => e.id === ot.estado) || ESTADOS_OT[0];
            const estadoIdx = ESTADOS_OT.findIndex((e) => e.id === ot.estado);

            return (
              <div
                key={ot.id}
                className={styles.otCard}
                onClick={() => abrirDetalleOT(ot)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    abrirDetalleOT(ot);
                  }
                }}
                title="Haz clic para ver la ficha completa de la orden"
              >
                {/* Cabecera Tarjeta: Código y Estado */}
                <div className={styles.otCardHeader}>
                  <span className={styles.otCodeBadge}>OT #{ot.id.slice(0, 8).toUpperCase()}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {actualizandoEstadoId === ot.id ? (
                      <span className={styles.statusBadgeLoading}>
                        <span className={styles.spinner} />
                        <span>Actualizando...</span>
                      </span>
                    ) : (
                      <span className={`${styles.statusBadge} ${estadoObj.class}`}>
                        {estadoObj.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Vehículo y Cliente */}
                <div className={styles.vehicleInfoRow}>
                  <div>
                    <h4 className={styles.vehicleModelText}>
                      {ot.vehiculo.marca} {ot.vehiculo.modelo} {ot.vehiculo.anio ? `(${ot.vehiculo.anio})` : ''}
                    </h4>
                    <p className={styles.clientText}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>{ot.vehiculo.cliente.nombre}</span>
                    </p>
                  </div>
                  <div className={styles.plateBadge}>
                    <img src="/assets/chile-flag.svg" alt="CL" className={styles.plateFlag} onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <span>{ot.vehiculo.patente}</span>
                  </div>
                </div>

                {/* Falla Reportada */}
                <div className={styles.fallaBox}>
                  <strong>Motivo:</strong> {ot.fallaReportada}
                </div>

                {/* Barra de progreso de ciclo de vida */}
                <div className={styles.progressStepper} title={`Progreso: paso ${estadoIdx + 1} de 7`}>
                  {ESTADOS_OT.map((est, idx) => (
                    <div
                      key={est.id}
                      className={`${styles.stepSegment} ${
                        idx < estadoIdx
                          ? styles.stepSegmentDone
                          : idx === estadoIdx
                          ? styles.stepSegmentCurrent
                          : ''
                      }`}
                    />
                  ))}
                </div>

                {/* Metadatos: Mecánico, Horas y Checklist */}
                <div className={styles.metaDetails}>
                  <div className={styles.mecanicoPill}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>{ot.mecanico ? ot.mecanico.nombre : 'Sin asignar'}</span>
                  </div>

                  <div className={styles.hoursPill} title="Horas-hombre invertidas">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{ot.horasHombre || 0} hrs</span>
                  </div>

                  {ot.detalleRepuestos && ot.detalleRepuestos.length > 0 && (
                    <div
                      className={styles.repuestosOTBadge}
                      title={`${ot.detalleRepuestos.length} repuesto(s) asignados. Total: $${ot.detalleRepuestos.reduce((acc, d) => acc + d.cantidad * d.precioUnitario, 0).toLocaleString('es-CL')}. Clic para gestionar.`}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalTecnico(ot);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                      <span>
                        {ot.detalleRepuestos.length} rep. (${ot.detalleRepuestos.reduce((acc, d) => acc + d.cantidad * d.precioUnitario, 0).toLocaleString('es-CL')})
                      </span>
                    </div>
                  )}

                  {ot.fotosDiagnostico && ot.fotosDiagnostico.length > 0 && (
                    <div
                      className={styles.hoursPill}
                      style={{ background: '#f0fdf4', color: '#166534', cursor: 'pointer' }}
                      title={`${ot.fotosDiagnostico.length} foto(s) de diagnóstico. Clic para ver`}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalTecnico(ot);
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>{ot.fotosDiagnostico.length} fotos</span>
                    </div>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className={styles.cardActions}>
                  {/* Selector rápido de estado con indicador de carga */}
                  <div className={styles.selectWrapper} onClick={(e) => e.stopPropagation()}>
                    <select
                      className={styles.selectInput}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                      value={ot.estado}
                      disabled={actualizandoEstadoId === ot.id}
                      onChange={(e) => handleCambiarEstado(ot.id, e.target.value as EstadoOT)}
                    >
                      {ESTADOS_OT.map((est) => (
                        <option key={est.id} value={est.id}>
                          {est.label}
                        </option>
                      ))}
                    </select>
                    {actualizandoEstadoId === ot.id && (
                      <div className={styles.selectLoadingOverlay}>
                        <span className={styles.spinner} />
                        <span>Guardando...</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.btnActionSecondary}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirModalTecnico(ot);
                    }}
                    title="Diagnóstico, fotos y registro de horas"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Diagnóstico & Fotos</span>
                  </button>

                  <button
                    type="button"
                    className={styles.btnWhatsApp}
                    disabled={cargandoWhatsappId === ot.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerarWhatsapp(ot.id);
                    }}
                    title="Notificar avance o cotización por WhatsApp"
                  >
                    {cargandoWhatsappId === ot.id ? (
                      <>
                        <span
                          className={styles.spinner}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderWidth: '2px',
                            borderColor: '#a7f3d0',
                            borderTopColor: '#047857',
                          }}
                        />
                        <span>Cargando...</span>
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span>WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Pista visual para abrir ficha */}
                <div className={styles.otCardHint}>
                  <span>Ver ficha completa</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREAR ORDEN DE TRABAJO (SCRUM-10, 11, 21) */}
      {showCrearModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCrearModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Nueva Orden de Trabajo (Ingreso Vehículo)</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowCrearModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearOT}>
              <div className={styles.modalBody}>
                {/* Paso 1: Selección de Vehículo */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    1. Vehículo del Cliente *
                    {selectedVehiculo && (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}
                        onClick={() => setSelectedVehiculo(null)}
                      >
                        Cambiar vehículo
                      </button>
                    )}
                  </label>

                  {selectedVehiculo ? (
                    <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{selectedVehiculo.marca} {selectedVehiculo.modelo}</strong> ({selectedVehiculo.anio || 'Año S/I'})
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Propietario: {selectedVehiculo.cliente.nombre} | RUT: {selectedVehiculo.cliente.rut}
                        </div>
                      </div>
                      <span className={styles.plateBadge}>{selectedVehiculo.patente}</span>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Buscar por patente o modelo (ej: AA1000, Sail, Yaris)..."
                        value={vehiculoSearch}
                        onChange={(e) => setVehiculoSearch(e.target.value)}
                        autoFocus
                      />
                      {vehiculoResults.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px',
                          marginTop: '4px', zIndex: 50, maxHeight: '200px', overflowY: 'auto',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }}>
                          {vehiculoResults.map((v) => (
                            <div
                              key={v.id}
                              style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedVehiculo(v);
                                setVehiculoSearch('');
                                setVehiculoResults([]);
                                if (v.kilometraje) setNuevoKm(v.kilometraje.toString());
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>{v.patente}</strong>
                                <span>{v.marca} {v.modelo}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Cliente: {v.cliente.nombre}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Kilometraje de Ingreso */}
                <div className={styles.rowTwoCols}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Kilometraje de Recepción</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="Ej: 115000"
                      value={nuevoKm}
                      onChange={(e) => setNuevoKm(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Mecánico Asignado</label>
                    <select
                      className={styles.formSelect}
                      value={nuevoMecanicoId}
                      onChange={(e) => setNuevoMecanicoId(e.target.value)}
                    >
                      <option value="">-- Asignar después --</option>
                      {mecanicos.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Paso 2: Selector Visual de Fallas Preconfiguradas (SCRUM-21) */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    2. Falla Reportada / Motivo de Ingreso *
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Clic en atajo para acelerar ingreso</span>
                  </label>

                  <div className={styles.chipsContainer}>
                    {FALLAS_COMUNES.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={styles.faultChip}
                        onClick={() => {
                          setNuevaFalla((prev) =>
                            prev ? `${prev}. ${f.label}: ${f.desc}` : `${f.label}: ${f.desc}`
                          );
                        }}
                        title={f.desc}
                      >
                        {renderFallaIcon(f.id)}
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    className={styles.formTextarea}
                    placeholder="Detalle los síntomas descritos por el cliente..."
                    value={nuevaFalla}
                    onChange={(e) => setNuevaFalla(e.target.value)}
                    required
                  />
                </div>

                {/* Paso 3: Checklist de Recepción (SCRUM-11) */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>3. Checklist de Recepción</label>

                  {/* Nivel de Combustible */}
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Nivel de Combustible:</span>
                    <div className={styles.fuelSelector}>
                      {NIVELES_COMBUSTIBLE.map((nivel) => (
                        <button
                          key={nivel}
                          type="button"
                          className={`${styles.fuelOption} ${
                            nuevoCombustible === nivel ? styles.fuelOptionActive : ''
                          }`}
                          onClick={() => setNuevoCombustible(nivel)}
                        >
                          {nivel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rayones / Chapa */}
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Estado de Carrocería / Rayones:</span>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ej: Rayón puerta copiloto, choque leve parachoques trasero..."
                      value={nuevosRayones}
                      onChange={(e) => setNuevosRayones(e.target.value)}
                      style={{ marginTop: '4px' }}
                    />
                  </div>

                  {/* Elementos de Valor */}
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Elementos de Valor / Accesorios dejados:</span>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ej: Rueda de repuesto, gata hidráulica, radio, documentos al día..."
                      value={nuevosValores}
                      onChange={(e) => setNuevosValores(e.target.value)}
                      style={{ marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnActionSecondary}
                  onClick={() => setShowCrearModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={guardandoOT}
                >
                  {guardandoOT ? 'Guardando...' : 'Crear Orden de Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TÉCNICO - DIAGNÓSTICO, HORAS Y FOTOS (SCRUM-13, 19) */}
      {showTecnicoModal && selectedOT && (
        <div className={styles.modalOverlay} onClick={() => setShowTecnicoModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Diagnóstico & Seguimiento Técnico</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  OT #{selectedOT.id.slice(0, 8).toUpperCase()} | {selectedOT.vehiculo.patente} ({selectedOT.vehiculo.marca} {selectedOT.vehiculo.modelo})
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowTecnicoModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Resumen Checklist */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span><strong>Combustible:</strong> {selectedOT.nivelCombustible || 'No registrado'}</span>
                  <span><strong>Km Recepción:</strong> {selectedOT.kilometrajeRecepcion ? `${selectedOT.kilometrajeRecepcion.toLocaleString('es-CL')} km` : 'S/I'}</span>
                </div>
                <div><strong>Carrocería:</strong> {selectedOT.rayonesCarroceria || 'Sin observaciones'}</div>
                <div><strong>Elementos de Valor:</strong> {selectedOT.elementosValor || 'Sin elementos'}</div>
              </div>

              {/* Registro de Horas Invertidas (SCRUM-13) */}
              <div className={styles.formGroup} style={{ background: '#eff6ff', padding: '14px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.formLabel} style={{ color: '#1e3a8a', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Registro de Horas-Hombre (Mecánico)</span>
                  </label>
                  <strong style={{ fontSize: '14px', color: '#1e40af' }}>
                    Total actual: {selectedOT.horasHombre || 0} hrs
                  </strong>
                </div>

                <div className={styles.hoursButtonsRow}>
                  <span style={{ fontSize: '12px', color: '#1e40af' }}>Atajo rápido:</span>
                  {[0.5, 1, 1.5, 2, 3].map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={styles.hourQuickBtn}
                      onClick={() => setHorasInput(h.toString())}
                    >
                      +{h}h
                    </button>
                  ))}
                </div>

                <div className={styles.rowTwoCols} style={{ marginTop: '8px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className={styles.formInput}
                    placeholder="Horas a sumar (ej: 1.5)"
                    value={horasInput}
                    onChange={(e) => setHorasInput(e.target.value)}
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Comentario / tarea realizada (opcional)"
                    value={comentarioHoras}
                    onChange={(e) => setComentarioHoras(e.target.value)}
                  />
                </div>
              </div>

              {/* Diagnóstico Técnico */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Diagnóstico Técnico</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Detalle el diagnóstico realizado (fallas encontradas, componentes afectados)..."
                  value={editDiagnostico}
                  onChange={(e) => setEditDiagnostico(e.target.value)}
                />
              </div>

              {/* Trabajo Realizado / Bitácora */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Trabajo Realizado / Bitácora de Reparación</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Detalle las reparaciones efectuadas, repuestos instalados..."
                  value={editTrabajo}
                  onChange={(e) => setEditTrabajo(e.target.value)}
                />
              </div>

              {/* Repuestos y Materiales Utilizados (SCRUM-23) */}
              <div className={styles.repuestosSection}>
                <div className={styles.repuestosHeader}>
                  <h4 className={styles.repuestosTitle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span>Repuestos y Materiales Utilizados ({selectedOT.detalleRepuestos?.length || 0})</span>
                  </h4>
                  {selectedOT.detalleRepuestos && selectedOT.detalleRepuestos.length > 0 && (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                      Total: ${selectedOT.detalleRepuestos.reduce((acc, d) => acc + d.cantidad * d.precioUnitario, 0).toLocaleString('es-CL')}
                    </span>
                  )}
                </div>

                {/* Tabla de repuestos ya asignados */}
                {selectedOT.detalleRepuestos && selectedOT.detalleRepuestos.length > 0 ? (
                  <div className={styles.repuestosTableWrapper}>
                    <table className={styles.repuestosTable}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Descripción</th>
                          <th style={{ textAlign: 'center' }}>Cant.</th>
                          <th style={{ textAlign: 'right' }}>P. Unitario</th>
                          <th style={{ textAlign: 'right' }}>Subtotal</th>
                          <th style={{ textAlign: 'center', width: '50px' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOT.detalleRepuestos.map((d) => (
                          <tr key={d.id}>
                            <td>
                              <span className={styles.repuestoCodeBadge}>{d.repuesto.codigo}</span>
                            </td>
                            <td>
                              <strong>{d.repuesto.nombre}</strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>{d.cantidad}</td>
                            <td style={{ textAlign: 'right' }}>${d.precioUnitario.toLocaleString('es-CL')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${(d.cantidad * d.precioUnitario).toLocaleString('es-CL')}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={styles.btnDeleteRepuesto}
                                disabled={quitandoRepuestoId === d.id}
                                onClick={() => solicitarQuitarRepuesto(d)}
                                title="Quitar repuesto y reintegrar al inventario"
                              >
                                {quitandoRepuestoId === d.id ? (
                                  <span className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                                ) : (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
                    Aún no se han asociado repuestos a esta orden de trabajo.
                  </div>
                )}

                {/* Formulario para asociar repuesto desde el inventario */}
                <div className={styles.repuestoAddForm}>
                  <div className={styles.repuestoSelectWrapper}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Seleccionar Repuesto del Almacén:
                    </label>
                    <select
                      className={styles.formSelect}
                      value={repuestoSeleccionadoId}
                      onChange={(e) => {
                        setRepuestoSeleccionadoId(e.target.value);
                        setCantidadRepuesto('1');
                      }}
                      style={{ fontSize: '13px' }}
                    >
                      <option value="">-- Seleccione un repuesto para asociar --</option>
                      {catalogoRepuestos.map((r) => {
                        const disponible = r.stock > 0;
                        return (
                          <option key={r.id} value={r.id} disabled={!disponible}>
                            [{r.codigo}] {r.nombre} — {disponible ? `Stock: ${r.stock} uds` : 'AGOTADO'} — ${r.precioVenta.toLocaleString('es-CL')}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className={styles.repuestoQtyWrapper}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Cantidad:
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={styles.formInput}
                      value={cantidadRepuesto}
                      onChange={(e) => setCantidadRepuesto(e.target.value)}
                      style={{ fontSize: '13px', textAlign: 'center' }}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.btnAddRepuesto}
                    disabled={
                      !repuestoSeleccionadoId ||
                      guardandoRepuestoOT ||
                      parseInt(cantidadRepuesto, 10) <= 0 ||
                      isNaN(parseInt(cantidadRepuesto, 10))
                    }
                    onClick={handleAgregarRepuestoOT}
                  >
                    {guardandoRepuestoOT ? (
                      <>
                        <span className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                        <span>Descontando...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Añadir a OT</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subtotal estimado en vivo */}
                {repuestoSeleccionadoId && (() => {
                  const sel = catalogoRepuestos.find((r) => r.id === repuestoSeleccionadoId);
                  const cant = parseInt(cantidadRepuesto, 10) || 0;
                  if (!sel) return null;
                  const superado = cant > sel.stock;
                  return (
                    <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: superado ? '#dc2626' : '#475569', marginTop: '2px' }}>
                      <span>
                        Stock en almacén: <strong>{sel.stock} uds</strong>
                        {superado && ' (¡Excede el stock disponible!)'}
                      </span>
                      <span>
                        Subtotal a sumar: <strong>${(cant * sel.precioVenta).toLocaleString('es-CL')}</strong>
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Fotografías del Diagnóstico (SCRUM-19) */}
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.formLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Fotografías del Diagnóstico ({editFotos.length})</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Clic en foto para ver a detalle</span>
                </div>

                {/* Input nativo de archivo para PC y Galería/Cámara de celular */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />

                <div className={styles.photoActionsRow}>
                  <button
                    type="button"
                    className={styles.btnUploadFile}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={procesandoFotos}
                    title="Subir fotos desde el computador o galería/cámara del celular"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{procesandoFotos ? 'Procesando imágenes...' : 'Subir desde PC o Celular'}</span>
                  </button>

                  <div className={styles.urlInputRow}>
                    <input
                      type="url"
                      className={styles.formInput}
                      style={{ flex: 1 }}
                      placeholder="O pegar URL de fotografía..."
                      value={nuevaFotoUrl}
                      onChange={(e) => setNuevaFotoUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.btnActionSecondary}
                      onClick={() => {
                        if (nuevaFotoUrl.trim()) {
                          setEditFotos((prev) => [...prev, nuevaFotoUrl.trim()]);
                          setNuevaFotoUrl('');
                        }
                      }}
                    >
                      + Agregar URL
                    </button>
                  </div>
                </div>

                {editFotos.length > 0 && (
                  <div className={styles.photosGrid}>
                    {editFotos.map((url, idx) => (
                      <div
                        key={idx}
                        className={styles.photoThumbnailWrapper}
                        onClick={() => setFotoAmpliada(url)}
                        title="Clic para maximizar y ver a detalle"
                      >
                        <img
                          src={url}
                          alt={`Diagnóstico ${idx + 1}`}
                          className={styles.photoThumbnail}
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/150?text=Foto+No+Disponible';
                          }}
                        />
                        <div className={styles.photoZoomBadge}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                          </svg>
                          <span>Ver</span>
                        </div>
                        <button
                          type="button"
                          className={styles.photoDeleteBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditFotos((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnActionSecondary}
                onClick={() => setShowTecnicoModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleGuardarTecnico}
                disabled={guardandoTecnico}
              >
                {guardandoTecnico ? 'Guardando...' : 'Guardar Diagnóstico y Horas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NOTIFICACIÓN POR WHATSAPP (SCRUM-20) */}
      {showWhatsappModal && whatsappData && (
        <div className={styles.modalOverlay} onClick={() => setShowWhatsappModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <h3 style={{ margin: 0 }}>Notificación al Cliente (WhatsApp)</h3>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowWhatsappModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '13px', color: '#065f46', marginBottom: '8px' }}>
                  <strong>Destinatario:</strong> +{whatsappData.telefono || 'Sin número definido'}
                </div>
                <div style={{
                  background: '#ffffff',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #d1fae5',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  whiteSpace: 'pre-wrap',
                  color: '#1f2937',
                  lineHeight: '1.5',
                }}>
                  {whatsappData.texto}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Al hacer clic en el botón, se abrirá WhatsApp Web o la aplicación móvil de WhatsApp con el mensaje ya redactado y listo para enviar.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnActionSecondary}
                onClick={() => setShowWhatsappModal(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className={styles.btnWhatsApp}
                style={{ padding: '10px 18px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => window.open(whatsappData.url, '_blank')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span>Abrir WhatsApp y Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FICHA INTEGRAL DE ORDEN DE TRABAJO (DETALLE COMPLETO) */}
      {otDetalle && (() => {
        const otInfo = ordenes.find((o) => o.id === otDetalle.id) || otDetalle;
        const estadoObj = ESTADOS_OT.find((e) => e.id === otInfo.estado) || ESTADOS_OT[0];
        const estadoIdx = ESTADOS_OT.findIndex((e) => e.id === otInfo.estado);
        const totalRepuestos = (otInfo.detalleRepuestos || []).reduce(
          (acc, item) => acc + item.cantidad * item.precioUnitario,
          0
        );

        return (
          <div className={styles.modalOverlay} onClick={() => setOtDetalle(null)}>
            <div className={styles.modalContentLarge} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <h3 style={{ margin: 0 }}>Ficha Integral de Orden de Trabajo</h3>
                  </div>
                  <span className={styles.otCodeBadge}>OT #{otInfo.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`${styles.statusBadge} ${estadoObj.class}`}>
                    {estadoObj.label}
                  </span>
                  <div className={styles.plateBadge}>
                    <img src="/assets/chile-flag.svg" alt="CL" className={styles.plateFlag} onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <span>{otInfo.vehiculo.patente}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setOtDetalle(null)}
                  title="Cerrar ficha"
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Stepper de ciclo de vida */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Estado del Vehículo en Taller
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                      Etapa {estadoIdx + 1} de 7: {estadoObj.label}
                    </span>
                  </div>
                  <div className={styles.stepperDetail}>
                    {ESTADOS_OT.map((est, idx) => {
                      const isDone = idx < estadoIdx;
                      const isCurrent = idx === estadoIdx;
                      return (
                        <div key={est.id} className={styles.stepperDetailItem}>
                          <div
                            className={`${styles.stepperDetailBar} ${
                              isDone
                                ? styles.stepperDetailBarDone
                                : isCurrent
                                ? styles.stepperDetailBarCurrent
                                : ''
                            }`}
                          />
                          <span
                            className={`${styles.stepperDetailText} ${
                              isCurrent ? styles.stepperDetailTextCurrent : ''
                            }`}
                          >
                            {est.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grid 2 Columnas: Cliente/Vehículo y Checklist de Recepción */}
                <div className={styles.detalleGrid}>
                  {/* Tarjeta 1: Cliente & Vehículo */}
                  <div className={styles.detalleCard}>
                    <h4 className={styles.detalleCardTitle}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" />
                        <circle cx="17" cy="17" r="2" />
                      </svg>
                      <span>Vehículo y Propietario</span>
                    </h4>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Vehículo:</span>
                      <span className={styles.detalleInfoValue}>
                        {otInfo.vehiculo.marca} {otInfo.vehiculo.modelo} {otInfo.vehiculo.anio ? `(${otInfo.vehiculo.anio})` : ''}
                      </span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Patente:</span>
                      <span className={styles.detalleInfoValue} style={{ fontFamily: 'monospace' }}>
                        {otInfo.vehiculo.patente}
                      </span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Cliente / Titular:</span>
                      <span className={styles.detalleInfoValue}>{otInfo.vehiculo.cliente.nombre}</span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>RUT:</span>
                      <span className={styles.detalleInfoValue}>{otInfo.vehiculo.cliente.rut}</span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Teléfono:</span>
                      <span className={styles.detalleInfoValue}>
                        {otInfo.vehiculo.cliente.telefono ? `+${otInfo.vehiculo.cliente.telefono}` : 'Sin teléfono registrado'}
                      </span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Correo Electrónico:</span>
                      <span className={styles.detalleInfoValue}>
                        {otInfo.vehiculo.cliente.email || 'Sin correo registrado'}
                      </span>
                    </div>
                  </div>

                  {/* Tarjeta 2: Checklist e Inspección de Recepción */}
                  <div className={styles.detalleCard}>
                    <h4 className={styles.detalleCardTitle}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <span>Checklist de Ingreso</span>
                    </h4>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Kilometraje al Ingreso:</span>
                      <span className={styles.detalleInfoValue}>
                        {otInfo.kilometrajeRecepcion !== null && otInfo.kilometrajeRecepcion !== undefined
                          ? `${otInfo.kilometrajeRecepcion.toLocaleString('es-CL')} km`
                          : otInfo.vehiculo.kilometraje
                          ? `${otInfo.vehiculo.kilometraje.toLocaleString('es-CL')} km`
                          : 'No registrado'}
                      </span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Nivel de Combustible:</span>
                      <span className={styles.fuelBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 22h12M4 9h10M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
                        </svg>
                        <span>{otInfo.nivelCombustible || 'No indicado'}</span>
                      </span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Fecha de Recepción:</span>
                      <span className={styles.detalleInfoValue}>
                        {new Date(otInfo.fechaRecepcion).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className={styles.detalleInfoRow}>
                      <span className={styles.detalleInfoLabel}>Fecha de Entrega:</span>
                      <span className={styles.detalleInfoValue}>
                        {otInfo.fechaEntrega
                          ? new Date(otInfo.fechaEntrega).toLocaleString('es-CL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Pendiente de entrega'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                      <span className={styles.detalleInfoLabel}>Rayones / Daños Carrocería:</span>
                      <span style={{ fontSize: '12px', color: '#334155', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        {otInfo.rayonesCarroceria || 'Sin rayones ni daños declarados'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                      <span className={styles.detalleInfoLabel}>Elementos de Valor Declarados:</span>
                      <span style={{ fontSize: '12px', color: '#334155', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        {otInfo.elementosValor || 'Sin elementos de valor declarados'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sección Falla Reportada y Diagnóstico Técnico */}
                <div className={styles.detalleCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <h4 className={styles.detalleCardTitle} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                      <span>Diagnóstico y Ejecución Técnica</span>
                    </h4>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className={styles.mecanicoPill}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <span>Mecánico: <strong>{otInfo.mecanico ? otInfo.mecanico.nombre : 'Sin asignar'}</strong></span>
                      </div>

                      <div className={styles.hoursPill}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{otInfo.horasHombre || 0} hrs invertidas</span>
                      </div>
                    </div>
                  </div>

                  {/* Motivo de ingreso */}
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Motivo de Ingreso / Falla Reportada por Cliente:
                    </span>
                    <div className={styles.fallaBox}>
                      {otInfo.fallaReportada}
                    </div>
                  </div>

                  {/* Hallazgos de Diagnóstico */}
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Diagnóstico del Mecánico:
                    </span>
                    <div className={styles.detalleTextareaBox}>
                      {otInfo.diagnostico || 'Sin diagnóstico registrado por el momento.'}
                    </div>
                  </div>

                  {/* Trabajos Realizados */}
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Trabajos y Reparaciones Efectuadas:
                    </span>
                    <div className={styles.detalleTextareaBox}>
                      {otInfo.trabajoRealizado || 'Sin reparaciones registradas por el momento.'}
                    </div>
                  </div>
                </div>

                {/* Sección Desglose de Repuestos */}
                <div className={styles.repuestosSection}>
                  <div className={styles.repuestosHeader}>
                    <h4 className={styles.repuestosTitle}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      <span>Repuestos Asignados ({otInfo.detalleRepuestos?.length || 0})</span>
                    </h4>
                    {otInfo.detalleRepuestos && otInfo.detalleRepuestos.length > 0 && (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e1b4b' }}>
                        Total: ${totalRepuestos.toLocaleString('es-CL')} CLP
                      </span>
                    )}
                  </div>

                  {otInfo.detalleRepuestos && otInfo.detalleRepuestos.length > 0 ? (
                    <div className={styles.repuestosTableWrapper}>
                      <table className={styles.repuestosTable}>
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th style={{ textAlign: 'center' }}>Cantidad</th>
                            <th style={{ textAlign: 'right' }}>Precio Unitario</th>
                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {otInfo.detalleRepuestos.map((item) => {
                            const subtotal = item.cantidad * item.precioUnitario;
                            return (
                              <tr key={item.id}>
                                <td>
                                  <span className={styles.repuestoCodeBadge}>{item.repuesto.codigo}</span>
                                </td>
                                <td>{item.repuesto.nombre}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.cantidad}</td>
                                <td style={{ textAlign: 'right' }}>${item.precioUnitario.toLocaleString('es-CL')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>${subtotal.toLocaleString('es-CL')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={styles.emptyRepuestosBox}>
                      No se han asignado repuestos o insumos a esta orden de trabajo.
                    </div>
                  )}
                </div>

                {/* Sección Galería de Fotografías */}
                <div className={styles.detalleCard}>
                  <h4 className={styles.detalleCardTitle}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Evidencia Fotográfica de Diagnóstico ({otInfo.fotosDiagnostico?.length || 0})</span>
                  </h4>

                  {otInfo.fotosDiagnostico && otInfo.fotosDiagnostico.length > 0 ? (
                    <div className={styles.photosGrid}>
                      {otInfo.fotosDiagnostico.map((foto, idx) => (
                        <div
                          key={idx}
                          className={styles.photoThumbnailWrapper}
                          onClick={() => setFotoAmpliada(foto)}
                          title="Clic para ampliar imagen"
                        >
                          <img
                            src={foto}
                            alt={`Evidencia ${idx + 1}`}
                            className={styles.photoThumbnail}
                          />
                          <div className={styles.photoZoomBadge}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              <line x1="11" y1="8" x2="11" y2="14" />
                              <line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                            <span>Ver</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyRepuestosBox}>
                      No se han adjuntado fotos de diagnóstico para esta orden.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer con acciones */}
              <div className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className={styles.btnWhatsApp}
                  disabled={cargandoWhatsappId === otInfo.id}
                  onClick={() => handleGenerarWhatsapp(otInfo.id)}
                  title="Generar mensaje y enviar por WhatsApp al cliente"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                  </svg>
                  <span>Notificar por WhatsApp</span>
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={styles.btnActionSecondary}
                    onClick={() => {
                      setOtDetalle(null);
                      abrirModalTecnico(otInfo);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Gestionar Diagnóstico / Repuestos</span>
                  </button>

                  <button
                    type="button"
                    className={styles.btnPrimary}
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                    onClick={() => setOtDetalle(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: FOTO AMPLIADA A DETALLE (LIGHTBOX) */}
      {fotoAmpliada && (
        <div className={styles.lightboxOverlay} onClick={() => setFotoAmpliada(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.lightboxCloseBtn}
              onClick={() => setFotoAmpliada(null)}
              title="Cerrar vista previa"
            >
              ✕
            </button>
            <img
              src={fotoAmpliada}
              alt="Fotografía de diagnóstico ampliada"
              className={styles.lightboxImg}
            />
            <div className={styles.lightboxFooter}>
              <a
                href={fotoAmpliada}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.lightboxDownloadBtn}
                download="diagnostico-gearcore.jpg"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Abrir en pestaña nueva / Descargar</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIALOGO / CONFIRMACIÓN PERSONALIZADO (CERO ALERT NATIVO) */}
      {dialogo && (
        <div className={styles.dialogOverlay} onClick={() => setDialogo(null)}>
          <div className={styles.dialogModal} onClick={(e) => e.stopPropagation()}>
            {dialogo.tipo === 'success' && (
              <div className={styles.dialogIconSuccess}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
            {dialogo.tipo === 'error' && (
              <div className={styles.dialogIconError}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            )}
            {dialogo.tipo === 'confirm' && (
              <div className={styles.dialogIconConfirm}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            )}

            <h4 className={styles.dialogTitle}>{dialogo.titulo}</h4>
            <p className={styles.dialogText}>{dialogo.mensaje}</p>

            <div className={styles.dialogActions}>
              {dialogo.tipo === 'confirm' ? (
                <>
                  <button
                    type="button"
                    className={styles.btnDialogCancel}
                    onClick={() => setDialogo(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.btnDialogDanger}
                    onClick={() => {
                      const fn = dialogo.onConfirm;
                      setDialogo(null);
                      if (fn) fn();
                    }}
                  >
                    Confirmar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.btnDialogConfirm}
                  onClick={() => setDialogo(null)}
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

