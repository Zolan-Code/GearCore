import React from 'react';
import { VistaCarroceria, VISTAS_CONFIG } from './inspeccion-carroceria.types';
import styles from './inspeccion-carroceria.module.css';

interface SiluetasVehiculoProps {
  vista: VistaCarroceria;
}

export const SiluetasVehiculo: React.FC<SiluetasVehiculoProps> = ({ vista }) => {
  const config = VISTAS_CONFIG[vista];
  if (!config) return null;

  return (
    <img
      src={config.imageSrc}
      alt={config.label}
      className={`${styles.blueprintImg} ${config.isMirrored ? styles.blueprintMirrored : ''}`}
      draggable={false}
    />
  );
};
