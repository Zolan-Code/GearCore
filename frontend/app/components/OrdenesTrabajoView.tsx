'use client';

import { useEffect, useState, useRef } from 'react';
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

  // Modal Unificado de Gestión de OT (3 pestañas)
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [modalTab, setModalTab] = useState<'tecnico' | 'repuestos' | 'ficha'>('tecnico');
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
  const [textoWhatsappEditado, setTextoWhatsappEditado] = useState('');
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
    setNuevaFotoUrl('');
    setHorasInput('');
    setComentarioHoras('');
    setRepuestoSeleccionadoId('');
    setCantidadRepuesto('1');
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
        loading={loadingOTs}
        loadingMessage="Cargando órdenes de trabajo..."
        error={errorOTs ? errOTs : null}
        errorMessage={`Error al consultar órdenes: ${(errOTs as any)?.message || 'Error del servidor'}`}
        onRetry={() => refetchOTs()}
        emptyMessage="No se encontraron órdenes de trabajo con los filtros aplicados."
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
                    +{ot.vehiculo.cliente.telefono}
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
                    onClick={() => handleGenerarWhatsapp(ot.id)}
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

      {/* MODAL UNIFICADO: GESTIÓN DE ORDEN DE TRABAJO (3 PESTAÑAS) */}
      {showGestionModal && selectedOT && (() => {
        const otActual = ordenes.find((o) => o.id === selectedOT.id) || selectedOT;
        const estadoObj = ESTADOS_OT.find((e) => e.id === otActual.estado) || ESTADOS_OT[0];
        const estadoIdx = ESTADOS_OT.findIndex((e) => e.id === otActual.estado);
        const pasoSiguiente = getSiguientePaso(otActual.estado);
        const repuestosAsignados = otActual.detalleRepuestos || [];
        const totalRepuestos = repuestosAsignados.reduce(
          (acc, item) => acc + item.cantidad * item.precioUnitario,
          0
        );

        return (
          <div className={styles.modalOverlay} onClick={() => setShowGestionModal(false)}>
            <div className={styles.modalContentLarge} onClick={(e) => e.stopPropagation()}>
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
                  ✕
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
                  <span>1. Diagnóstico & Reparación</span>
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
                  <span>2. Repuestos & Materiales</span>
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
                  <span>3. Ficha & Recepción</span>
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
                            <span>
                              🔒 La bitácora de reparación y ejecución se habilitará automáticamente una vez que la cotización sea <strong>aprobada por el cliente</strong>.
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

                        <div className={styles.urlInputRow}>
                          <input
                            type="url"
                            className={styles.formInput}
                            style={{ flex: 1 }}
                            placeholder="O pegar URL de imagen..."
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
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PESTAÑA 2: REPUESTOS Y MATERIALES */}
                {modalTab === 'repuestos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Repuestos Asignados ({repuestosAsignados.length})
                      </h4>
                      {userRole !== 'MECANICO' && repuestosAsignados.length > 0 && (
                        <strong style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>
                          Total: ${totalRepuestos.toLocaleString('es-CL')} CLP
                        </strong>
                      )}
                    </div>

                    {repuestosAsignados.length > 0 ? (
                      <div className={styles.repuestosTableWrapper}>
                        <table className={styles.repuestosTable}>
                          <thead>
                            <tr>
                              <th>Código</th>
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
                            {repuestosAsignados.map((d) => (
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
                        Aún no se han asignado repuestos a esta orden de trabajo.
                      </div>
                    )}

                    {/* Formulario para añadir repuesto */}
                    <div className={styles.repuestoAddForm}>
                      <div className={styles.repuestoSelectWrapper}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
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
                          <option value="">-- Seleccionar repuesto --</option>
                          {catalogoRepuestos.map((r) => {
                            const disponible = r.stock > 0;
                            return (
                              <option key={r.id} value={r.id} disabled={!disponible}>
                                [{r.codigo}] {r.nombre} — {disponible ? `Stock: ${r.stock} uds` : 'AGOTADO'}
                                {userRole !== 'MECANICO' ? ` — $${r.precioVenta.toLocaleString('es-CL')}` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className={styles.repuestoQtyWrapper}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Cant:
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
                        className={styles.btnPrimary}
                        style={{ alignSelf: 'flex-end', padding: '10px 14px', fontSize: '13px' }}
                        disabled={!repuestoSeleccionadoId || guardandoRepuestoOT}
                        onClick={handleAgregarRepuestoOT}
                      >
                        {guardandoRepuestoOT ? 'Asociando...' : '+ Añadir a OT'}
                      </button>
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
                        <span className={styles.fuelBadge}>
                          <span>{otActual.nivelCombustible || 'No indicado'}</span>
                        </span>
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <span className={styles.detalleInfoLabel}>Rayones / Daños Carrocería:</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          {otActual.rayonesCarroceria || 'Sin rayones ni daños declarados'}
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
              <div className={styles.modalFooter} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      En espera de aprobación comercial en Cotizaciones
                    </span>
                  ) : otActual.estado === 'ENTREGADO' ? (
                    <span style={{ fontSize: '12px', color: '#047857', background: '#d1fae5', padding: '6px 12px', borderRadius: '8px', fontWeight: 600 }}>
                      ✓ Vehículo Entregado al Cliente
                    </span>
                  ) : null}

                  {userRole !== 'MECANICO' && (
                    <button
                      type="button"
                      className={styles.btnWhatsApp}
                      style={{ padding: '8px 12px', fontSize: '12.5px' }}
                      disabled={cargandoWhatsappId === otActual.id}
                      onClick={() => handleGenerarWhatsapp(otActual.id)}
                      title="Notificar por WhatsApp"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={styles.btnActionSecondary}
                    onClick={() => setShowGestionModal(false)}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleGuardarTecnico}
                    disabled={guardandoTecnico}
                  >
                    {guardandoTecnico ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

