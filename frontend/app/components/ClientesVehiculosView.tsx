'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './clientes-vehiculos.module.css';
import { fetchWithAuth } from '../../lib/api';
import {
  validarRutChileno,
  formatearRut,
  validarPatenteChilena,
  formatearPatente,
} from '../../lib/validators';

interface Cliente {
  id: string;
  nombre: string;
  rut: string;
  telefono?: string | null;
  email?: string | null;
  creadoEn: string;
  vehiculos?: Vehiculo[];
  _count?: {
    vehiculos: number;
  };
}

interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  vin?: string | null;
  anio?: number | null;
  kilometraje?: number | null;
  clienteId: string;
  cliente?: Cliente;
  creadoEn: string;
  _count?: {
    ordenes: number;
  };
}

interface OrdenTrabajoHistorial {
  id: string;
  vehiculoId: string;
  fallaReportada: string;
  estado: string;
  horasHombre: number;
  fechaRecepcion: string;
  fechaEntrega?: string | null;
  creadoEn: string;
  mecanico?: {
    id: string;
    nombre: string;
    email: string;
  } | null;
  detalleRepuestos?: Array<{
    id: string;
    cantidad: number;
    precioUnitario: number;
    repuesto: {
      id: string;
      codigo: string;
      nombre: string;
    };
  }>;
}

interface ClientesVehiculosProps {
  userRole?: string;
}

