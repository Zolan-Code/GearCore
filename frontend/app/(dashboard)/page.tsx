'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import { useDashboard } from './DashboardContext';

export default function DashboardPage() {
  const { userRole } = useDashboard();
  const [activeTab, setActiveTab] = useState<'general' | 'mision' | 'politicas'>('general');

  return (
    <>
      {/* Encabezado de Sección en Dashboard */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Panel de Control</h2>
        <p className={styles.sectionSubtitle}>Resumen operativo del taller y accesos rápidos en tiempo real</p>
      </div>

      {/* Cuadrícula de 4 Tarjetas de Resumen */}
      <section className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Jornada / Horas</h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>Entrada</span>
              <strong>08:30 AM</strong>
            </div>
            <div className={styles.statRow}>
              <span>Horas hoy</span>
              <strong>--:--</strong>
            </div>
          </div>
          <button type="button" className={styles.cardAction}>Registrar Marca</button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Órdenes Pendientes</h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>En Recepción</span>
              <strong>0</strong>
            </div>
            <div className={styles.statRow}>
              <span>En Taller</span>
              <strong>0</strong>
            </div>
          </div>
          <Link href="/ordenes" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
            Ver Órdenes
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Alertas e Inventario</h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>Stock Crítico</span>
              <strong>0</strong>
            </div>
            <div className={styles.statRow}>
              <span>Notificaciones</span>
              <strong>0</strong>
            </div>
          </div>
          <Link href="/inventario" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
            Ver Inventario
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Accesos Rápidos</h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statRow}>
              <span>{userRole === 'MECANICO' ? 'Mis Tareas' : 'Recepción Rápida'}</span>
              <strong>+</strong>
            </div>
            <div className={styles.statRow}>
              <span>{userRole === 'MECANICO' ? 'Taller' : 'Clientes y Autos'}</span>
              <strong>+</strong>
            </div>
          </div>
          {userRole !== 'MECANICO' ? (
            <Link href="/clientes" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
              Ir a Clientes y Vehículos
            </Link>
          ) : (
            <Link href="/ordenes" className={styles.cardAction} style={{ textAlign: 'center', textDecoration: 'none' }}>
              Ver Órdenes Asignadas
            </Link>
          )}
        </div>
      </section>

      {/* Sección Inferior de Información */}
      <section className={styles.bottomSection}>
        <div className={styles.tabPills}>
          <button
            type="button"
            className={`${styles.tabPill} ${activeTab === 'general' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            type="button"
            className={`${styles.tabPill} ${activeTab === 'mision' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('mision')}
          >
            Misión
          </button>
          <button
            type="button"
            className={`${styles.tabPill} ${activeTab === 'politicas' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('politicas')}
          >
            Políticas del Taller
          </button>
        </div>

        <div className={styles.infoCard}>
          {activeTab === 'general' && (
            <div>
              <h5>Plantilla Base Operativa</h5>
              <p>Esta es la estructura visual del ERP lista para albergar los módulos de negocio.</p>
            </div>
          )}
          {activeTab === 'mision' && (
            <div>
              <h5>Misión Operativa</h5>
              <p>
                Optimizar y digitalizar el flujo de trabajo de talleres mecánicos independientes,
                garantizando trazabilidad técnica, control de repuestos y satisfacción del cliente.
              </p>
            </div>
          )}
          {activeTab === 'politicas' && (
            <div>
              <h5>Políticas de Servicio y Calidad</h5>
              <p>
                Control de calidad obligatorio antes de la entrega de cada vehículo, registro
                de horas hombre por mecánico e informe de diagnóstico documentado.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
