'use client';

import { useState } from 'react';
import styles from './auditoria.module.css';
import DataTable from './DataTable';
import { useAuditoria, RegistroAuditoria } from '../../hooks/usuarios/useUsuarios';

interface Props {
  userRole: 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';
}

export default function AuditoriaView({ userRole }: Props) {
  const [sortAuditoria, setSortAuditoria] = useState<{ id: string; direction: 'asc' | 'desc' }>({
    id: 'creadoEn',
    direction: 'desc',
  });

  const {
    data: auditorias = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAuditoria({
    sortBy: sortAuditoria.id,
    sortOrder: sortAuditoria.direction,
  });

  function renderAuditBadge(accion: string) {
    switch (accion) {
      case 'CREACION_USUARIO':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionCreate}`}>+ Usuario Creado</span>;
      case 'CAMBIO_ROL':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionRole}`}>Rol Modificado</span>;
      case 'CAMBIO_ESTADO_USUARIO':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionStatus}`}>Estado Actualizado</span>;
      case 'CAMBIO_PRECIO':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionPrice}`}>Edición de Precio</span>;
      case 'ELIMINACION_OT':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionDelete}`}>Eliminación OT</span>;
      default:
        return <span className={`${styles.auditActionBadge} ${styles.auditActionRole}`}>{accion}</span>;
    }
  }

  if (userRole !== 'ADMINISTRADOR') {
    return (
      <div className={styles.emptyState}>
        <h3>Acceso Restringido</h3>
        <p>Solo los usuarios con rol de Administrador pueden acceder al módulo de auditoría de eventos del sistema.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Encabezado del Módulo */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.headerTitle}>
            Auditoría
            {isFetching && !isLoading && (
              <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                Actualizando...
              </span>
            )}
          </h2>
          <p className={styles.headerSubtitle}>
            Trazabilidad inmutable de eventos críticos, creación de usuarios, cambios de roles, eliminaciones y operaciones clave
          </p>
        </div>
      </div>

      {/* Tabla Global DataTable para Auditoría */}
      <DataTable<RegistroAuditoria>
        data={auditorias}
        keyExtractor={(a) => a.id}
        storageKey="auditoria-table-layout"
        searchPlaceholder="Buscar por acción, autor, entidad o detalles..."
        sort={sortAuditoria}
        onSortChange={setSortAuditoria}
        loading={isLoading}
        loadingMessage="Cargando registros de auditoría..."
        error={isError ? error : null}
        errorMessage={`Error al cargar los registros de auditoría: ${(error as any)?.message || 'Error de conexión'}`}
        onRetry={() => refetch()}
        emptyMessage="No hay registros de auditoría registrados en el sistema."
        columns={[
          {
            id: 'creadoEn',
            accessor: 'creadoEn',
            header: 'Fecha / Hora',
            cell: (a) => (
              <span className={styles.auditDateText}>
                {new Date(a.creadoEn).toLocaleString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ),
          },
          {
            id: 'accion',
            accessor: 'accion',
            header: 'Acción Crítica',
            cell: (a) => renderAuditBadge(a.accion),
          },
          {
            header: 'Autor',
            sortable: false,
            cell: (a) => (
              <>
                <strong>{a.usuario ? a.usuario.nombre : 'Sistema'}</strong>
                {a.usuario && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    [{a.usuario.rol}]
                  </div>
                )}
              </>
            ),
          },
          {
            id: 'entidad',
            accessor: 'entidad',
            header: 'Entidad',
            cell: (a) => (
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {a.entidad}
              </span>
            ),
          },
          {
            header: 'Detalles del Registro',
            cell: (a) => (
              <span className={styles.auditDetailsText}>
                {a.detalles || 'Sin detalles especificados'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
