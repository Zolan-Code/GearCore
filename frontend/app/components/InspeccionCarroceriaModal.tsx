'use client';

import React, { useState, useEffect } from 'react';
import styles from './inspeccion-carroceria.module.css';
import {
  DanioCarroceria,
  VistaCarroceria,
  TIPOS_DANIO,
  VISTAS_CONFIG,
  serializarRegistroCarroceria,
} from './inspeccion-carroceria.types';
import { SiluetasVehiculo } from './SiluetasVehiculo';

interface InspeccionCarroceriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  daniosIniciales?: DanioCarroceria[];
  textoInicial?: string;
  readOnly?: boolean;
  onGuardar?: (danios: DanioCarroceria[], textoSerializado: string) => void;
}

export const InspeccionCarroceriaModal: React.FC<InspeccionCarroceriaModalProps> = ({
  isOpen,
  onClose,
  daniosIniciales = [],
  textoInicial = '',
  readOnly = false,
  onGuardar,
}) => {
  const [vistaActual, setVistaActual] = useState<VistaCarroceria>('LADO_DERECHO');
  const [danios, setDanios] = useState<DanioCarroceria[]>(daniosIniciales);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [notaAdicional, setNotaAdicional] = useState<string>(textoInicial);

  useEffect(() => {
    if (isOpen) {
      setDanios(daniosIniciales);
      setNotaAdicional(textoInicial);
      setSelectedPinId(null);
    }
  }, [isOpen, daniosIniciales, textoInicial]);

  if (!isOpen) return null;

  // Filtrar daños pertenecientes a la vista activa
  const daniosVistaActual = danios.filter((d) => d.vista === vistaActual);
  const pinActivo = danios.find((d) => d.id === selectedPinId);

  // Manejo de clic o toque en el lienzo para estampar un nuevo pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;

    // Si hizo clic en un pin existente, no crear otro
    if ((e.target as HTMLElement).closest(`.${styles.pinMarker}`)) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    const nuevoPin: DanioCarroceria = {
      id: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      numero: danios.length + 1,
      vista: vistaActual,
      x: Math.max(3, Math.min(97, x)),
      y: Math.max(3, Math.min(97, y)),
      tipo: 'Rayón',
      descripcion: '',
    };

    setDanios((prev) => [...prev, nuevoPin]);
    setSelectedPinId(nuevoPin.id);
  };

  // Actualizar tipo o descripción del pin seleccionado
  const handleUpdatePin = (id: string, updates: Partial<DanioCarroceria>) => {
    setDanios((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  // Eliminar pin
  const handleDeletePin = (id: string) => {
    setDanios((prev) => {
      const filtrados = prev.filter((d) => d.id !== id);
      // Renumerar correlativamente
      return filtrados.map((d, index) => ({
        ...d,
        numero: index + 1,
      }));
    });
    if (selectedPinId === id) {
      setSelectedPinId(null);
    }
  };

  // Guardar y cerrar
  const handleGuardar = () => {
    const serializado = serializarRegistroCarroceria(danios, notaAdicional);
    if (onGuardar) {
      onGuardar(danios, serializado);
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleBox}>
            <div className={styles.headerIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <div>
              <h3 className={styles.headerTitle}>
                {readOnly ? 'Mapa de Daños de Carrocería' : 'Inspección de Carrocería — Registro de Daños'}
              </h3>
              <p className={styles.headerSubtitle}>
                {readOnly
                  ? 'Visualización de daños y detalles registrados en la recepción del vehículo.'
                  : 'Toca o haz clic en cualquier parte de la chapa para fijar un detalle.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {/* Selector de Perspectiva / Vistas */}
        <div className={styles.tabsContainer}>
          {(Object.keys(VISTAS_CONFIG) as VistaCarroceria[]).map((v) => {
            const count = danios.filter((d) => d.vista === v).length;
            const isActive = vistaActual === v;
            return (
              <button
                key={v}
                type="button"
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setVistaActual(v);
                  setSelectedPinId(null);
                }}
              >
                <span>{VISTAS_CONFIG[v].shortLabel}</span>
                {count > 0 && <span className={styles.tabBadgeCount}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Cuerpo Principal (Lienzo interactivo + Panel de detalle) */}
        <div className={styles.modalBody}>
          {/* Columna Izquierda: Lienzo Interactivo */}
          <div className={styles.canvasColumn}>
            <div className={styles.canvasInstruction}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                Vista activa: <strong>{VISTAS_CONFIG[vistaActual].label}</strong>
                {!readOnly && ' — Haz clic en el vehículo para colocar un pin.'}
              </span>
            </div>

            <div className={styles.vehicleCanvasContainer}>
              <div
                className={styles.blueprintCard}
                style={{ aspectRatio: VISTAS_CONFIG[vistaActual].aspectRatio }}
                onClick={handleCanvasClick}
                title={readOnly ? undefined : 'Haz clic en el vehículo para fijar un detalle'}
              >
                <SiluetasVehiculo vista={vistaActual} />

                {/* Pines estampados en esta vista */}
                {daniosVistaActual.map((pin) => {
                  const isActive = pin.id === selectedPinId;
                  return (
                    <div
                      key={pin.id}
                      className={`${styles.pinMarker} ${isActive ? styles.pinMarkerActive : ''}`}
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPinId(pin.id);
                      }}
                      title={`Punto #${pin.numero}: ${pin.tipo} ${pin.descripcion ? `(${pin.descripcion})` : ''}`}
                    >
                      {pin.numero}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Editor del pin activo y lista total de daños */}
          <div className={styles.sidebarColumn}>
            {/* Editor del Pin Seleccionado */}
            {pinActivo && !readOnly ? (
              <div className={styles.activePinCard}>
                <div className={styles.activePinHeader}>
                  <span className={styles.activePinTitle}>
                    <span className={styles.pinMiniBadge}>{pinActivo.numero}</span>
                    <span>Punto #{pinActivo.numero} ({VISTAS_CONFIG[pinActivo.vista].shortLabel})</span>
                  </span>
                  <button
                    type="button"
                    className={styles.btnDeletePin}
                    onClick={() => handleDeletePin(pinActivo.id)}
                    title="Eliminar este punto"
                  >
                    ✕ Quitar
                  </button>
                </div>

                {/* Chips de tipo de daño */}
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>
                    Tipo de daño:
                  </span>
                  <div className={styles.damageChipsGroup}>
                    {TIPOS_DANIO.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`${styles.damageChip} ${pinActivo.tipo === t.id ? styles.damageChipActive : ''}`}
                        onClick={() => handleUpdatePin(pinActivo.id, { tipo: t.id })}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detalle o nota específica del punto */}
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Observación específica (opcional):
                  </span>
                  <input
                    type="text"
                    className={styles.pinDescInput}
                    placeholder="Ej: Foco trizado, raya profunda..."
                    value={pinActivo.descripcion}
                    onChange={(e) => handleUpdatePin(pinActivo.id, { descripcion: e.target.value })}
                  />
                </div>
              </div>
            ) : null}

            {/* Listado de todos los daños marcados en el auto */}
            <div className={styles.damageListTitle}>
              <span>Daños Registrados ({danios.length})</span>
              {danios.length > 0 && !readOnly && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    setDanios([]);
                    setSelectedPinId(null);
                  }}
                >
                  Limpiar todos
                </button>
              )}
            </div>

            <div className={styles.damageItemsList}>
              {danios.length === 0 ? (
                <div className={styles.emptyStateList}>
                  {readOnly ? 'No se registraron daños en carrocería.' : 'Sin daños marcados. Haz clic en la silueta para agregar el primero.'}
                </div>
              ) : (
                danios.map((d) => {
                  const isActive = d.id === selectedPinId;
                  return (
                    <div
                      key={d.id}
                      className={`${styles.damageItemRow} ${isActive ? styles.damageItemRowActive : ''}`}
                      onClick={() => {
                        setVistaActual(d.vista);
                        setSelectedPinId(d.id);
                      }}
                      title="Clic para ver este punto en la silueta"
                    >
                      <div className={styles.damageItemLeft}>
                        <span className={styles.pinMiniBadge}>{d.numero}</span>
                        <div style={{ minWidth: 0 }}>
                          <span className={styles.damageItemText}>{d.tipo}</span>
                          {d.descripcion && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                              — {d.descripcion}
                            </span>
                          )}
                          <span className={styles.damageItemVista}>({VISTAS_CONFIG[d.vista].shortLabel})</span>
                        </div>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          className={styles.btnDeletePin}
                          style={{ padding: '2px 5px', fontSize: '10px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePin(d.id);
                          }}
                          title="Eliminar este punto"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className={styles.modalFooter}>
          <div className={styles.footerLeft}>
            Total: <strong>{danios.length}</strong> punto(s) de daño registrado(s)
          </div>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
            >
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!readOnly && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleGuardar}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Guardar Inspección ({danios.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