export default function ClientesVehiculosView({ userRole }: ClientesVehiculosProps) {
  // Estado para autocompletado y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Vehiculo[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (userRole === 'MECANICO') {
    return (
      <div className={styles.emptyState} style={{ padding: '48px 24px' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div className={styles.emptyStateTitle} style={{ color: '#0f172a' }}>Acceso Restringido</div>
        <div className={styles.emptyStateText}>
          El rol <strong>Mecánico</strong> no tiene permisos para acceder a la Gestión de Clientes y Vehículos.
          Este módulo está reservado para <strong>Recepcionista</strong> y <strong>Administrador</strong>.
        </div>
      </div>
    );
  }

  // Vehículo seleccionado y su historial de OTs
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);
  const [otHistory, setOtHistory] = useState<OrdenTrabajoHistorial[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Lista general de clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  // Modales
  const [showModalCliente, setShowModalCliente] = useState(false);
  const [showModalVehiculo, setShowModalVehiculo] = useState(false);

  // Formulario Nuevo Cliente
  const [formCliente, setFormCliente] = useState({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
  });
  const [clienteError, setClienteError] = useState<string | null>(null);
  const [clienteSuccess, setClienteSuccess] = useState<string | null>(null);
  const [savingCliente, setSavingCliente] = useState(false);

  // Formulario Nuevo Vehículo
  const [formVehiculo, setFormVehiculo] = useState({
    clienteId: '',
    patente: '',
    marca: '',
    modelo: '',
    vin: '',
    anio: '',
    kilometraje: '',
  });
  const [vehiculoError, setVehiculoError] = useState<string | null>(null);
  const [vehiculoSuccess, setVehiculoSuccess] = useState<string | null>(null);
  const [savingVehiculo, setSavingVehiculo] = useState(false);

  // Buscador de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ficha de detalle de cliente y sus vehículos (Modal)
  const [selectedClienteModal, setSelectedClienteModal] = useState<Cliente | null>(null);
  const [loadingClienteModal, setLoadingClienteModal] = useState(false);
  const [showClienteDetailModal, setShowClienteDetailModal] = useState(false);

  async function handleOpenClienteModal(clienteId: string) {
    setShowClienteDetailModal(true);
    setLoadingClienteModal(true);
    setSelectedClienteModal(null);
    try {
      const data = await fetchWithAuth<Cliente>(`/clientes/${clienteId}`);
      setSelectedClienteModal(data);
    } catch (err) {
      console.error('Error cargando ficha de cliente:', err);
    } finally {
      setLoadingClienteModal(false);
    }
  }

  // Cargar lista inicial de clientes
  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes(filtro?: string) {
    setLoadingClientes(true);
    try {
      const query = filtro && filtro.trim() ? `?q=${encodeURIComponent(filtro.trim())}` : '';
      const data = await fetchWithAuth<Cliente[]>(`/clientes${query}`);
      setClientes(data || []);
    } catch (err: any) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoadingClientes(false);
    }
  }

  function handleClientSearchChange(term: string) {
    setClientSearchTerm(term);
    if (clientSearchTimeoutRef.current) {
      clearTimeout(clientSearchTimeoutRef.current);
    }
    clientSearchTimeoutRef.current = setTimeout(() => {
      cargarClientes(term);
    }, 250);
  }

  // Autocompletado de patente predictivo (SCRUM-16)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const term = searchTerm.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await fetchWithAuth<Vehiculo[]>(
          `/vehiculos/buscar?patente=${encodeURIComponent(term)}`,
        );
        setSuggestions(results || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Error en búsqueda predictiva:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  // Seleccionar vehículo y cargar su historial de OTs (SCRUM-17)
  async function handleSelectVehiculo(vehiculo: Vehiculo) {
    setSelectedVehiculo(vehiculo);
    setShowDropdown(false);
    setSearchTerm(vehiculo.patente);
    setLoadingHistory(true);

    try {
      const [vehiculoDetalle, historial] = await Promise.all([
        fetchWithAuth<Vehiculo>(`/vehiculos/${vehiculo.id}`),
        fetchWithAuth<OrdenTrabajoHistorial[]>(`/vehiculos/${vehiculo.id}/historial`),
      ]);
      setSelectedVehiculo(vehiculoDetalle);
      setOtHistory(historial || []);
    } catch (err: any) {
      console.error('Error cargando historial de OT:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Guardar nuevo cliente (SCRUM-14 & SCRUM-18)
  async function handleSubmitCliente(e: React.FormEvent) {
    e.preventDefault();
    setClienteError(null);
    setClienteSuccess(null);

    if (!formCliente.nombre.trim()) {
      setClienteError('El nombre del cliente es obligatorio.');
      return;
    }

    if (!validarRutChileno(formCliente.rut)) {
      setClienteError('El RUT ingresado no es válido (use formato 12.345.678-K).');
      return;
    }

    setSavingCliente(true);
    try {
      const nuevoCliente = await fetchWithAuth<Cliente>('/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nombre: formCliente.nombre.trim(),
          rut: formatearRut(formCliente.rut),
          telefono: formCliente.telefono.trim() || undefined,
          email: formCliente.email.trim() || undefined,
        }),
      });

      setClienteSuccess(`Cliente ${nuevoCliente.nombre} registrado con éxito.`);
      setFormCliente({ nombre: '', rut: '', telefono: '', email: '' });
      await cargarClientes();

      setTimeout(() => {
        setShowModalCliente(false);
        setClienteSuccess(null);
      }, 1200);
    } catch (err: any) {
      setClienteError(err.message || 'Error al guardar cliente.');
    } finally {
      setSavingCliente(false);
    }
  }

  // Guardar nuevo vehículo (SCRUM-15 & SCRUM-18)
  async function handleSubmitVehiculo(e: React.FormEvent) {
    e.preventDefault();
    setVehiculoError(null);
    setVehiculoSuccess(null);

    if (!formVehiculo.clienteId) {
      setVehiculoError('Debe seleccionar el cliente dueño del vehículo.');
      return;
    }

    if (!validarPatenteChilena(formVehiculo.patente)) {
      setVehiculoError('La patente debe tener formato chileno válido (ej: BBBB10 o AA1000).');
      return;
    }

    if (!formVehiculo.marca.trim() || !formVehiculo.modelo.trim()) {
      setVehiculoError('Marca y modelo son obligatorios.');
      return;
    }

    setSavingVehiculo(true);
    try {
      const payload: any = {
        clienteId: formVehiculo.clienteId,
        patente: formatearPatente(formVehiculo.patente),
        marca: formVehiculo.marca.trim(),
        modelo: formVehiculo.modelo.trim(),
        vin: formVehiculo.vin.trim() || undefined,
        anio: formVehiculo.anio ? parseInt(formVehiculo.anio, 10) : undefined,
        kilometraje: formVehiculo.kilometraje
          ? parseInt(formVehiculo.kilometraje, 10)
          : undefined,
      };

      const nuevoVehiculo = await fetchWithAuth<Vehiculo>('/vehiculos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setVehiculoSuccess(`Vehículo patente ${nuevoVehiculo.patente} registrado con éxito.`);
      setFormVehiculo({
        clienteId: '',
        patente: '',
        marca: '',
        modelo: '',
        vin: '',
        anio: '',
        kilometraje: '',
      });
      await cargarClientes();

      // Seleccionar automáticamente el vehículo creado para ver su ficha
      await handleSelectVehiculo(nuevoVehiculo);

      setTimeout(() => {
        setShowModalVehiculo(false);
        setVehiculoSuccess(null);
      }, 1200);
    } catch (err: any) {
      setVehiculoError(err.message || 'Error al guardar vehículo.');
    } finally {
      setSavingVehiculo(false);
    }
  }

  // Validaciones en tiempo real para feedback de formularios
  const isRutValid = formCliente.rut ? validarRutChileno(formCliente.rut) : null;
  const isPatenteValid = formVehiculo.patente
    ? validarPatenteChilena(formVehiculo.patente)
    : null;

  return (
    <div className={styles.container}>
      {/* Barra de Búsqueda y Acciones */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar vehículo por patente (autocompletado, ej: BBCL10)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => {
                setSearchTerm('');
                setSuggestions([]);
                setShowDropdown(false);
              }}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}

          {/* Menú de Autocompletado Predictivo (SCRUM-16) */}
          {showDropdown && suggestions.length > 0 && (
            <div className={styles.autocompleteDropdown}>
              {suggestions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={styles.autocompleteItem}
                  onClick={() => handleSelectVehiculo(v)}
                >
                  <div className={styles.autocompleteInfo}>
                    <span className={styles.autocompleteVehicle}>
                      {v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ''}
                    </span>
                    <span className={styles.autocompleteClient}>
                      Cliente: {v.cliente?.nombre} • RUT: {v.cliente?.rut}
                    </span>
                  </div>
                  <span className={styles.patentePlateMini}>{v.patente}</span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && !isSearching && suggestions.length === 0 && searchTerm.trim().length >= 2 && (
            <div className={styles.autocompleteDropdown}>
              <div style={{ padding: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                No se encontraron vehículos con la patente <strong>{searchTerm.toUpperCase()}</strong>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              setClienteError(null);
              setClienteSuccess(null);
              setShowModalCliente(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Nuevo Cliente</span>
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setVehiculoError(null);
              setVehiculoSuccess(null);
              setShowModalVehiculo(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            <span>Nuevo Vehículo</span>
          </button>
        </div>
      </div>

      {/* Detalle del Vehículo Seleccionado (SCRUM-15, SCRUM-16, SCRUM-17) */}
      {selectedVehiculo ? (
        <div className={styles.vehicleHeroCard}>
          <div className={styles.heroHeader}>
            <div className={styles.plateContainer}>
              <div className={styles.chilePlateBadge}>
                <span className={styles.plateCountry}>CHILE</span>
                <span className={styles.plateText}>{selectedVehiculo.patente}</span>
              </div>
              <div className={styles.vehicleTitle}>
                <h3>
                  {selectedVehiculo.marca} {selectedVehiculo.modelo}
                </h3>
                <p>
                  Propietario:{' '}
                  <strong>{selectedVehiculo.cliente?.nombre || 'Sin cliente asignado'}</strong> (RUT:{' '}
                  {selectedVehiculo.cliente?.rut})
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                setSelectedVehiculo(null);
                setSearchTerm('');
              }}
            >
              Cerrar Ficha
            </button>
          </div>

          <div className={styles.specsGrid}>
            <div className={styles.specItem}>
              <span>Año Fabricación</span>
              <strong>{selectedVehiculo.anio || 'No registrado'}</strong>
            </div>
            <div className={styles.specItem}>
              <span>Kilometraje</span>
              <strong>
                {selectedVehiculo.kilometraje
                  ? `${selectedVehiculo.kilometraje.toLocaleString()} km`
                  : 'No registrado'}
              </strong>
            </div>
            <div className={styles.specItem}>
              <span>N° Chasis / VIN</span>
              <strong>{selectedVehiculo.vin || 'No registrado'}</strong>
            </div>
            <div className={styles.specItem}>
              <span>Teléfono Cliente</span>
              <strong>{selectedVehiculo.cliente?.telefono || 'No registrado'}</strong>
            </div>
          </div>

          {/* Historial Completo de Órdenes de Trabajo (SCRUM-17) */}
          <div className={styles.historySection}>
            <div className={styles.sectionHeader}>
              <h4>
                <span>Historial de Órdenes de Trabajo</span>
                <span className={styles.historyCountBadge}>
                  {otHistory.length} órdenes registradas
                </span>
              </h4>
            </div>

            {loadingHistory ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>Cargando historial de trabajo...</p>
            ) : otHistory.length > 0 ? (
              <div className={styles.historyList}>
                {otHistory.map((ot) => {
                  const statusClass = (styles as any)[`status_${ot.estado}`] || styles.statusBadge;
                  return (
                    <div key={ot.id} className={styles.otCard}>
                      <div className={styles.otCardHeader}>
                        <span className={styles.otNumber}>OT #{ot.id.slice(0, 8)}</span>
                        <span className={`${styles.statusBadge} ${statusClass}`}>
                          {ot.estado.replace('_', ' ')}
                        </span>
                        <span className={styles.otDate}>
                          Ingreso: {new Date(ot.fechaRecepcion).toLocaleDateString('es-CL')}
                        </span>
                      </div>

                      <div className={styles.otFailure}>
                        <strong>Diagnóstico / Falla:</strong> {ot.fallaReportada}
                      </div>

                      <div className={styles.otMeta}>
                        <div>
                          Mecánico asignado:{' '}
                          <strong>{ot.mecanico?.nombre || 'Sin asignar'}</strong>
                        </div>
                        <div>
                          Horas Hombre: <strong>{ot.horasHombre} hrs</strong>
                        </div>
                        {ot.fechaEntrega && (
                          <div>
                            Entrega:{' '}
                            <strong>
                              {new Date(ot.fechaEntrega).toLocaleDateString('es-CL')}
                            </strong>
                          </div>
                        )}
                      </div>

                      {ot.detalleRepuestos && ot.detalleRepuestos.length > 0 && (
                        <div className={styles.otParts}>
                          {ot.detalleRepuestos.map((dp) => (
                            <span key={dp.id} className={styles.partPill}>
                              {dp.repuesto.nombre} (x{dp.cantidad})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <div className={styles.emptyStateTitle}>Sin órdenes de trabajo previas</div>
                <div className={styles.emptyStateText}>
                  Este vehículo aún no cuenta con mantenimientos u órdenes registradas en el sistema.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vista de Bienvenida o Estado Vacío antes de buscar */
        <div className={styles.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <div className={styles.emptyStateTitle}>Consulta rápida de Vehículos</div>
          <div className={styles.emptyStateText}>
            Escribe la patente en el buscador superior para autocompletar y ver el historial técnico,
            o registra un nuevo cliente y vehículo.
          </div>
        </div>
      )}

      {/* Directorio de Clientes Registrados */}
      <div className={styles.clientsSection}>
        <div className={styles.sectionHeader}>
          <h4>
            <span>Directorio de Clientes Registrados</span>
            <span className={styles.historyCountBadge}>{clientes.length} Clientes</span>
          </h4>
        </div>

        {/* Buscador de Clientes en Tiempo Real */}
        <div className={styles.clientSearchWrapper}>
          <span className={styles.searchIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className={styles.clientSearchInput}
            placeholder="Filtrar clientes por nombre, RUT o correo..."
            value={clientSearchTerm}
            onChange={(e) => handleClientSearchChange(e.target.value)}
          />
          {clientSearchTerm && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => handleClientSearchChange('')}
              title="Limpiar filtro"
            >
              ✕
            </button>
          )}
        </div>

        {loadingClientes ? (
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
            Buscando clientes...
          </p>
        ) : clientes.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.clientsTable}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Teléfono</th>
                  <th>Correo Electrónico</th>
                  <th>Vehículos</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button
                        type="button"
                        className={styles.clientLinkBtn}
                        onClick={() => handleOpenClienteModal(c.id)}
                        title="Ver ficha y vehículos del cliente"
                      >
                        {c.nombre}
                      </button>
                    </td>
                    <td>
                      <span className={styles.rutBadge}>{c.rut}</span>
                    </td>
                    <td>{c.telefono || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>
                      <button
                        type="button"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => handleOpenClienteModal(c.id)}
                        title="Ver vehículos del cliente"
                      >
                        <span className={styles.vehicleCountPill}>
                          {c._count?.vehiculos ?? c.vehiculos?.length ?? 0} vehículos
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState} style={{ marginTop: '12px' }}>
            <div className={styles.emptyStateTitle}>No hay clientes registrados</div>
            <div className={styles.emptyStateText}>
              Comienza registrando tu primer cliente con el botón "+ Nuevo Cliente".
            </div>
          </div>
        )}
      </div>

      {/* Modal Registrar Cliente (SCRUM-14 & SCRUM-18) */}
      {showModalCliente && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Registrar Nuevo Cliente</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowModalCliente(false)}
              >
                ✕
              </button>
            </div>

            {clienteError && (
              <div className={`${styles.alertBox} ${styles.alertError}`}>{clienteError}</div>
            )}
            {clienteSuccess && (
              <div className={`${styles.alertBox} ${styles.alertSuccess}`}>{clienteSuccess}</div>
            )}

            <form onSubmit={handleSubmitCliente} className={styles.formGrid}>
              <div className={styles.formField}>
                <label>
                  <span>Nombre Completo *</span>
                </label>
                <input
                  type="text"
                  required
                  className={styles.inputControl}
                  placeholder="Ej: Juan Pérez Morales"
                  value={formCliente.nombre}
                  onChange={(e) =>
                    setFormCliente({ ...formCliente, nombre: e.target.value })
                  }
                />
              </div>

              <div className={styles.formField}>
                <label>
                  <span>RUT *</span>
                  <span className={styles.fieldHint}>
                    {isRutValid === true && (
                      <span className={styles.fieldValid}>✓ Formato y DV válido</span>
                    )}
                    {isRutValid === false && (
                      <span className={styles.fieldInvalid}>✗ RUT o DV incorrecto</span>
                    )}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  className={`${styles.inputControl} ${
                    isRutValid === false ? styles.inputError : ''
                  }`}
                  placeholder="Ej: 12.345.678-5 o 12345678-K"
                  value={formCliente.rut}
                  onChange={(e) =>
                    setFormCliente({ ...formCliente, rut: e.target.value })
                  }
                />
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formField}>
                  <label>Teléfono</label>
                  <input
                    type="text"
                    className={styles.inputControl}
                    placeholder="+56 9 1234 5678"
                    value={formCliente.telefono}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, telefono: e.target.value })
                    }
                  />
                </div>
                <div className={styles.formField}>
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    className={styles.inputControl}
                    placeholder="cliente@correo.cl"
                    value={formCliente.email}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowModalCliente(false)}
                  disabled={savingCliente}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={savingCliente}
                >
                  {savingCliente ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Vehículo (SCRUM-15 & SCRUM-18) */}
      {showModalVehiculo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Registrar Nuevo Vehículo</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowModalVehiculo(false)}
              >
                ✕
              </button>
            </div>

            {vehiculoError && (
              <div className={`${styles.alertBox} ${styles.alertError}`}>{vehiculoError}</div>
            )}
            {vehiculoSuccess && (
              <div className={`${styles.alertBox} ${styles.alertSuccess}`}>{vehiculoSuccess}</div>
            )}

            <form onSubmit={handleSubmitVehiculo} className={styles.formGrid}>
              <div className={styles.formField}>
                <label>
                  <span>Cliente Dueño *</span>
                </label>
                <select
                  required
                  className={styles.inputControl}
                  value={formVehiculo.clienteId}
                  onChange={(e) =>
                    setFormVehiculo({ ...formVehiculo, clienteId: e.target.value })
                  }
                >
                  <option value="">-- Seleccione un cliente --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.rut})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formField}>
                  <label>
                    <span>Patente *</span>
                    <span className={styles.fieldHint}>
                      {isPatenteValid === true && (
                        <span className={styles.fieldValid}>✓ Válida</span>
                      )}
                      {isPatenteValid === false && (
                        <span className={styles.fieldInvalid}>✗ Inválida</span>
                      )}
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={7}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                    className={`${styles.inputControl} ${
                      isPatenteValid === false ? styles.inputError : ''
                    }`}
                    placeholder="BBBB10 o AA1000"
                    value={formVehiculo.patente}
                    onChange={(e) =>
                      setFormVehiculo({
                        ...formVehiculo,
                        patente: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>

                <div className={styles.formField}>
                  <label>N° VIN / Chasis</label>
                  <input
                    type="text"
                    className={styles.inputControl}
                    placeholder="Opcional"
                    value={formVehiculo.vin}
                    onChange={(e) =>
                      setFormVehiculo({ ...formVehiculo, vin: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formField}>
                  <label>Marca *</label>
                  <input
                    type="text"
                    required
                    className={styles.inputControl}
                    placeholder="Ej: Toyota, Hyundai"
                    value={formVehiculo.marca}
                    onChange={(e) =>
                      setFormVehiculo({ ...formVehiculo, marca: e.target.value })
                    }
                  />
                </div>
                <div className={styles.formField}>
                  <label>Modelo *</label>
                  <input
                    type="text"
                    required
                    className={styles.inputControl}
                    placeholder="Ej: Yaris, Accent"
                    value={formVehiculo.modelo}
                    onChange={(e) =>
                      setFormVehiculo({ ...formVehiculo, modelo: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formField}>
                  <label>Año Fabricación</label>
                  <input
                    type="number"
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    className={styles.inputControl}
                    placeholder="Ej: 2020"
                    value={formVehiculo.anio}
                    onChange={(e) =>
                      setFormVehiculo({ ...formVehiculo, anio: e.target.value })
                    }
                  />
                </div>
                <div className={styles.formField}>
                  <label>Kilometraje (km)</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.inputControl}
                    placeholder="Ej: 45000"
                    value={formVehiculo.kilometraje}
                    onChange={(e) =>
                      setFormVehiculo({
                        ...formVehiculo,
                        kilometraje: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowModalVehiculo(false)}
                  disabled={savingVehiculo}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={savingVehiculo}
                >
                  {savingVehiculo ? 'Guardando...' : 'Guardar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha y Vehículos del Cliente */}
      {showClienteDetailModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '620px' }}>
            <div className={styles.modalHeader}>
              <h3>Ficha del Cliente</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowClienteDetailModal(false)}
              >
                ✕
              </button>
            </div>

            {loadingClienteModal ? (
              <p style={{ fontSize: '13px', color: '#64748b', padding: '16px 0' }}>
                Cargando información del cliente...
              </p>
            ) : selectedClienteModal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>
                      {selectedClienteModal.nombre}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>
                      Cliente registrado el {new Date(selectedClienteModal.creadoEn).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <span className={styles.rutBadge} style={{ fontSize: '13px', padding: '4px 8px' }}>
                    {selectedClienteModal.rut}
                  </span>
                </div>

                <div className={styles.specsGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className={styles.specItem}>
                    <span>Teléfono</span>
                    <strong>{selectedClienteModal.telefono || 'No registrado'}</strong>
                  </div>
                  <div className={styles.specItem}>
                    <span>Correo Electrónico</span>
                    <strong>{selectedClienteModal.email || 'No registrado'}</strong>
                  </div>
                </div>

                <div>
                  <div className={styles.sectionHeader} style={{ marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                      Vehículos Asociados ({selectedClienteModal.vehiculos?.length || 0})
                    </h4>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      style={{ padding: '5px 12px', fontSize: '12px' }}
                      onClick={() => {
                        setShowClienteDetailModal(false);
                        setFormVehiculo({
                          ...formVehiculo,
                          clienteId: selectedClienteModal.id,
                        });
                        setShowModalVehiculo(true);
                      }}
                    >
                      + Asociar Vehículo
                    </button>
                  </div>

                  {selectedClienteModal.vehiculos && selectedClienteModal.vehiculos.length > 0 ? (
                    <div className={styles.clientVehicleList}>
                      {selectedClienteModal.vehiculos.map((v) => (
                        <div key={v.id} className={styles.clientVehicleCard}>
                          <div className={styles.clientVehicleInfo}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={styles.patentePlateMini}>{v.patente}</span>
                              <span className={styles.clientVehicleTitle}>
                                {v.marca} {v.modelo}
                              </span>
                            </div>
                            <span className={styles.clientVehicleMeta}>
                              Año: {v.anio || '—'} • {v.kilometraje ? `${v.kilometraje.toLocaleString()} km` : 'Sin km'} {v.vin ? `• VIN: ${v.vin}` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={styles.btnViewVehicle}
                            onClick={() => {
                              setShowClienteDetailModal(false);
                              handleSelectVehiculo(v);
                            }}
                          >
                            <span>Ver Historial OT</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyState} style={{ padding: '20px', marginTop: '6px' }}>
                      <div className={styles.emptyStateText} style={{ fontSize: '12px' }}>
                        Este cliente aún no tiene vehículos registrados.
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setShowClienteDetailModal(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#ef4444' }}>No se pudo cargar la información del cliente.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
