'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../lib/api';
import styles from './inventario.module.css';

type Rol = 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';

interface Repuesto {
  id: string;
  codigo: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  creadoEn: string;
  margenMoneda: number;
  margenPorcentaje: number;
  enAlerta: boolean;
  agotado: boolean;
  _count?: {
    usosEnOT: number;
  };
  movimientos?: Movimiento[];
}

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string | null;
  ordenTrabajoId: string | null;
  creadoEn: string;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    rol: Rol;
  } | null;
}

interface KPIs {
  totalRepuestos: number;
  valorTotalInventario: number;
  totalStockBajo: number;
  totalAgotados: number;
}

interface ConfirmModalState {
  title: string;
  message: string;
  subMessage?: string;
  confirmText: string;
  cancelText?: string;
  tipo: 'danger' | 'warning' | 'primary';
  onConfirm: () => Promise<void> | void;
}

interface NotifyModalState {
  title: string;
  message: string;
  subMessage?: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
}

interface Props {
  userRole: Rol;
}

export default function InventarioView({ userRole }: Props) {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [kpis, setKpis] = useState<KPIs>({
    totalRepuestos: 0,
    valorTotalInventario: 0,
    totalStockBajo: 0,
    totalAgotados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState<string>('TODOS');

  // Modales de Diálogo personalizados
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [notifyModal, setNotifyModal] = useState<NotifyModalState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Modal Crear / Editar Repuesto (SCRUM-22, SCRUM-40)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formStock, setFormStock] = useState<number>(0);
  const [formStockMinimo, setFormStockMinimo] = useState<number>(5);
  const [formPrecioCompra, setFormPrecioCompra] = useState<number>(0);
  const [formPrecioVenta, setFormPrecioVenta] = useState<number>(0);
  const [guardandoRepuesto, setGuardandoRepuesto] = useState(false);

  // Modal Ajuste de Stock Físico (SCRUM-26)
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [repuestoAjustar, setRepuestoAjustar] = useState<Repuesto | null>(null);
  const [stockFisicoContado, setStockFisicoContado] = useState<number>(0);
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);

  // Modal Importación CSV (SCRUM-25)
  const [showImportarModal, setShowImportarModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);

  // Modal Historial de Movimientos
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [repuestoHistorial, setRepuestoHistorial] = useState<Repuesto | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    cargarInventario();
  }, []);

  async function cargarInventario() {
    try {
      setLoading(true);
      const data = await fetchWithAuth<{ items: Repuesto[]; kpis: KPIs }>('/repuestos');
      setRepuestos(data.items || []);
      setKpis(
        data.kpis || {
          totalRepuestos: 0,
          valorTotalInventario: 0,
          totalStockBajo: 0,
          totalAgotados: 0,
        },
      );
    } catch (err: any) {
      setNotifyModal({
        title: 'Error de Conexión',
        message: `No se pudo obtener el inventario: ${err.message}`,
        tipo: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditandoId(null);
    setFormCodigo('');
    setFormNombre('');
    setFormStock(0);
    setFormStockMinimo(5);
    setFormPrecioCompra(0);
    setFormPrecioVenta(0);
  }

  function abrirCrearModal() {
    resetForm();
    setShowFormModal(true);
  }

  function abrirEditarModal(r: Repuesto) {
    setEditandoId(r.id);
    setFormCodigo(r.codigo);
    setFormNombre(r.nombre);
    setFormStock(r.stock);
    setFormStockMinimo(r.stockMinimo);
    setFormPrecioCompra(r.precioCompra);
    setFormPrecioVenta(r.precioVenta);
    setShowFormModal(true);
  }

  // Guardar (Crear o Editar) Repuesto (SCRUM-22)
  async function handleGuardarRepuesto(e: React.FormEvent) {
    e.preventDefault();
    if (!formCodigo.trim() || !formNombre.trim()) {
      setNotifyModal({
        title: 'Datos Incompletos',
        message: 'Por favor completa el código y nombre del repuesto.',
        tipo: 'warning',
      });
      return;
    }

    try {
      setGuardandoRepuesto(true);
      if (editandoId) {
        // Actualizar
        const payload: any = {
          codigo: formCodigo.trim(),
          nombre: formNombre.trim(),
          stockMinimo: formStockMinimo,
        };
        // Precios solo permitidos para Administrador (SCRUM-40)
        if (userRole === 'ADMINISTRADOR') {
          payload.precioCompra = formPrecioCompra;
          payload.precioVenta = formPrecioVenta;
        }

        const actualizado = await fetchWithAuth<Repuesto>(`/repuestos/${editandoId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        setShowFormModal(false);
        resetForm();
        await cargarInventario();
        setNotifyModal({
          title: 'Repuesto Actualizado',
          message: `El repuesto [${actualizado.codigo}] ha sido modificado exitosamente.`,
          tipo: 'success',
        });
      } else {
        // Crear
        const nuevo = await fetchWithAuth<Repuesto>('/repuestos', {
          method: 'POST',
          body: JSON.stringify({
            codigo: formCodigo.trim(),
            nombre: formNombre.trim(),
            stock: formStock,
            stockMinimo: formStockMinimo,
            precioCompra: formPrecioCompra,
            precioVenta: formPrecioVenta,
          }),
        });

        setShowFormModal(false);
        resetForm();
        await cargarInventario();
        setNotifyModal({
          title: '¡Repuesto Registrado!',
          message: `Repuesto [${nuevo.codigo}] "${nuevo.nombre}" añadido al inventario.`,
          tipo: 'success',
        });
      }
    } catch (err: any) {
      setNotifyModal({
        title: 'Error al Guardar',
        message: err.message || 'No se pudo guardar el repuesto.',
        tipo: 'error',
      });
    } finally {
      setGuardandoRepuesto(false);
    }
  }

  // Ajuste de Stock Físico (SCRUM-26)
  function abrirAjusteModal(r: Repuesto) {
    setRepuestoAjustar(r);
    setStockFisicoContado(r.stock);
    setMotivoAjuste('');
    setShowAjusteModal(true);
  }

  async function handleGuardarAjuste(e: React.FormEvent) {
    e.preventDefault();
    if (!repuestoAjustar) return;
    if (!motivoAjuste.trim()) {
      setNotifyModal({
        title: 'Motivo Requerido',
        message: 'Debes indicar el motivo o justificación del ajuste físico para fines de auditoría.',
        tipo: 'warning',
      });
      return;
    }

    try {
      setGuardandoAjuste(true);
      await fetchWithAuth(`/repuestos/${repuestoAjustar.id}/ajuste`, {
        method: 'POST',
        body: JSON.stringify({
          stockFisico: stockFisicoContado,
          motivo: motivoAjuste.trim(),
        }),
      });

      setShowAjusteModal(false);
      const dif = stockFisicoContado - repuestoAjustar.stock;
      const signo = dif > 0 ? `+${dif}` : `${dif}`;

      await cargarInventario();
      setNotifyModal({
        title: 'Ajuste de Inventario Aplicado',
        message: `El stock de [${repuestoAjustar.codigo}] se actualizó a ${stockFisicoContado} unidades (${signo} uds).`,
        subMessage: `Motivo registrado: "${motivoAjuste.trim()}".`,
        tipo: 'info',
      });
    } catch (err: any) {
      setNotifyModal({
        title: 'Error en Ajuste de Stock',
        message: err.message || 'No fue posible guardar el ajuste físico.',
        tipo: 'error',
      });
    } finally {
      setGuardandoAjuste(false);
    }
  }

  // Ver Historial de Movimientos
  async function abrirHistorial(r: Repuesto) {
    try {
      setCargandoHistorial(true);
      setShowHistorialModal(true);
      const data = await fetchWithAuth<Repuesto>(`/repuestos/${r.id}`);
      setRepuestoHistorial(data);
    } catch (err: any) {
      setNotifyModal({
        title: 'Error al Cargar Historial',
        message: err.message || 'No se pudo obtener la bitácora de movimientos.',
        tipo: 'error',
      });
    } finally {
      setCargandoHistorial(false);
    }
  }

  // Eliminar Repuesto (solo Administrador)
  function handleEliminarRepuesto(r: Repuesto) {
    setConfirmModal({
      title: '¿Eliminar repuesto del catálogo?',
      message: `¿Estás seguro de que deseas eliminar permanentemente el repuesto [${r.codigo}] "${r.nombre}"?`,
      subMessage: 'Esta acción no se puede deshacer y quedará registrada en el log de auditoría.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      tipo: 'danger',
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await fetchWithAuth(`/repuestos/${r.id}`, { method: 'DELETE' });
          setConfirmModal(null);
          await cargarInventario();
          setNotifyModal({
            title: 'Repuesto Eliminado',
            message: `El repuesto [${r.codigo}] fue removido exitosamente del catálogo.`,
            tipo: 'info',
          });
        } catch (err: any) {
          setConfirmModal(null);
          setNotifyModal({
            title: 'No se Pudo Eliminar',
            message: err.message || 'Error al intentar eliminar el repuesto.',
            tipo: 'error',
          });
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  // Descargar Plantilla CSV (SCRUM-25)
  function descargarPlantillaCSV() {
    const encabezados = 'codigo,nombre,stock,stockMinimo,precioCompra,precioVenta\n';
    const filasEjemplo = [
      'ACE-001,Aceite de Motor Sintético 5W30 Castrol 1L,24,6,6500,10990',
      'FIL-002,Filtro de Aceite Mann W712/52,15,4,4200,8500',
      'PAS-003,Pastillas de Freno Delanteras Bosch Cerámica,10,3,17500,29990',
      'BUJ-004,Bujía de Encendido NGK Iridio,32,8,5500,9990',
    ].join('\n');

    const blob = new Blob([encabezados + filasEjemplo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_inventario_gearcore.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Parsear archivo CSV (SCRUM-25)
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lineas = text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lineas.length <= 1) {
          setNotifyModal({
            title: 'Archivo Vacío',
            message: 'El archivo CSV no contiene filas de datos para importar.',
            tipo: 'warning',
          });
          return;
        }

        const items: any[] = [];
        // Ignorar encabezado (fila 0)
        for (let i = 1; i < lineas.length; i++) {
          const cols = lineas[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 6) {
            const codigo = cols[0];
            const nombre = cols[1];
            const stock = parseInt(cols[2], 10) || 0;
            const stockMinimo = parseInt(cols[3], 10) || 5;
            const precioCompra = parseFloat(cols[4]) || 0;
            const precioVenta = parseFloat(cols[5]) || 0;

            if (codigo && nombre) {
              items.push({
                codigo,
                nombre,
                stock,
                stockMinimo,
                precioCompra,
                precioVenta,
              });
            }
          }
        }

        if (items.length === 0) {
          setNotifyModal({
            title: 'Formato Inválido',
            message: 'No se encontraron columnas válidas. Recuerda usar el formato: codigo,nombre,stock,stockMinimo,precioCompra,precioVenta.',
            tipo: 'error',
          });
          return;
        }

        setCsvPreview(items);
      } catch (err: any) {
        setNotifyModal({
          title: 'Error al Leer CSV',
          message: err.message || 'No fue posible parsear el archivo CSV.',
          tipo: 'error',
        });
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  // Ejecutar Importación Masiva (SCRUM-25)
  async function handleConfirmarImportacion() {
    if (csvPreview.length === 0) return;

    try {
      setImportando(true);
      const res = await fetchWithAuth<any>('/repuestos/importar', {
        method: 'POST',
        body: JSON.stringify({ repuestos: csvPreview }),
      });

      setShowImportarModal(false);
      setCsvPreview([]);
      await cargarInventario();

      setNotifyModal({
        title: '¡Importación Completada!',
        message: `Se procesaron ${res.totalProcesados} repuestos: ${res.creados} nuevos registrados y ${res.actualizados} actualizados.`,
        tipo: 'success',
      });
    } catch (err: any) {
      setNotifyModal({
        title: 'Fallo en Importación',
        message: err.message || 'Ocurrió un error al procesar la lista masiva.',
        tipo: 'error',
      });
    } finally {
      setImportando(false);
    }
  }

  // Filtrado de la tabla
  const repuestosFiltrados = repuestos.filter((r) => {
    const q = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !q || r.codigo.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q);

    let matchStock = true;
    if (filtroStock === 'STOCK_BAJO') {
      matchStock = r.enAlerta && !r.agotado;
    } else if (filtroStock === 'AGOTADOS') {
      matchStock = r.agotado;
    } else if (filtroStock === 'STOCK_NORMAL') {
      matchStock = !r.enAlerta;
    }

    return matchBusqueda && matchStock;
  });

  const margenEstimadoCalculado = formPrecioVenta - formPrecioCompra;
  const margenPorcentajeCalculado =
    formPrecioVenta > 0
      ? Math.round((margenEstimadoCalculado / formPrecioVenta) * 100 * 10) / 10
      : 0;

  return (
    <div className={styles.container}>
      {/* Encabezado del Módulo */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.headerTitle}>Inventario de Repuestos</h2>
          <p className={styles.headerSubtitle}>
            Control de stock, alertas automáticas de reposición, precios y trazabilidad física en taller
          </p>
        </div>

        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              setCsvPreview([]);
              setShowImportarModal(true);
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Importar CSV</span>
          </button>

          {userRole !== 'MECANICO' && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={abrirCrearModal}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nuevo Repuesto</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de KPIs de Inventario */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconTotal}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Catálogo</span>
            <span className={styles.kpiValue}>{kpis.totalRepuestos} items</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconValue}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Valor en Bodega</span>
            <span className={styles.kpiValue}>
              ${kpis.valorTotalInventario.toLocaleString('es-CL')}
            </span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${styles.kpiCardClickable}`}
          onClick={() => setFiltroStock(filtroStock === 'STOCK_BAJO' ? 'TODOS' : 'STOCK_BAJO')}
          title="Clic para filtrar repuestos con stock crítico"
        >
          <div className={`${styles.kpiIconBox} ${styles.kpiIconWarning}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Stock Bajo / Crítico</span>
            <span className={styles.kpiValue} style={{ color: '#d97706' }}>
              {kpis.totalStockBajo}
            </span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${styles.kpiCardClickable}`}
          onClick={() => setFiltroStock(filtroStock === 'AGOTADOS' ? 'TODOS' : 'AGOTADOS')}
          title="Clic para filtrar repuestos agotados"
        >
          <div className={`${styles.kpiIconBox} ${styles.kpiIconDanger}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Agotados (Stock 0)</span>
            <span className={styles.kpiValue} style={{ color: '#dc2626' }}>
              {kpis.totalAgotados}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de Alerta de Reposición (SCRUM-24) */}
      {(kpis.totalStockBajo > 0 || kpis.totalAgotados > 0) && (
        <div className={styles.alertBanner}>
          <div className={styles.alertBannerContent}>
            <svg className={styles.alertBannerIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <h4 className={styles.alertBannerTitle}>¡Atención! Alerta de Reposición Activa</h4>
              <p className={styles.alertBannerDesc}>
                Hay {kpis.totalStockBajo + kpis.totalAgotados} repuesto(s) en bodega con stock igual o inferior al mínimo configurado.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.alertBannerBtn}
            onClick={() => setFiltroStock('STOCK_BAJO')}
          >
            Ver Repuestos en Alerta
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por código (ej: BOS-001) o nombre del repuesto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          <select
            className={styles.filterSelect}
            value={filtroStock}
            onChange={(e) => setFiltroStock(e.target.value)}
          >
            <option value="TODOS">Todos los estados de stock</option>
            <option value="STOCK_NORMAL">Stock Saludable</option>
            <option value="STOCK_BAJO">Stock Crítico / Bajo Mínimo</option>
            <option value="AGOTADOS">Agotados (0 uds)</option>
          </select>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE REPUESTOS (SCRUM-22, SCRUM-24) */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Código</th>
              <th className={styles.th}>Repuesto / Insumo</th>
              <th className={styles.th}>Stock Actual</th>
              <th className={styles.th}>Stock Mínimo</th>
              <th className={styles.th}>P. Compra</th>
              <th className={styles.th}>P. Venta</th>
              <th className={styles.th}>Margen</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Cargando inventario de repuestos...
                </td>
              </tr>
            ) : repuestosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No se encontraron repuestos con los filtros aplicados.
                </td>
              </tr>
            ) : (
              repuestosFiltrados.map((r) => {
                const isCritico = r.enAlerta && !r.agotado;
                const isAgotado = r.agotado;

                return (
                  <tr key={r.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.codeBadge}>{r.codigo}</span>
                    </td>

                    <td className={styles.td}>
                      <div>
                        <p className={styles.repuestoName}>{r.nombre}</p>
                        <p className={styles.repuestoUsage}>
                          Usado en {r._count?.usosEnOT || 0} OT(s)
                        </p>
                      </div>
                    </td>

                    <td className={styles.td}>
                      <span
                        className={`${styles.stockBadge} ${
                          isAgotado
                            ? styles.stockDanger
                            : isCritico
                            ? styles.stockWarning
                            : styles.stockNormal
                        }`}
                      >
                        <span
                          className={`${styles.stockDot} ${
                            isAgotado
                              ? styles.dotDanger
                              : isCritico
                              ? styles.dotWarning
                              : styles.dotNormal
                          }`}
                        />
                        <span>{r.stock} uds</span>
                      </span>
                    </td>

                    <td className={styles.td}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>
                        {r.stockMinimo} uds
                      </span>
                    </td>

                    <td className={styles.td}>
                      <span className={styles.priceText}>
                        ${r.precioCompra.toLocaleString('es-CL')}
                      </span>
                    </td>

                    <td className={styles.td}>
                      <span className={styles.priceText} style={{ color: '#1e1b4b' }}>
                        ${r.precioVenta.toLocaleString('es-CL')}
                      </span>
                    </td>

                    <td className={styles.td}>
                      <span
                        className={`${styles.marginBadge} ${
                          r.margenPorcentaje > 0 ? styles.marginPositive : ''
                        }`}
                        title={`Ganancia bruta estimada: $${r.margenMoneda.toLocaleString('es-CL')}`}
                      >
                        +{r.margenPorcentaje}%
                      </span>
                    </td>

                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div className={styles.rowActions}>
                        {/* Botón Ajuste Físico (SCRUM-26) */}
                        <button
                          type="button"
                          className={styles.btnActionIcon}
                          title="Auditoría / Ajuste manual de stock físico (SCRUM-26)"
                          onClick={() => abrirAjusteModal(r)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>

                        {/* Botón Historial de Movimientos */}
                        <button
                          type="button"
                          className={styles.btnActionIcon}
                          title="Ver historial de movimientos"
                          onClick={() => abrirHistorial(r)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </button>

                        {/* Botón Editar Repuesto */}
                        {userRole !== 'MECANICO' && (
                          <button
                            type="button"
                            className={styles.btnActionIcon}
                            title="Editar datos del repuesto"
                            onClick={() => abrirEditarModal(r)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}

                        {/* Botón Eliminar (Solo Admin) */}
                        {userRole === 'ADMINISTRADOR' && (
                          <button
                            type="button"
                            className={`${styles.btnActionIcon} ${styles.btnActionIconDelete}`}
                            title="Eliminar repuesto"
                            onClick={() => handleEliminarRepuesto(r)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: CREAR / EDITAR REPUESTO (SCRUM-22, SCRUM-40) */}
      {showFormModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFormModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editandoId ? 'Editar Repuesto' : 'Registrar Nuevo Repuesto'}</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowFormModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarRepuesto}>
              <div className={styles.modalBody}>
                <div className={styles.rowTwoCols}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Código / SKU *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ej: BOS-001"
                      value={formCodigo}
                      onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Stock Mínimo (Alerta) *</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={formStockMinimo}
                      onChange={(e) => setFormStockMinimo(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre del Repuesto / Insumo *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Ej: Pastillas de Freno Delanteras Cerámica Bosch"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    required
                  />
                </div>

                {!editandoId && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Stock Inicial en Bodega</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={formStock}
                      onChange={(e) => setFormStock(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
                    />
                  </div>
                )}

                <div className={styles.rowTwoCols}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Precio Compra (Costo Neto) *</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="Ej: 18500"
                      value={formPrecioCompra}
                      onChange={(e) => setFormPrecioCompra(Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      disabled={editandoId ? userRole !== 'ADMINISTRADOR' : false}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Precio Venta (PVP Sugerido) *</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="Ej: 32990"
                      value={formPrecioVenta}
                      onChange={(e) => setFormPrecioVenta(Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      disabled={editandoId ? userRole !== 'ADMINISTRADOR' : false}
                      required
                    />
                  </div>
                </div>

                {/* Previsualización del margen comercial */}
                <div className={styles.marginPreviewCard}>
                  <div>
                    <strong>Margen de Ganancia:</strong>{' '}
                    <span style={{ color: margenEstimadoCalculado >= 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      ${margenEstimadoCalculado.toLocaleString('es-CL')} ({margenPorcentajeCalculado}%)
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>Calculado en tiempo real</span>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowFormModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={guardandoRepuesto}
                >
                  {guardandoRepuesto ? (
                    <>
                      <span className={styles.spinner} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editandoId ? 'Actualizar Repuesto' : 'Registrar Repuesto'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE DE STOCK FÍSICO (SCRUM-26) */}
      {showAjusteModal && repuestoAjustar && (
        <div className={styles.modalOverlay} onClick={() => setShowAjusteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Auditoría / Ajuste de Stock Físico</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowAjusteModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarAjuste}>
              <div className={styles.modalBody}>
                <div className={styles.auditCurrentStockBox}>
                  <div>
                    <span className={styles.codeBadge}>{repuestoAjustar.codigo}</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#0f172a' }}>
                      {repuestoAjustar.nombre}
                    </h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>STOCK SISTEMA</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e1b4b' }}>
                      {repuestoAjustar.stock} uds
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Stock Físico Real Contado en Bodega *</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={stockFisicoContado}
                    onChange={(e) => setStockFisicoContado(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    required
                    autoFocus
                  />
                </div>

                {/* Cálculo de diferencia */}
                {(() => {
                  const dif = stockFisicoContado - repuestoAjustar.stock;
                  return (
                    <div className={styles.marginPreviewCard}>
                      <div>Diferencia calculada:</div>
                      <span
                        className={`${styles.diffBadge} ${
                          dif > 0 ? styles.diffPos : dif < 0 ? styles.diffNeg : styles.diffZero
                        }`}
                      >
                        {dif > 0 ? `+${dif}` : dif} unidades
                      </span>
                    </div>
                  );
                })()}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Motivo o Justificación del Ajuste *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Indica la razón del cambio de stock..."
                    value={motivoAjuste}
                    onChange={(e) => setMotivoAjuste(e.target.value)}
                    required
                  />
                  {/* Chips rápidos de motivos comunes */}
                  <div className={styles.quickChips}>
                    {[
                      'Conteo físico periódico',
                      'Merma / daño en bodega',
                      'Garantía proveedor',
                      'Devolución de cliente',
                      'Sobrante de taller',
                    ].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={styles.chipBtn}
                        onClick={() => setMotivoAjuste(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowAjusteModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={guardandoAjuste}
                >
                  {guardandoAjuste ? (
                    <>
                      <span className={styles.spinner} />
                      <span>Registrando ajuste...</span>
                    </>
                  ) : (
                    <span>Confirmar Ajuste Físico</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTACIÓN CSV (SCRUM-25) */}
      {showImportarModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportarModal(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Importación Masiva de Repuestos (CSV)</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowImportarModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                Carga un archivo CSV con tu catálogo de inventario inicial. Si el código ya existe, su stock y precios serán actualizados.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ fontSize: '12.5px', padding: '6px 12px' }}
                  onClick={descargarPlantillaCSV}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Descargar Plantilla CSV Ejemplo</span>
                </button>
              </div>

              {/* Zona de Dropzone / Input de archivo */}
              <label className={styles.dropzone}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  style={{ display: 'none' }}
                />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="12" y2="12" />
                  <line x1="15" y1="15" x2="12" y2="12" />
                </svg>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Haz clic para seleccionar tu archivo CSV
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Formato requerido: codigo, nombre, stock, stockMinimo, precioCompra, precioVenta
                </div>
              </label>

              {/* Previsualización del CSV parseado */}
              {csvPreview.length > 0 && (
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669', marginBottom: '6px' }}>
                    {csvPreview.length} repuesto(s) listos para importar:
                  </div>
                  <table className={styles.csvPreviewTable}>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Stock</th>
                        <th>P. Compra</th>
                        <th>P. Venta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          <td><strong>{row.codigo}</strong></td>
                          <td>{row.nombre}</td>
                          <td>{row.stock}</td>
                          <td>${row.precioCompra}</td>
                          <td>${row.precioVenta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvPreview.length > 10 && (
                    <p style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>
                      ... y {csvPreview.length - 10} filas más.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowImportarModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={csvPreview.length === 0 || importando}
                onClick={handleConfirmarImportacion}
              >
                {importando ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Importando...</span>
                  </>
                ) : (
                  <span>Importar {csvPreview.length} Repuestos</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DE MOVIMIENTOS */}
      {showHistorialModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHistorialModal(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Bitácora de Movimientos</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowHistorialModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {cargandoHistorial ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Cargando movimientos...
                </div>
              ) : !repuestoHistorial || !repuestoHistorial.movimientos || repuestoHistorial.movimientos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No hay movimientos registrados para este repuesto.
                </div>
              ) : (
                <div className={styles.timeline}>
                  <div style={{ marginBottom: '8px' }}>
                    <span className={styles.codeBadge}>{repuestoHistorial.codigo}</span>{' '}
                    <strong>{repuestoHistorial.nombre}</strong> (Stock actual: {repuestoHistorial.stock} uds)
                  </div>
                  {repuestoHistorial.movimientos.map((m) => {
                    const isEntrada = m.cantidad > 0;
                    const badgeClass = isEntrada
                      ? styles.timelineBadgeIn
                      : m.tipo === 'AJUSTE_FISICO'
                      ? styles.timelineBadgeAudit
                      : styles.timelineBadgeOut;

                    return (
                      <div key={m.id} className={styles.timelineItem}>
                        <span className={`${styles.timelineBadge} ${badgeClass}`}>
                          {m.tipo.replace('_', ' ')}
                        </span>
                        <div style={{ flex: 1, fontSize: '12.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong style={{ color: isEntrada ? '#059669' : '#dc2626' }}>
                              {isEntrada ? `+${m.cantidad}` : m.cantidad} uds
                            </strong>
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                              {new Date(m.creadoEn).toLocaleString('es-CL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div style={{ color: '#475569', marginTop: '2px' }}>
                            Stock: {m.stockAnterior} → <strong>{m.stockNuevo}</strong>
                          </div>
                          {m.motivo && (
                            <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: '2px', fontStyle: 'italic' }}>
                              &quot;{m.motivo}&quot;
                            </div>
                          )}
                          {m.usuario && (
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                              Por: {m.usuario.nombre} [{m.usuario.rol}]
                            </div>
                          )}
                        </div>
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
                onClick={() => setShowHistorialModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PERSONALIZADO */}
      {confirmModal && (
        <div className={styles.promptModalOverlay} onClick={() => !confirmLoading && setConfirmModal(null)}>
          <div className={styles.promptModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.promptIconCircle} ${styles.promptIconDanger}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h3 className={styles.promptTitle}>{confirmModal.title}</h3>
            <p className={styles.promptMessage}>{confirmModal.message}</p>
            {confirmModal.subMessage && (
              <p className={styles.promptSubMessage}>{confirmModal.subMessage}</p>
            )}

            <div className={styles.promptActions}>
              <button
                type="button"
                className={styles.promptBtnCancel}
                disabled={confirmLoading}
                onClick={() => setConfirmModal(null)}
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                className={styles.promptBtnConfirmDanger}
                disabled={confirmLoading}
                onClick={confirmModal.onConfirm}
              >
                {confirmLoading ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Procesando...</span>
                  </>
                ) : (
                  confirmModal.confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOTIFICACIÓN / ALERTA PERSONALIZADO */}
      {notifyModal && (
        <div className={styles.promptModalOverlay} onClick={() => setNotifyModal(null)}>
          <div className={styles.promptModalContent} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.promptIconCircle} ${
                notifyModal.tipo === 'success'
                  ? styles.promptIconSuccess
                  : notifyModal.tipo === 'error'
                  ? styles.promptIconDanger
                  : notifyModal.tipo === 'warning'
                  ? styles.promptIconWarning
                  : styles.promptIconInfo
              }`}
            >
              {notifyModal.tipo === 'success' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : notifyModal.tipo === 'error' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : notifyModal.tipo === 'warning' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>

            <h3 className={styles.promptTitle}>{notifyModal.title}</h3>
            <p className={styles.promptMessage}>{notifyModal.message}</p>
            {notifyModal.subMessage && (
              <p className={styles.promptSubMessage}>{notifyModal.subMessage}</p>
            )}

            <div className={styles.promptActions}>
              <button
                type="button"
                className={styles.promptBtnAccept}
                onClick={() => setNotifyModal(null)}
                autoFocus
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
