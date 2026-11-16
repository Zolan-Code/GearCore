import styles from './skeleton.module.css';

/**
 * Bloque de carga (skeleton) para mostrar mientras llegan los datos,
 * en lugar de valores vacíos o ceros que parecen datos reales.
 */
export default function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={styles.skeleton}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
