'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '../../lib/api';
import styles from './ordenes-trabajo.module.css';
import DataTable, { Column } from './DataTable';
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
import { useVehiculosPaginados } from '../../hooks/vehiculos/useVehiculos';
import {
  DanioCarroceria,
  parsearRegistroCarroceria,
  serializarRegistroCarroceria,
  VISTAS_CONFIG,
} from './inspeccion-carroceria.types';
import { InspeccionCarroceriaModal } from './InspeccionCarroceriaModal';

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
  const searchParams = useSearchParams();
  const busquedaParam = searchParams.get('id') || searchParams.get('search') || '';

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

  // Modal Crear OT
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [vehiculoSearch, setVehiculoSearch] = useState('');
  const [selectedVehiculo, setSelectedVehiculo] = useState<VehiculoSimple | null>(null);
  const [paginaVehiculos, setPaginaVehiculos] = useState(1);

  // Consulta paginada de 3 en 3 vehículos en base de datos (con filtrado reactivo)
  const { data: vehiculosPaginadosData, isLoading: cargandoVehiculosPaginados } = useVehiculosPaginados({
    pagina: paginaVehiculos,
    limite: 3,
    search: vehiculoSearch,
    enabled: showCrearModal,
  });
  const [nuevaFalla, setNuevaFalla] = useState('');
  const [nuevoMecanicoId, setNuevoMecanicoId] = useState('');
  const [nuevoCombustible, setNuevoCombustible] = useState('0%');
  const [fuelHoverSegment, setFuelHoverSegment] = useState<number | null>(null);

  const getFilledSegments = (val: string): number => {
    const v = (val || '').toLowerCase();
    if (v.includes('lleno') || v === '100%' || v === 'f') return 8;
    if (v.includes('7/8') || v.includes('88%') || v.includes('87%')) return 7;
    if (v.includes('3/4') || v.includes('75%')) return 6;
    if (v.includes('5/8') || v.includes('62%') || v.includes('63%')) return 5;
    if (v.includes('1/2') || v.includes('50%') || v.includes('medio')) return 4;
    if (v.includes('3/8') || v.includes('37%') || v.includes('38%')) return 3;
    if (v.includes('1/4') || v.includes('25%') || v.includes('cuarto')) return 2;
    if (v.includes('1/8') || v.includes('12%') || v.includes('13%')) return 1;
    if (v.includes('reserva') || v.includes('0%') || v.includes('vacio') || v === 'e') return 0;
    return 0;
  };

  const handleSelectFuelSegment = (segIndex: number) => {
    const current = getFilledSegments(nuevoCombustible);
    if (segIndex === 1 && current === 1) {
      setNuevoCombustible('0%');
      return;
    }
    const mapping: Record<number, string> = {
      1: '1/8',
      2: '1/4',
      3: '3/8',
      4: '1/2',
      5: '5/8',
      6: '3/4',
      7: '7/8',
      8: 'Lleno',
    };
    setNuevoCombustible(mapping[segIndex] || '0%');
  };
  const [nuevosRayones, setNuevosRayones] = useState('');
  const [daniosCarroceria, setDaniosCarroceria] = useState<DanioCarroceria[]>([]);
  const [showInspeccionModal, setShowInspeccionModal] = useState(false);
  const [showInspeccionDetalleModal, setShowInspeccionDetalleModal] = useState(false);
  const [inspeccionDetalleData, setInspeccionDetalleData] = useState<{ danios: DanioCarroceria[]; resumen: string }>({ danios: [], resumen: '' });
  const [nuevosValores, setNuevosValores] = useState('');
  const [nuevoKm, setNuevoKm] = useState<string>('');
  const [guardandoOT, setGuardandoOT] = useState(false);

  // Modal Unificado de Gestión de OT (3 pestañas)
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [modalTab, setModalTab] = useState<'tecnico' | 'repuestos' | 'ficha'>('tecnico');
  const [editDiagnostico, setEditDiagnostico] = useState('');
  const [editTrabajo, setEditTrabajo] = useState('');
  const [editFotos, setEditFotos] = useState<string[]>([]);
  const [horasInput, setHorasInput] = useState<string>('');
  const [comentarioHoras, setComentarioHoras] = useState<string>('');
  const [guardandoTecnico, setGuardandoTecnico] = useState(false);

  // Modal WhatsApp
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappData, setWhatsappData] = useState<{ url: string; texto: string; telefono: string } | null>(null);
  const [textoWhatsappEditado, setTextoWhatsappEditado] = useState('');
  const [cargandoWhatsappId, setCargandoWhatsappId] = useState<string | null>(null);

  // Subida de archivos y visualización a detalle (Lightbox)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  // Repuestos e Insumos en OT (SCRUM-23)
  const [repuestoSeleccionadoId, setRepuestoSeleccionadoId] = useState('');
  const [cantidadRepuesto, setCantidadRepuesto] = useState('1');
  const [busquedaItemOT, setBusquedaItemOT] = useState('');
  const [filtroTipoItemOT, setFiltroTipoItemOT] = useState<'TODOS' | 'REPUESTO' | 'INSUMO'>('TODOS');
  const [dropdownItemAbierto, setDropdownItemAbierto] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const [guardandoRepuestoOT, setGuardandoRepuestoOT] = useState(false);
  const [quitandoRepuestoId, setQuitandoRepuestoId] = useState<string | null>(null);

  // Cerrar dropdown de búsqueda de repuestos/insumos al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setDropdownItemAbierto(false);
      }
    }
    if (dropdownItemAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownItemAbierto]);



  // Diálogo modal personalizado (reemplaza alert / confirm)
  const [dialogo, setDialogo] = useState<{
    tipo: 'success' | 'error' | 'confirm';
    titulo: string;
    mensaje: string;
    onConfirm?: () => void;
  } | null>(null);

  // Determinar la siguiente acción lógica según el estado actual
  function getSiguientePaso(estado: EstadoOT): { label: string; siguiente: EstadoOT } | null {
    switch (estado) {
      case 'RECIBIDO':
        return { label: 'Comenzar Diagnóstico', siguiente: 'DIAGNOSTICO' };
      case 'DIAGNOSTICO':
        return { label: 'Completar Diagnóstico (A Cotizar)', siguiente: 'COTIZACION' };
      case 'APROBADO':
        return { label: 'Iniciar Reparación', siguiente: 'EN_REPARACION' };
      case 'EN_REPARACION':
        return { label: 'Enviar a Control de Calidad', siguiente: 'CONTROL_CALIDAD' };
      case 'CONTROL_CALIDAD':
        return { label: 'Aprobar y Entregar Vehículo', siguiente: 'ENTREGADO' };
      default:
        return null;
    }
  }

  // Abrir Modal Unificado de Gestión
  async function abrirGestionOT(ot: OrdenTrabajo, tabInicial: 'tecnico' | 'repuestos' | 'ficha' = 'tecnico') {
    setSelectedOT(ot);
    setModalTab(tabInicial);
    setEditDiagnostico(ot.diagnostico || '');
    setEditTrabajo(ot.trabajoRealizado || '');
    setEditFotos(ot.fotosDiagnostico || []);
    setHorasInput('');
    setComentarioHoras('');
    setRepuestoSeleccionadoId('');
    setCantidadRepuesto('1');
    setBusquedaItemOT('');
    setFiltroTipoItemOT('TODOS');
    setDropdownItemAbierto(false);
    setShowGestionModal(true);

    try {
      const fresca = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${ot.id}`);
      if (fresca) {
        setSelectedOT(fresca);
        setEditDiagnostico(fresca.diagnostico || '');
        setEditTrabajo(fresca.trabajoRealizado || '');
        setEditFotos(fresca.fotosDiagnostico || []);
      }
    } catch {
      // mantener estado actual si falla
    }
  }



  // Manejador cambio de estado (SCRUM-12)
  async function handleCambiarEstado(otId: string, nuevoEstado: EstadoOT) {
    try {
      setActualizandoEstadoId(otId);
      const updated = await cambiarEstadoOTMutation.mutateAsync({ otId, estado: nuevoEstado });
      if (selectedOT && selectedOT.id === otId) {
        setSelectedOT(updated);
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
      const rayonesFinal = serializarRegistroCarroceria(daniosCarroceria, nuevosRayones);
      const payload: any = {
        vehiculoId: selectedVehiculo.id,
        fallaReportada: nuevaFalla.trim(),
        mecanicoId: nuevoMecanicoId || undefined,
        nivelCombustible: nuevoCombustible,
        rayonesCarroceria: rayonesFinal.trim() || undefined,
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
    setPaginaVehiculos(1);
    setNuevaFalla('');
    setNuevoMecanicoId('');
    setNuevoCombustible('0%');
    setFuelHoverSegment(null);
    setNuevosRayones('');
    setDaniosCarroceria([]);
    setNuevosValores('');
    setNuevoKm('');
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
      setBusquedaItemOT('');
      setDropdownItemAbierto(false);

      const esInsumo = item.tipo === 'INSUMO';
      setDialogo({
        tipo: 'success',
        titulo: esInsumo ? 'Insumo Registrado' : 'Repuesto Asociado',
        mensaje: `Se asociaron ${cant} ud(s) de "${item.nombre}" a la OT y se descontaron del inventario.`,
      });
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al agregar artículo',
        mensaje: err.message || 'No fue posible asociar el artículo a la OT.',
      });
    } finally {
      setGuardandoRepuestoOT(false);
    }
  }

  // SCRUM-23: Quitar Repuesto o Insumo de la OT con restitución automática de stock
  function solicitarQuitarRepuesto(detalle: DetalleOTRepuestoItem) {
    const esInsumo = detalle.repuesto?.tipo === 'INSUMO';
    setDialogo({
      tipo: 'confirm',
      titulo: 'Confirmar Devolución al Stock',
      mensaje: `¿Deseas retirar "${detalle.repuesto.nombre}" (${detalle.cantidad} uds) de esta OT? Se reintegrarán automáticamente +${detalle.cantidad} unidades al stock del inventario.`,
      onConfirm: () => ejecutarQuitarRepuesto(detalle.id, esInsumo),
    });
  }

  async function ejecutarQuitarRepuesto(detalleId: string, esInsumo: boolean = false) {
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
        mensaje: esInsumo
          ? 'El insumo fue retirado de la OT y las unidades se devolvieron exitosamente al inventario.'
          : 'El repuesto fue retirado de la OT y las unidades se devolvieron exitosamente al inventario.',
      });
    } catch (err: any) {
      setDialogo({
        tipo: 'error',
        titulo: 'Error al quitar artículo',
        mensaje: err.message || 'No se pudo retirar el artículo.',
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
        setHorasInput('');
        setComentarioHoras('');
      }

      const finalOT = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${selectedOT.id}`);
      if (finalOT) {
        setSelectedOT(finalOT);
      }
      setShowGestionModal(false);
      setDialogo({
        tipo: 'success',
        titulo: 'Diagnóstico Guardado',
        mensaje: 'Se actualizaron el diagnóstico técnico, la bitácora y las horas registradas exitosamente.',
      });
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
      setTextoWhatsappEditado(data.texto || '');
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

  // Filtrado de OTs en memoria (por estado de pestaña y mecánico seleccionado)
  const ordenesFiltradas = ordenes.filter((ot) => {
    if (filtroEstado !== 'TODAS' && ot.estado !== filtroEstado) return false;
    if (filtroMecanico !== 'TODOS') {
      if (filtroMecanico === 'SIN_ASIGNAR' && ot.mecanicoId) return false;
      if (filtroMecanico !== 'SIN_ASIGNAR' && ot.mecanicoId !== filtroMecanico) return false;
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

      {/* TABLA PRINCIPAL DE ÓRDENES DE TRABAJO (DATATABLE) */}
      <DataTable<OrdenTrabajo>
        data={ordenesFiltradas}
        keyExtractor={(ot) => ot.id}
        storageKey="ordenes-table-layout"
        searchPlaceholder="Buscar por patente, cliente, marca o falla..."
        initialQuery={busquedaParam}
        loading={loadingOTs}
        loadingMessage="Cargando órdenes de trabajo..."
        error={errorOTs ? errOTs : null}
        errorMessage={`Error al consultar órdenes: ${(errOTs as any)?.message || 'Error del servidor'}`}
        onRetry={() => refetchOTs()}
        emptyMessage="No se encontraron órdenes de trabajo con los filtros aplicados."
        onRowClick={(ot) => abrirGestionOT(ot, 'tecnico')}
        renderCard={(ot) => {
          const estadoObj = ESTADOS_OT.find((e) => e.id === ot.estado) || ESTADOS_OT[0];
          return (
            <div
              className={styles.otCard}
              onClick={() => abrirGestionOT(ot, 'tecnico')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  abrirGestionOT(ot, 'tecnico');
                }
              }}
            >
              <div className={styles.otCardHeader}>
                <div className={styles.otCardHeaderLeft}>
                  <div className={styles.plateBadge}>
                    <img
                      src="/assets/chile-flag.svg"
                      alt="CL"
                      className={styles.plateFlag}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <span>{ot.vehiculo.patente}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${estadoObj.class}`}>
                    {estadoObj.label}
                  </span>
                </div>
                <div className={styles.otCardHeaderRight}>
                  <span className={styles.otCardId}>#{ot.id.slice(0, 8)}</span>
                </div>
              </div>

              <div className={styles.otCardBody}>
                <div className={styles.otCardVehicleRow}>
                  <span className={styles.otCardVehicleTitle}>
                    {ot.vehiculo.marca} {ot.vehiculo.modelo}
                  </span>
                  <span className={styles.otCardVehicleSub}>
                    {ot.vehiculo.anio ? `Año ${ot.vehiculo.anio}` : 'Año S/I'}
                    {ot.kilometrajeRecepcion ? ` • ${ot.kilometrajeRecepcion.toLocaleString('es-CL')} km` : ''}
                  </span>
                </div>

                <div className={styles.otCardClientRow}>
                  <span className={styles.otCardClientName}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{ot.vehiculo.cliente?.nombre || 'Sin cliente'}</span>
                  </span>
                  {userRole !== 'MECANICO' && ot.vehiculo.cliente?.telefono && (
                    <a
                      href={`tel:${ot.vehiculo.cliente.telefono.replace(/\s+/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.otCardPhoneBtn}
                      title="Llamar al cliente"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{ot.vehiculo.cliente.telefono.replace(/^\+*/, '+')}</span>
                    </a>
                  )}
                </div>

                {ot.fallaReportada && (
                  <p className={styles.otCardFallaText} title={ot.fallaReportada}>
                    {ot.fallaReportada}
                  </p>
                )}
              </div>

              <div className={styles.otCardFooter}>
                <div className={styles.otCardMecanicoBadge}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  <span>{ot.mecanico ? ot.mecanico.nombre : 'Sin asignar'}</span>
                </div>

                <div className={styles.otCardFooterActions}>
                  <span className={styles.hoursPill}>
                    {ot.horasHombre || 0}h
                  </span>
                  <button
                    type="button"
                    className={styles.btnCardManage}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirGestionOT(ot, 'tecnico');
                    }}
                  >
                    <span>Gestionar</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        }}
        actions={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {userRole !== 'MECANICO' ? (
              <select
                className={styles.selectTableFilter}
                value={filtroMecanico}
                onChange={(e) => setFiltroMecanico(e.target.value)}
                title="Filtrar órdenes por mecánico asignado"
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
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Mis Órdenes</span>
              </div>
            )}

            {userRole !== 'MECANICO' && (
              <button
                type="button"
                className={styles.btnTablePrimary}
                onClick={() => {
                  resetCrearForm();
                  setShowCrearModal(true);
                }}
                title="Registrar una nueva Orden de Trabajo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Nueva OT</span>
              </button>
            )}
          </div>
        }
        columns={[
          {
            id: 'id',
            header: 'OT #',
            width: '110px',
            accessor: 'id',
            cell: (ot) => (
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--accent-primary)' }}>
                #{ot.id.slice(0, 8)}
              </span>
            ),
            filterFn: (ot, q) => ot.id.toLowerCase().includes(q.replace('#', '').trim()),
          },
          {
            id: 'patente',
            header: 'Patente',
            width: '120px',
            cell: (ot) => (
              <div className={styles.plateBadge}>
                <img
                  src="/assets/chile-flag.svg"
                  alt="CL"
                  className={styles.plateFlag}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span>{ot.vehiculo.patente}</span>
              </div>
            ),
            filterFn: (ot, q) => ot.vehiculo.patente.toLowerCase().includes(q),
          },
          {
            id: 'vehiculo',
            header: 'Vehículo',
            cell: (ot) => (
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                  {ot.vehiculo.marca} {ot.vehiculo.modelo}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {ot.vehiculo.anio ? `Año ${ot.vehiculo.anio}` : 'Año S/I'}
                  {ot.kilometrajeRecepcion ? ` • ${ot.kilometrajeRecepcion.toLocaleString('es-CL')} km` : ''}
                </span>
              </div>
            ),
            filterFn: (ot, q) =>
              `${ot.vehiculo.marca} ${ot.vehiculo.modelo}`.toLowerCase().includes(q),
          },
          {
            id: 'cliente',
            header: 'Cliente',
            cell: (ot) => (
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  {ot.vehiculo.cliente?.nombre || 'Sin cliente'}
                </span>
                {userRole !== 'MECANICO' && ot.vehiculo.cliente?.telefono && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {ot.vehiculo.cliente.telefono.replace(/^\+*/, '+')}
                  </span>
                )}
              </div>
            ),
            filterFn: (ot, q) =>
              (ot.vehiculo.cliente?.nombre || '').toLowerCase().includes(q),
          },
          {
            id: 'mecanico',
            header: 'Mecánico',
            cell: (ot) => (
              <span style={{ fontSize: '12.5px', color: ot.mecanico ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {ot.mecanico ? ot.mecanico.nombre : 'Sin asignar'}
              </span>
            ),
            filterFn: (ot, q) =>
              (ot.mecanico?.nombre || 'sin asignar').toLowerCase().includes(q),
          },
          {
            id: 'fallaReportada',
            header: 'Motivo / Falla',
            cell: (ot) => (
              <div
                title={ot.fallaReportada}
                style={{
                  maxWidth: '260px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                }}
              >
                {ot.fallaReportada}
              </div>
            ),
            filterFn: (ot, q) => ot.fallaReportada.toLowerCase().includes(q),
          },
          {
            id: 'horasHombre',
            header: 'Horas',
            align: 'center',
            width: '80px',
            cell: (ot) => (
              <span className={styles.hoursPill} style={{ margin: '0 auto' }}>
                {ot.horasHombre || 0}h
              </span>
            ),
            sortFn: (a, b) => (a.horasHombre || 0) - (b.horasHombre || 0),
          },
          {
            id: 'estado',
            header: 'Estado',
            align: 'center',
            width: '130px',
            cell: (ot) => {
              const estadoObj = ESTADOS_OT.find((e) => e.id === ot.estado) || ESTADOS_OT[0];
              return (
                <span className={`${styles.statusBadge} ${estadoObj.class}`}>
                  {estadoObj.label}
                </span>
              );
            },
            filterFn: (ot, q) => {
              const estadoObj = ESTADOS_OT.find((e) => e.id === ot.estado);
              return (estadoObj?.label || '').toLowerCase().includes(q);
            },
          },
          {
            id: 'acciones',
            header: 'Acciones',
            align: 'right',
            width: '180px',
            sortable: false,
            filterable: false,
            cell: (ot) => (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className={styles.btnGestionar}
                  data-row-click="true"
                  onClick={() => abrirGestionOT(ot, 'tecnico')}
                  title="Abrir gestión técnica, diagnóstico y avance de estado"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Gestionar</span>
                </button>

                {userRole !== 'MECANICO' && (
                  <button
                    type="button"
                    className={styles.btnWhatsApp}
                    style={{ padding: '6px 9px', borderRadius: '8px', fontSize: '11.5px' }}
                    disabled={cargandoWhatsappId === ot.id}
                    data-prevent-row-click="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerarWhatsapp(ot.id);
                    }}
                    title="Notificar por WhatsApp al cliente"
                  >
                    {cargandoWhatsappId === ot.id ? (
                      <span className={styles.spinner} style={{ width: '10px', height: '10px' }} />
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* MODAL 1: CREAR ORDEN DE TRABAJO (SCRUM-10, 11, 21) */}
      {showCrearModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Nueva Orden de Trabajo (Ingreso Vehículo)</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowCrearModal(false)}
                title="Cerrar modal"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCrearOT}>
              <div className={styles.modalBody}>
                {/* Paso 1: Selección de Vehículo (Buscador + Catálogo Paginado de 3 en 3) */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    1. Vehículo del Cliente *
                  </label>

                  <div className={styles.vehiculoStepLayout}>
                    {selectedVehiculo ? (
                      <div className={styles.selectedVehiculoCard}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span className={styles.plateBadge}>{selectedVehiculo.patente}</span>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                              {selectedVehiculo.marca} {selectedVehiculo.modelo}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              ({selectedVehiculo.anio || 'Año S/I'})
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Propietario: <strong style={{ color: 'var(--text-primary)' }}>{selectedVehiculo.cliente.nombre}</strong>
                            {selectedVehiculo.cliente.rut ? ` · RUT: ${selectedVehiculo.cliente.rut}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.btnActionSubtle}
                          style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            setSelectedVehiculo(null);
                            setVehiculoSearch('');
                          }}
                        >
                          Cambiar vehículo
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.vehiculoSearchWrapper}>
                          <input
                            type="text"
                            className={styles.formInput}
                            placeholder="Buscar o filtrar por patente, modelo o cliente..."
                            value={vehiculoSearch}
                            onChange={(e) => {
                              setVehiculoSearch(e.target.value);
                              setPaginaVehiculos(1);
                            }}
                            autoFocus
                          />
                        </div>

                        {/* Catálogo rápido de patentes con paginación de 3 en 3 (Opción A: Grilla horizontal de 3 tarjetas) */}
                        <div className={styles.vehiculosCatalogPanel}>
                          <div className={styles.vehiculosCatalogHeader}>
                            <span className={styles.vehiculosCatalogTitle}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                                <circle cx="7" cy="17" r="2" />
                                <path d="M9 17h6" />
                                <circle cx="17" cy="17" r="2" />
                              </svg>
                              Patentes en Base de Datos
                            </span>
                            <span className={styles.vehiculosCatalogCountBadge}>
                              {cargandoVehiculosPaginados ? '...' : `${vehiculosPaginadosData?.total ?? 0} totales`}
                            </span>
                          </div>

                          <div className={styles.vehiculosCatalogList}>
                            {cargandoVehiculosPaginados ? (
                              <div className={styles.vehiculosCatalogLoading}>
                                Cargando vehículos...
                              </div>
                            ) : !vehiculosPaginadosData?.items || vehiculosPaginadosData.items.length === 0 ? (
                              <div className={styles.vehiculosCatalogEmpty}>
                                {vehiculoSearch ? 'No hay vehículos coincidentes.' : 'No hay vehículos registrados.'}
                              </div>
                            ) : (
                              vehiculosPaginadosData.items.map((v) => {
                                const estaSeleccionado = selectedVehiculo?.id === v.id;
                                return (
                                  <div
                                    key={v.id}
                                    className={`${styles.vehiculoCatalogItem} ${estaSeleccionado ? styles.vehiculoCatalogItemActive : ''}`}
                                    onClick={() => {
                                      setSelectedVehiculo(v);
                                      if (v.kilometraje) setNuevoKm(v.kilometraje.toString());
                                    }}
                                    title="Seleccionar este vehículo para la orden"
                                  >
                                    <div className={styles.vehiculoCatalogItemHeader}>
                                      <span className={styles.plateBadge}>{v.patente}</span>
                                      {v.anio && (
                                        <span className={styles.vehiculoCatalogYearBadge}>{v.anio}</span>
                                      )}
                                    </div>
                                    <div className={styles.vehiculoCatalogItemModel}>
                                      {v.marca} {v.modelo}
                                    </div>
                                    <div className={styles.vehiculoCatalogItemOwner}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                      </svg>
                                      <span>{v.cliente.nombre}</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Barra de Paginación de 3 en 3 (Requerimiento de Usuario: Botones 1, 2...) */}
                          <div className={styles.vehiculosPaginationBar}>
                            <span className={styles.vehiculosPaginationInfo}>
                              Pág. {paginaVehiculos} de {Math.max(1, vehiculosPaginadosData?.totalPaginas ?? 1)}
                            </span>
                            <div className={styles.vehiculosPaginationBtns}>
                              <button
                                type="button"
                                className={styles.vehiculoPageBtn}
                                disabled={paginaVehiculos <= 1 || cargandoVehiculosPaginados}
                                onClick={() => setPaginaVehiculos((prev) => Math.max(1, prev - 1))}
                                title="Página anterior"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="15 18 9 12 15 6" />
                                </svg>
                              </button>

                              {Array.from({ length: Math.min(5, Math.max(1, vehiculosPaginadosData?.totalPaginas ?? 1)) }, (_, i) => {
                                const totalPags = Math.max(1, vehiculosPaginadosData?.totalPaginas ?? 1);
                                let p = i + 1;
                                if (totalPags > 5 && paginaVehiculos > 3) {
                                  p = Math.min(totalPags - 4 + i, Math.max(1, paginaVehiculos - 2 + i));
                                }
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    className={`${styles.vehiculoPageBtn} ${paginaVehiculos === p ? styles.vehiculoPageBtnActive : ''}`}
                                    onClick={() => setPaginaVehiculos(p)}
                                    disabled={cargandoVehiculosPaginados}
                                  >
                                    {p}
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                className={styles.vehiculoPageBtn}
                                disabled={
                                  paginaVehiculos >= (vehiculosPaginadosData?.totalPaginas ?? 1) ||
                                  cargandoVehiculosPaginados
                                }
                                onClick={() =>
                                  setPaginaVehiculos((prev) =>
                                    Math.min(vehiculosPaginadosData?.totalPaginas ?? 1, prev + 1)
                                  )
                                }
                                title="Página siguiente"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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

                  {/* Nivel de Combustible (Barra Segmentada) */}
                  <div style={{ marginTop: '8px' }}>
                    <div className={styles.fuelControlWrapper}>
                      <div className={styles.fuelLabelRow}>
                        <span className={styles.fuelLabel}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                            <path d="M3 22h12" />
                            <path d="M4 9h10" />
                            <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
                            <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
                          </svg>
                          Nivel de combustible
                        </span>
                      </div>

                      {(() => {
                        const filledSegs = getFilledSegments(nuevoCombustible);
                        const displaySegs = fuelHoverSegment !== null ? fuelHoverSegment : filledSegs;
                        const displayPct = Math.round((displaySegs / 8) * 100);

                        return (
                          <div className={styles.fuelInteractiveArea}>
                            <div className={styles.fuelBarAndTicksCol}>
                              {/* Barra con 8 segmentos */}
                              <div className={styles.fuelBar}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((seg) => {
                                  const isFilled = seg <= displaySegs;
                                  return (
                                    <button
                                      key={seg}
                                      type="button"
                                      className={`${styles.fuelSegment} ${
                                        isFilled ? styles.fuelSegmentFilled : ''
                                      }`}
                                      onClick={() => handleSelectFuelSegment(seg)}
                                      onMouseEnter={() => setFuelHoverSegment(seg)}
                                      onMouseLeave={() => setFuelHoverSegment(null)}
                                      title={`Nivel ${Math.round((seg / 8) * 100)}%`}
                                    />
                                  );
                                })}
                              </div>

                              {/* Ticks inferiores E, 1/4, 1/2, 3/4, F */}
                              <div className={styles.fuelTicksContainer}>
                                <button
                                  type="button"
                                  className={`${styles.fuelTickBtn} ${filledSegs === 0 ? styles.fuelTickBtnActive : ''}`}
                                  style={{ left: '0%' }}
                                  onClick={() => setNuevoCombustible('0%')}
                                  title="Vacío / Reserva (0%)"
                                >
                                  E
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.fuelTickBtn} ${filledSegs === 2 ? styles.fuelTickBtnActive : ''}`}
                                  style={{ left: '25%' }}
                                  onClick={() => setNuevoCombustible('1/4')}
                                  title="Un cuarto (25%)"
                                >
                                  1/4
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.fuelTickBtn} ${filledSegs === 4 ? styles.fuelTickBtnActive : ''}`}
                                  style={{ left: '50%' }}
                                  onClick={() => setNuevoCombustible('1/2')}
                                  title="Medio tanque (50%)"
                                >
                                  1/2
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.fuelTickBtn} ${filledSegs === 6 ? styles.fuelTickBtnActive : ''}`}
                                  style={{ left: '75%' }}
                                  onClick={() => setNuevoCombustible('3/4')}
                                  title="Tres cuartos (75%)"
                                >
                                  3/4
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.fuelTickBtn} ${filledSegs === 8 ? styles.fuelTickBtnActive : ''}`}
                                  style={{ left: '100%' }}
                                  onClick={() => setNuevoCombustible('Lleno')}
                                  title="Tanque lleno (100%)"
                                >
                                  F
                                </button>
                              </div>
                            </div>

                            {/* Porcentaje en verde a la derecha */}
                            <div
                              className={`${styles.fuelPercentDisplay} ${
                                displayPct === 0 ? styles.fuelPercentDisplayLow : ''
                              }`}
                            >
                              {displayPct}%
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Rayones / Chapa */}
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Estado de Carrocería / Daños:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowInspeccionModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: daniosCarroceria.length > 0 ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-subtle)',
                          border: daniosCarroceria.length > 0 ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                          color: daniosCarroceria.length > 0 ? '#3b82f6' : 'var(--text-primary)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                          <circle cx="7" cy="17" r="2" />
                          <path d="M9 17h6" />
                          <circle cx="17" cy="17" r="2" />
                        </svg>
                        <span>
                          {daniosCarroceria.length > 0
                            ? `Mapear en Silueta (${daniosCarroceria.length} detalle${daniosCarroceria.length > 1 ? 's' : ''})`
                            : 'Mapear en Silueta'}
                        </span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={styles.chipQuickOption}
                        onClick={() => {
                          setNuevosRayones('Sin daños ni rayones visibles');
                          setDaniosCarroceria([]);
                        }}
                      >
                        ✓ Sin daños visibles
                      </button>
                      <button
                        type="button"
                        className={styles.chipQuickOption}
                        onClick={() => {
                          setNuevosRayones((prev) => prev ? `${prev} · Rayones leves de uso general` : 'Rayones leves de uso general');
                        }}
                      >
                        + Rayones leves de uso
                      </button>
                      {daniosCarroceria.length > 0 && (
                        <button
                          type="button"
                          className={styles.chipQuickOption}
                          style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          onClick={() => setDaniosCarroceria([])}
                        >
                          ✕ Limpiar puntos ({daniosCarroceria.length})
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Observaciones generales o detalles de carrocería..."
                      value={nuevosRayones}
                      onChange={(e) => setNuevosRayones(e.target.value)}
                    />

                    {daniosCarroceria.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {daniosCarroceria.map((d) => (
                          <span
                            key={d.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <strong style={{ color: 'var(--text-primary)' }}>#{d.numero}</strong> {d.tipo} ({VISTAS_CONFIG[d.vista]?.shortLabel})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Elementos de Valor */}
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Elementos de Valor / Accesorios dejados:
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={styles.chipQuickOption}
                        onClick={() => setNuevosValores('Rueda de repuesto + Gata hidráulica + Llave de rueda')}
                      >
                        ✓ Estándar (Rueda + Gata + Llave)
                      </button>
                      <button
                        type="button"
                        className={styles.chipQuickOption}
                        onClick={() => setNuevosValores('Sin objetos de valor')}
                      >
                        ✓ Sin objetos de valor
                      </button>
                      <button
                        type="button"
                        className={styles.chipQuickOption}
                        onClick={() => setNuevosValores((prev) => prev ? `${prev} · Documentación al día` : 'Documentación al día')}
                      >
                        + Documentos al día
                      </button>
                    </div>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ej: Rueda de repuesto, gata hidráulica, radio, documentos al día..."
                      value={nuevosValores}
                      onChange={(e) => setNuevosValores(e.target.value)}
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

      {/* MODAL UNIFICADO: GESTIÓN DE ORDEN DE TRABAJO (3 PESTAÑAS) */}
      {showGestionModal && selectedOT && (() => {
        const otActual = ordenes.find((o) => o.id === selectedOT.id) || selectedOT;
        const estadoObj = ESTADOS_OT.find((e) => e.id === otActual.estado) || ESTADOS_OT[0];
        const estadoIdx = ESTADOS_OT.findIndex((e) => e.id === otActual.estado);
        const pasoSiguiente = getSiguientePaso(otActual.estado);
        const repuestosAsignados = otActual.detalleRepuestos || [];
        const repuestosSolo = repuestosAsignados.filter((d) => d.repuesto?.tipo !== 'INSUMO');
        const insumosSolo = repuestosAsignados.filter((d) => d.repuesto?.tipo === 'INSUMO');
        const totalRepuestos = repuestosAsignados.reduce(
          (acc, item) => acc + item.cantidad * item.precioUnitario,
          0
        );

        const itemSeleccionado = catalogoRepuestos.find((r) => r.id === repuestoSeleccionadoId);
        const catalogoFiltradoOT = catalogoRepuestos.filter((r) => {
          if (filtroTipoItemOT !== 'TODOS' && (r.tipo || 'REPUESTO') !== filtroTipoItemOT) {
            return false;
          }
          if (busquedaItemOT.trim()) {
            const q = busquedaItemOT.toLowerCase().trim();
            return (
              (r.codigo && r.codigo.toLowerCase().includes(q)) ||
              (r.nombre && r.nombre.toLowerCase().includes(q))
            );
          }
          return true;
        });

        return (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContentLarge}>
              {/* Header Unificado */}
              <div className={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div className={styles.plateBadge}>
                    <img
                      src="/assets/chile-flag.svg"
                      alt="CL"
                      className={styles.plateFlag}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <span>{otActual.vehiculo.patente}</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px' }}>
                      OT #{otActual.id.slice(0, 8).toUpperCase()} — {otActual.vehiculo.marca} {otActual.vehiculo.modelo}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Cliente: {otActual.vehiculo.cliente?.nombre || 'Sin cliente'}
                    </span>
                  </div>
                  <span className={`${styles.statusBadge} ${estadoObj.class}`}>
                    {estadoObj.label}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setShowGestionModal(false)}
                  title="Cerrar modal"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Barra de Pestañas Unificadas */}
              <div className={styles.tabNav}>
                <button
                  type="button"
                  className={`${styles.tabNavItem} ${modalTab === 'tecnico' ? styles.tabNavItemActive : ''}`}
                  onClick={() => setModalTab('tecnico')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  <span className={styles.tabTextDesktop}>1. Diagnóstico & Reparación</span>
                  <span className={styles.tabTextMobile}>1. Diagnóstico</span>
                </button>

                <button
                  type="button"
                  className={`${styles.tabNavItem} ${modalTab === 'repuestos' ? styles.tabNavItemActive : ''}`}
                  onClick={() => setModalTab('repuestos')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <span className={styles.tabTextDesktop}>2. Repuestos & Insumos</span>
                  <span className={styles.tabTextMobile}>2. Repuestos</span>
                  {repuestosAsignados.length > 0 && (
                    <span className={styles.tabBadge}>{repuestosAsignados.length}</span>
                  )}
                </button>

                <button
                  type="button"
                  className={`${styles.tabNavItem} ${modalTab === 'ficha' ? styles.tabNavItemActive : ''}`}
                  onClick={() => setModalTab('ficha')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span className={styles.tabTextDesktop}>3. Ficha & Recepción</span>
                  <span className={styles.tabTextMobile}>3. Ficha</span>
                </button>
              </div>

              {/* Contenido Dinámico según Pestaña Activa */}
              <div className={styles.modalBody}>
                {/* Stepper de ciclo de vida compacto */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Progreso de OT
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Paso {estadoIdx + 1} de 7: {estadoObj.label}
                    </span>
                  </div>

                  {/* Barra lineal compacta para móvil */}
                  <div className={styles.stepperMobileProgressBar}>
                    <div
                      className={styles.stepperMobileProgressFill}
                      style={{ width: `${Math.round(((estadoIdx + 1) / 7) * 100)}%` }}
                    />
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

                {/* PESTAÑA 1: DIAGNÓSTICO, REPARACIÓN, HORAS Y FOTOS */}
                {modalTab === 'tecnico' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Falla Reportada por el Cliente */}
                    <div className={styles.fallaBox}>
                      <strong>Motivo de Ingreso declarado:</strong> {otActual.fallaReportada}
                    </div>

                    {/* Registro de Horas-Hombre Invertidas */}
                    <div className={styles.formGroup} style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className={styles.formLabel} style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Registro Rápido de Horas-Hombre</span>
                        </label>
                        <strong style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>
                          Total actual: {otActual.horasHombre || 0} hrs
                        </strong>
                      </div>

                      <div className={styles.hoursButtonsRow}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sumar:</span>
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
                      <label className={styles.formLabel}>Diagnóstico Técnico del Mecánico</label>
                      <textarea
                        className={styles.formTextarea}
                        placeholder="Detalle el diagnóstico realizado (fallas encontradas, componentes afectados)..."
                        value={editDiagnostico}
                        onChange={(e) => setEditDiagnostico(e.target.value)}
                      />
                    </div>

                    {/* Trabajo Realizado / Bitácora (Solo editable una vez aprobada la reparación) */}
                    {otActual.estado === 'RECIBIDO' || otActual.estado === 'DIAGNOSTICO' || otActual.estado === 'COTIZACION' ? (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          <span>Trabajo Realizado / Bitácora de Reparación</span>
                          <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Bloqueado hasta aprobación comercial
                          </span>
                        </label>
                        <div
                          style={{
                            padding: '12px 14px',
                            background: 'var(--bg-subtle)',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.4',
                          }}
                        >
                          {editTrabajo ? (
                            <div>
                              <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>Registro previo:</strong>
                              <span>{editTrabajo}</span>
                            </div>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#b45309', flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              <span>
                                La bitácora de reparación y ejecución se habilitará automáticamente una vez que la cotización sea <strong>aprobada por el cliente</strong>.
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Trabajo Realizado / Bitácora de Reparación</label>
                        <textarea
                          className={styles.formTextarea}
                          placeholder="Detalle las reparaciones efectuadas, calibraciones, pruebas realizadas..."
                          value={editTrabajo}
                          onChange={(e) => setEditTrabajo(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Resumen rápido de Insumos y Repuestos */}
                    <div className={styles.insumosOTQuickBanner}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                          <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        <span>
                          <strong>Materiales en OT:</strong> {repuestosSolo.length} repuesto(s) y {insumosSolo.length} insumo(s) de taller registrados.
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.btnActionSubtle}
                        onClick={() => setModalTab('repuestos')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Gestionar Insumos / Repuestos</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    </div>

                    {/* Evidencia Fotográfica */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        <span>Fotografías de Evidencia ({editFotos.length})</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Sube desde PC o cámara/celular
                        </span>
                      </label>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment"
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
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>{procesandoFotos ? 'Procesando imágenes...' : 'Subir desde Dispositivo'}</span>
                        </button>
                      </div>

                      {editFotos.length > 0 && (
                        <div className={styles.photosGrid}>
                          {editFotos.map((url, idx) => (
                            <div
                              key={idx}
                              className={styles.photoThumbnailWrapper}
                              onClick={() => setFotoAmpliada(url)}
                              title="Clic para ver en grande"
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
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PESTAÑA 2: REPUESTOS E INSUMOS UTILIZADOS */}
                {modalTab === 'repuestos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* ZONA SUPERIOR: Asignador predictivo por SKU o Nombre para Añadir a la OT */}
                    <div
                      ref={itemSearchRef}
                      className={styles.repuestoAddForm}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--accent-primary)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </span>
                          <label style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Asignar Repuesto o Insumo del Almacén:
                          </label>
                        </div>
                        {/* Selector de tipo (Tabs rápidos) */}
                        <div className={styles.itemTypeTabs} style={{ margin: 0 }}>
                          <button
                            type="button"
                            className={`${styles.itemTypeTabBtn} ${filtroTipoItemOT === 'TODOS' ? styles.itemTypeTabBtnActive : ''}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiltroTipoItemOT('TODOS');
                              setDropdownItemAbierto(true);
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <path d="m9 12 2 2 4-4" />
                            </svg>
                            <span>Todos</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.itemTypeTabBtn} ${filtroTipoItemOT === 'REPUESTO' ? styles.itemTypeTabBtnActive : ''}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiltroTipoItemOT('REPUESTO');
                              setDropdownItemAbierto(true);
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            <span>Solo Repuestos</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.itemTypeTabBtn} ${filtroTipoItemOT === 'INSUMO' ? styles.itemTypeTabBtnActive : ''}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiltroTipoItemOT('INSUMO');
                              setDropdownItemAbierto(true);
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
                              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                            </svg>
                            <span>Solo Insumos</span>
                          </button>
                        </div>
                      </div>

                      {/* Buscador interactivo por SKU o Nombre */}
                      {!repuestoSeleccionadoId ? (
                        <div className={styles.itemSearchWrapper}>
                          <svg className={styles.itemSearchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input
                            type="text"
                            className={styles.itemSearchInput}
                            placeholder="Buscar por SKU o nombre de repuesto/insumo (ej: BUJ-01, ACEITE, PAÑO)..."
                            value={busquedaItemOT}
                            onChange={(e) => {
                              setBusquedaItemOT(e.target.value);
                              setDropdownItemAbierto(true);
                            }}
                            onFocus={() => setDropdownItemAbierto(true)}
                            onTouchStart={(e) => e.stopPropagation()}
                          />

                          {dropdownItemAbierto && (
                            <div
                              className={styles.itemDropdownResults}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                            >
                              {catalogoFiltradoOT.length === 0 ? (
                                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                  No se encontraron artículos que coincidan con "{busquedaItemOT}".
                                </div>
                              ) : (
                                <>
                                  {catalogoFiltradoOT.slice(0, 8).map((item) => {
                                    const disponible = item.stock > 0;
                                    return (
                                      <div
                                        key={item.id}
                                        className={styles.itemResultRow}
                                        style={{ opacity: disponible ? 1 : 0.6, cursor: disponible ? 'pointer' : 'not-allowed' }}
                                        onClick={() => {
                                          if (disponible) {
                                            setRepuestoSeleccionadoId(item.id);
                                            setCantidadRepuesto('1');
                                            setDropdownItemAbierto(false);
                                            setBusquedaItemOT('');
                                          }
                                        }}
                                      >
                                        <div className={styles.itemResultLeft}>
                                          <span className={styles.itemSkuBadge}>[{item.codigo}]</span>
                                          <strong>{item.nombre}</strong>
                                          {item.tipo === 'INSUMO' ? (
                                            <span className={styles.itemTypeInsumoBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                                              </svg>
                                              Insumo
                                            </span>
                                          ) : (
                                            <span className={styles.itemTypeRepuestoBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                              </svg>
                                              Repuesto
                                            </span>
                                          )}
                                        </div>
                                        <div className={styles.itemResultRight}>
                                          {disponible ? (
                                            <span style={{ color: '#16a34a', fontWeight: 600 }}>Stock: {item.stock} uds</span>
                                          ) : (
                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>Agotado</span>
                                          )}
                                          {userRole !== 'MECANICO' && (
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                              ${item.precioVenta.toLocaleString('es-CL')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {catalogoFiltradoOT.length > 8 && (
                                    <div style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-subtle)', borderRadius: '0 0 6px 6px' }}>
                                      Mostrando los primeros 8 de {catalogoFiltradoOT.length} artículos · Escribe para filtrar con precisión
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Artículo Seleccionado - Ficha de asignación rápida */
                        <div className={styles.selectedItemBox}>
                          <div className={styles.selectedItemMeta}>
                            <span className={styles.itemSkuBadge}>[{itemSeleccionado?.codigo}]</span>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                              {itemSeleccionado?.nombre}
                            </strong>
                            {itemSeleccionado?.tipo === 'INSUMO' ? (
                              <span className={styles.itemTypeInsumoBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                                </svg>
                                Insumo de Taller
                              </span>
                            ) : (
                              <span className={styles.itemTypeRepuestoBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                                Repuesto Vehicular
                              </span>
                            )}
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                              Disponible: {itemSeleccionado?.stock} uds
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className={styles.repuestoQtyWrapper}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Cantidad:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={itemSeleccionado?.stock || 1}
                                className={styles.formInput}
                                value={cantidadRepuesto}
                                onChange={(e) => setCantidadRepuesto(e.target.value)}
                                style={{ fontSize: '13px', textAlign: 'center', padding: '6px' }}
                              />
                            </div>

                            <button
                              type="button"
                              className={styles.btnPrimary}
                              style={{ padding: '8px 14px', fontSize: '13px', alignSelf: 'flex-end', height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              disabled={guardandoRepuestoOT}
                              onClick={handleAgregarRepuestoOT}
                            >
                              {guardandoRepuestoOT ? (
                                'Asociando...'
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                  <span>Añadir a OT</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className={styles.btnActionSubtle}
                              style={{ alignSelf: 'flex-end', height: '36px' }}
                              onClick={() => {
                                setRepuestoSeleccionadoId('');
                                setCantidadRepuesto('1');
                                setDropdownItemAbierto(true);
                              }}
                            >
                              Cambiar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resumen inferior de lo cargado en la OT */}
                    <div className={styles.dualInventoryHeader} style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>
                          Materiales, Repuestos e Insumos de la OT
                        </h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {repuestosSolo.length} repuesto(s) automotriz(ces) · {insumosSolo.length} insumo(s) consumible(s)
                        </span>
                      </div>
                      {userRole !== 'MECANICO' && repuestosAsignados.length > 0 && (
                        <strong style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>
                          Total: ${totalRepuestos.toLocaleString('es-CL')} CLP
                        </strong>
                      )}
                    </div>

                    {/* ZONA 1: Repuestos Vehiculares */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.itemTypeRepuestoBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                          </svg>
                          Repuestos
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          Piezas y Componentes Vehiculares ({repuestosSolo.length})
                        </strong>
                      </div>
                      {repuestosSolo.length > 0 ? (
                        <div className={styles.repuestosTableWrapper}>
                          <table className={styles.repuestosTable}>
                            <thead>
                              <tr>
                                <th>Código / SKU</th>
                                <th>Descripción</th>
                                <th style={{ textAlign: 'center' }}>Cant.</th>
                                {userRole !== 'MECANICO' && (
                                  <>
                                    <th style={{ textAlign: 'right' }}>P. Unitario</th>
                                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                                  </>
                                )}
                                <th style={{ textAlign: 'center', width: '60px' }}>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {repuestosSolo.map((d) => (
                                <tr key={d.id}>
                                  <td>
                                    <span className={styles.repuestoCodeBadge}>{d.repuesto.codigo}</span>
                                  </td>
                                  <td>
                                    <strong>{d.repuesto.nombre}</strong>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.cantidad}</td>
                                  {userRole !== 'MECANICO' && (
                                    <>
                                      <td style={{ textAlign: 'right' }}>${d.precioUnitario.toLocaleString('es-CL')}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                        ${(d.cantidad * d.precioUnitario).toLocaleString('es-CL')}
                                      </td>
                                    </>
                                  )}
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className={styles.btnDeleteRepuesto}
                                      disabled={quitandoRepuestoId === d.id}
                                      onClick={() => solicitarQuitarRepuesto(d)}
                                      title="Quitar repuesto y devolver a inventario"
                                    >
                                      {quitandoRepuestoId === d.id ? (
                                        <span className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                                      ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <div className={styles.emptyRepuestosBox}>
                          No hay repuestos vehiculares asociados a esta orden de trabajo.
                        </div>
                      )}
                    </div>

                    {/* ZONA 2: Insumos de Taller Utilizados */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.itemTypeInsumoBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                          </svg>
                          Insumos
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          Insumos y Consumibles de Taller Utilizados ({insumosSolo.length})
                        </strong>
                      </div>
                      {insumosSolo.length > 0 ? (
                        <div className={styles.repuestosTableWrapper}>
                          <table className={styles.repuestosTable}>
                            <thead>
                              <tr>
                                <th>Código / SKU</th>
                                <th>Insumo Utilizado</th>
                                <th style={{ textAlign: 'center' }}>Cant. Consumida</th>
                                {userRole !== 'MECANICO' && (
                                  <>
                                    <th style={{ textAlign: 'right' }}>P. Unitario</th>
                                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                                  </>
                                )}
                                <th style={{ textAlign: 'center', width: '60px' }}>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {insumosSolo.map((d) => (
                                <tr key={d.id}>
                                  <td>
                                    <span className={styles.repuestoCodeBadge}>{d.repuesto.codigo}</span>
                                  </td>
                                  <td>
                                    <strong>{d.repuesto.nombre}</strong>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.cantidad}</td>
                                  {userRole !== 'MECANICO' && (
                                    <>
                                      <td style={{ textAlign: 'right' }}>${d.precioUnitario.toLocaleString('es-CL')}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                        ${(d.cantidad * d.precioUnitario).toLocaleString('es-CL')}
                                      </td>
                                    </>
                                  )}
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className={styles.btnDeleteRepuesto}
                                      disabled={quitandoRepuestoId === d.id}
                                      onClick={() => solicitarQuitarRepuesto(d)}
                                      title="Quitar insumo y devolver a inventario"
                                    >
                                      {quitandoRepuestoId === d.id ? (
                                        <span className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                                      ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <div className={styles.emptyRepuestosBox}>
                          No hay insumos de taller registrados en esta orden.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PESTAÑA 3: FICHA DE INGRESO Y CLIENTE */}
                {modalTab === 'ficha' && (
                  <div className={styles.detalleGrid}>
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
                          {otActual.vehiculo.marca} {otActual.vehiculo.modelo} {otActual.vehiculo.anio ? `(${otActual.vehiculo.anio})` : ''}
                        </span>
                      </div>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>Patente:</span>
                        <span className={styles.detalleInfoValue} style={{ fontFamily: 'monospace' }}>
                          {otActual.vehiculo.patente}
                        </span>
                      </div>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>Cliente:</span>
                        <span className={styles.detalleInfoValue}>
                          {otActual.vehiculo.cliente?.nombre || 'Sin cliente asignado'}
                        </span>
                      </div>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>RUT:</span>
                        <span className={styles.detalleInfoValue}>
                          {otActual.vehiculo.cliente?.rut || 'Sin RUT'}
                        </span>
                      </div>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>Teléfono:</span>
                        <span className={styles.detalleInfoValue}>
                          {otActual.vehiculo.cliente?.telefono || 'No registrado'}
                        </span>
                      </div>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>Correo:</span>
                        <span className={styles.detalleInfoValue}>
                          {otActual.vehiculo.cliente?.email || 'No registrado'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.detalleCard}>
                      <h4 className={styles.detalleCardTitle}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>Checklist de Recepción</span>
                      </h4>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>Kilometraje al Ingreso:</span>
                        <span className={styles.detalleInfoValue}>
                          {(otActual.kilometrajeRecepcion ?? otActual.vehiculo?.kilometraje) != null
                            ? `${(otActual.kilometrajeRecepcion ?? otActual.vehiculo?.kilometraje)!.toLocaleString('es-CL')} km`
                            : 'No registrado'}
                        </span>
                      </div>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>Nivel de Combustible:</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span className={styles.fuelBadge}>
                            <span>{otActual.nivelCombustible || 'No indicado'}</span>
                          </span>
                          {otActual.nivelCombustible && (
                            <div className={styles.miniFuelBar} title={`Nivel registrado: ${otActual.nivelCombustible}`}>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((seg) => (
                                <div
                                  key={seg}
                                  className={`${styles.miniFuelSegment} ${
                                    seg <= getFilledSegments(otActual.nivelCombustible || '')
                                      ? styles.miniFuelSegmentFilled
                                      : ''
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.detalleInfoRow}>
                        <span className={styles.detalleInfoLabel}>Fecha de Recepción:</span>
                        <span className={styles.detalleInfoValue}>
                          {new Date(otActual.fechaRecepcion).toLocaleString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <span className={styles.detalleInfoLabel}>Rayones / Daños Carrocería:</span>
                          {(() => {
                            const parsed = parsearRegistroCarroceria(otActual.rayonesCarroceria);
                            if (parsed.danios.length > 0) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspeccionDetalleData(parsed);
                                    setShowInspeccionDetalleModal(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid #3b82f6',
                                    color: '#3b82f6',
                                    borderRadius: '5px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                                    <circle cx="7" cy="17" r="2" />
                                    <path d="M9 17h6" />
                                    <circle cx="17" cy="17" r="2" />
                                  </svg>
                                  <span>Ver Mapa de Daños ({parsed.danios.length})</span>
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          {(() => {
                            const parsed = parsearRegistroCarroceria(otActual.rayonesCarroceria);
                            return parsed.resumen || otActual.rayonesCarroceria || 'Sin rayones ni daños declarados';
                          })()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <span className={styles.detalleInfoLabel}>Elementos de Valor Declarados:</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          {otActual.elementosValor || 'Sin elementos de valor declarados'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Unificado con Transición de Estado y Guardar */}
              <div className={styles.modalFooter}>
                <div className={styles.modalFooterStepWrapper}>
                  {/* Botón de Transición Secuencial */}
                  {pasoSiguiente ? (
                    <button
                      type="button"
                      className={styles.btnNextStep}
                      disabled={actualizandoEstadoId === otActual.id}
                      onClick={() => handleCambiarEstado(otActual.id, pasoSiguiente.siguiente)}
                      title={`Avanzar al siguiente estado: ${pasoSiguiente.label}`}
                    >
                      {actualizandoEstadoId === otActual.id ? (
                        <>
                          <span className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                          <span>Actualizando estado...</span>
                        </>
                      ) : (
                        <>
                          <span>{pasoSiguiente.label}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </>
                      )}
                    </button>
                  ) : otActual.estado === 'COTIZACION' ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'inline-block', width: '100%', textAlign: 'center' }}>
                      En espera de aprobación comercial en Cotizaciones
                    </span>
                  ) : otActual.estado === 'ENTREGADO' ? (
                    <span style={{ fontSize: '12px', color: '#047857', background: '#d1fae5', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Vehículo Entregado al Cliente</span>
                    </span>
                  ) : null}
                </div>

                <div className={styles.modalFooterActionsWrapper}>
                  <button
                    type="button"
                    className={styles.btnActionSecondary}
                    onClick={() => setShowGestionModal(false)}
                  >
                    Cerrar
                  </button>

                  {userRole !== 'MECANICO' && (
                    <button
                      type="button"
                      className={styles.btnWhatsApp}
                      disabled={cargandoWhatsappId === otActual.id}
                      onClick={() => handleGenerarWhatsapp(otActual.id)}
                      title="Notificar por WhatsApp"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      <span>WhatsApp</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleGuardarTecnico}
                    disabled={guardandoTecnico}
                  >
                    {guardandoTecnico ? (
                      <>
                        <span className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: NOTIFICACIÓN POR WHATSAPP (SCRUM-20) */}
      {showWhatsappModal && whatsappData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
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
                title="Cerrar modal"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '13px', color: '#065f46', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><strong>Destinatario:</strong> +{whatsappData.telefono || 'Sin número definido'}</span>
                  <span style={{ fontSize: '11px', color: '#047857', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    Mensaje Editable
                  </span>
                </div>
                <textarea
                  value={textoWhatsappEditado}
                  onChange={(e) => setTextoWhatsappEditado(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    fontFamily: 'inherit',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    color: '#1f2937',
                    background: '#ffffff',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                  placeholder="Redacta o ajusta el mensaje para el cliente..."
                />
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Puedes editar directamente el texto antes de enviar. Al pulsar el botón se abrirá WhatsApp con el mensaje personalizado.
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
                onClick={() => {
                  const fonoLimpio = (whatsappData.telefono || '').replace(/\D/g, '');
                  const encoded = encodeURIComponent(textoWhatsappEditado);
                  const urlFinal = fonoLimpio
                    ? `https://wa.me/${fonoLimpio}?text=${encoded}`
                    : `https://wa.me/?text=${encoded}`;
                  window.open(urlFinal, '_blank');
                }}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
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

      {/* Modal de Inspección Visual de Carrocería (Creación de OT) */}
      <InspeccionCarroceriaModal
        isOpen={showInspeccionModal}
        onClose={() => setShowInspeccionModal(false)}
        daniosIniciales={daniosCarroceria}
        textoInicial={nuevosRayones}
        onGuardar={(daniosActualizados, textoSerializado) => {
          setDaniosCarroceria(daniosActualizados);
          const parsed = parsearRegistroCarroceria(textoSerializado);
          if (parsed.resumen && (!nuevosRayones.trim() || nuevosRayones === 'Sin daños ni rayones visibles')) {
            setNuevosRayones(parsed.resumen);
          }
        }}
      />

      {/* Modal de Inspección Visual de Carrocería (Vista Detalle OT - Sólo lectura) */}
      <InspeccionCarroceriaModal
        isOpen={showInspeccionDetalleModal}
        onClose={() => setShowInspeccionDetalleModal(false)}
        daniosIniciales={inspeccionDetalleData.danios}
        textoInicial={inspeccionDetalleData.resumen}
        readOnly={true}
      />
    </div>
  );
}

