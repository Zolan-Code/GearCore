'use client';

import React, { useState, useEffect } from 'react';
import styles from './ajustes.module.css';
import {
  useConfiguracionTaller,
  useActualizarConfiguracionTaller,
  ActualizarConfiguracionPayload,
} from '../../hooks/ajustes/useAjustes';

export default function AjustesView() {
  const { data: config, isLoading, isFetching, isError, error } = useConfiguracionTaller();
  const actualizarMutation = useActualizarConfiguracionTaller();

  // Estado del formulario
  const [nombreComercial, setNombreComercial] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [ivaPorDefecto, setIvaPorDefecto] = useState<number>(19);
  const [validezDiasPorDefecto, setValidezDiasPorDefecto] = useState<number>(15);

  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Sincronizar formulario con datos de la BD al cargar
  useEffect(() => {
    if (config) {
      setNombreComercial(config.nombreComercial || '');
      setRut(config.rut || '');
      setDireccion(config.direccion || '');
      setTelefono(config.telefono || '');
      setEmail(config.email || '');
      setLogoUrl(config.logoUrl || '');
      setIvaPorDefecto(config.ivaPorDefecto ?? 19);
      setValidezDiasPorDefecto(config.validezDiasPorDefecto ?? 15);
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSuccess(null);
    setFeedbackError(null);

    if (!nombreComercial.trim()) {
      setFeedbackError('El nombre comercial del taller es obligatorio.');
      return;
    }

    if (!rut.trim()) {
      setFeedbackError('El RUT del taller es obligatorio.');
      return;
    }

    const payload: ActualizarConfiguracionPayload = {
      nombreComercial: nombreComercial.trim(),
      rut: rut.trim(),
      direccion: direccion.trim() || undefined,
      telefono: telefono.trim() || undefined,
      email: email.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      ivaPorDefecto: Number(ivaPorDefecto),
      validezDiasPorDefecto: Math.round(Number(validezDiasPorDefecto)),
    };

    try {
      await actualizarMutation.mutateAsync(payload);
      setFeedbackSuccess('Configuración del taller guardada y actualizada correctamente.');
      setTimeout(() => setFeedbackSuccess(null), 5000);
    } catch (err: any) {
      setFeedbackError(err.message || 'Error al guardar los ajustes del taller.');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div>
            <h2 className={styles.headerTitle}>Ajustes del Taller</h2>
            <p className={styles.headerSubtitle}>Cargando parámetros de configuración...</p>
          </div>
        </div>
        <div className={styles.settingsCard} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>Obteniendo configuración del sistema...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div>
            <h2 className={styles.headerTitle}>Ajustes del Taller</h2>
            <p className={styles.headerSubtitle}>Error al cargar ajustes</p>
          </div>
        </div>
        <div className={styles.alertError}>
          <span>{error?.message || 'No se pudo cargar la configuración del taller.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Encabezado */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.headerTitle}>Ajustes del Taller</h2>
          <p className={styles.headerSubtitle}>
            Datos comerciales, legales e impositivos que se reflejan en cotizaciones y exportaciones PDF
          </p>
        </div>
        {isFetching && (
          <span className={styles.infoBadge}>Sincronizando...</span>
        )}
      </div>

      {/* Alertas */}
      {feedbackSuccess && (
        <div className={styles.alertSuccess}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {feedbackError && (
        <div className={styles.alertError}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Formulario */}
      <div className={styles.settingsCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Identidad Corporativa y Parámetros
          </h3>
          <p className={styles.cardSubtitle}>
            Modifica la información legal del taller y los valores por defecto para nuevos presupuestos
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formContent}>
            {/* Bloque 1: Datos Legales y Comerciales */}
            <div className={styles.sectionGroup}>
              <h4 className={styles.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Datos del Taller
              </h4>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Nombre Comercial / Razón Social <span className={styles.labelRequired}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Ej: Taller Mecánico San Cristóbal"
                    value={nombreComercial}
                    onChange={(e) => setNombreComercial(e.target.value)}
                  />
                  <span className={styles.helperText}>Aparece en el encabezado y firmas del PDF</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    RUT del Taller <span className={styles.labelRequired}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Ej: 76.123.456-7"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                  />
                  <span className={styles.helperText}>RUT tributario para validez legal</span>
                </div>
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Dirección Física</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej: Av. Vicuña Mackenna 4560, Macul"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Teléfono de Contacto</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej: +56 9 8765 4321"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Correo Electrónico</label>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="contacto@taller.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>URL del Logotipo (Opcional)</label>
                  <input
                    type="url"
                    className={styles.input}
                    placeholder="https://ejemplo.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bloque 2: Parámetros de Cotización */}
            <div className={styles.sectionGroup}>
              <h4 className={styles.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
                Parámetros por Defecto de Cotizaciones
              </h4>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    IVA por Defecto (%) <span className={styles.labelRequired}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    className={styles.input}
                    value={ivaPorDefecto}
                    onChange={(e) => setIvaPorDefecto(parseFloat(e.target.value) || 0)}
                  />
                  <span className={styles.helperText}>Porcentaje aplicado al calcular impuestos en nuevas cotizaciones</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Validez por Defecto (Días) <span className={styles.labelRequired}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    required
                    className={styles.input}
                    value={validezDiasPorDefecto}
                    onChange={(e) => setValidezDiasPorDefecto(parseInt(e.target.value, 10) || 1)}
                  />
                  <span className={styles.helperText}>Días de vigencia sugeridos antes del vencimiento del presupuesto</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button
              type="submit"
              className={styles.btnSave}
              disabled={actualizarMutation.isPending}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {actualizarMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
