'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../../lib/api';
import styles from './ordenes-trabajo.module.css';

interface Mecanico {
  id: string;
  nombre: string;
  email: string;
}

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

type EstadoOT =
  | 'RECIBIDO'
  | 'DIAGNOSTICO'
  | 'COTIZACION'
  | 'APROBADO'
  | 'EN_REPARACION'
  | 'CONTROL_CALIDAD'
  | 'ENTREGADO';

interface OrdenTrabajo {
  id: string;
  vehiculoId: string;
  mecanicoId: string | null;
  fallaReportada: string;
  estado: EstadoOT;
  horasHombre: number;
  fechaRecepcion: string;
  fechaEntrega: string | null;
  nivelCombustible: string | null;
  rayonesCarroceria: string | null;
  elementosValor: string | null;
  kilometrajeRecepcion: number | null;
  diagnostico: string | null;
  trabajoRealizado: string | null;
  fotosDiagnostico: string[];
  creadoEn: string;
  vehiculo: {
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
      email: string | null;
    };
  };
  mecanico: {
    id: string;
    nombre: string;
    email: string;
  } | null;
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
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  // Carga inicial
  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [otsRes, mecsRes] = await Promise.all([
        fetchWithAuth<OrdenTrabajo[]>('/ordenes-trabajo'),
        fetchWithAuth<Mecanico[]>('/ordenes-trabajo/mecanicos'),
      ]);
      setOrdenes(otsRes || []);
      setMecanicos(mecsRes || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar órdenes de trabajo.');
    } finally {
      setLoading(false);
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
      const updated = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${otId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      setOrdenes((prev) => prev.map((ot) => (ot.id === otId ? updated : ot)));
      if (selectedOT && selectedOT.id === otId) {
        setSelectedOT(updated);
      }
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    } finally {
      setActualizandoEstadoId(null);
    }
  }

  // Crear OT (SCRUM-10, 11)
  async function handleCrearOT(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehiculo) {
      alert('Debes seleccionar un vehículo para la orden.');
      return;
    }
    if (!nuevaFalla.trim()) {
      alert('Debes ingresar la falla reportada o motivo de ingreso.');
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

      const nuevaOt = await fetchWithAuth<OrdenTrabajo>('/ordenes-trabajo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setOrdenes((prev) => [nuevaOt, ...prev]);
      setShowCrearModal(false);
      resetCrearForm();
    } catch (err: any) {
      alert(`Error al crear la OT: ${err.message}`);
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
  function abrirModalTecnico(ot: OrdenTrabajo) {
    setSelectedOT(ot);
    setEditDiagnostico(ot.diagnostico || '');
    setEditTrabajo(ot.trabajoRealizado || '');
    setEditFotos(ot.fotosDiagnostico || []);
    setNuevaFotoUrl('');
    setHorasInput('');
    setComentarioHoras('');
    setShowTecnicoModal(true);
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
      alert('Error al procesar imágenes: ' + err.message);
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
      const updated = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${selectedOT.id}/diagnostico`, {
        method: 'PATCH',
        body: JSON.stringify({
          diagnostico: editDiagnostico,
          trabajoRealizado: editTrabajo,
          fotosDiagnostico: editFotos,
        }),
      });

      // Si se ingresaron horas
      let finalOT = updated;
      if (horasInput && parseFloat(horasInput) > 0) {
        finalOT = await fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${selectedOT.id}/horas`, {
          method: 'POST',
          body: JSON.stringify({
            horas: parseFloat(horasInput),
            comentario: comentarioHoras || undefined,
          }),
        });
      }

      setOrdenes((prev) => prev.map((ot) => (ot.id === finalOT.id ? finalOT : ot)));
      setSelectedOT(finalOT);
      setShowTecnicoModal(false);
    } catch (err: any) {
      alert(`Error al actualizar diagnóstico: ${err.message}`);
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
      alert(`Error al preparar WhatsApp: ${err.message}`);
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
          <h2 className={styles.headerTitle}>Órdenes de Trabajo (OT)</h2>
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
      {loading ? (
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
              <div key={ot.id} className={styles.otCard}>
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

                  {ot.fotosDiagnostico && ot.fotosDiagnostico.length > 0 && (
                    <div
                      className={styles.hoursPill}
                      style={{ background: '#f0fdf4', color: '#166534', cursor: 'pointer' }}
                      title={`${ot.fotosDiagnostico.length} foto(s) de diagnóstico. Clic para ver`}
                      onClick={() => abrirModalTecnico(ot)}
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
                  <div className={styles.selectWrapper}>
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
                    onClick={() => abrirModalTecnico(ot)}
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
                    onClick={() => handleGenerarWhatsapp(ot.id)}
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
    </div>
  );
}

