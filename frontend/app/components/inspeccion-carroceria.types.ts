// Types y funciones de utilidad para la Inspección Visual de Carrocería (GearCore)

export type VistaCarroceria =
  | 'LADO_DERECHO'
  | 'LADO_IZQUIERDO'
  | 'FRONTAL'
  | 'TRASERA'
  | 'SUPERIOR';

export interface DanioCarroceria {
  id: string;
  numero: number;
  vista: VistaCarroceria;
  x: number; // Porcentaje 0 - 100
  y: number; // Porcentaje 0 - 100
  tipo: string; // 'Rayón', 'Abolladura', 'Golpe', 'Trizado', 'Pintura', 'Otro'
  descripcion: string;
}

export interface RegistroCarroceriaJSON {
  resumen: string;
  danios: DanioCarroceria[];
}

export const TIPOS_DANIO = [
  { id: 'Rayón', label: 'Rayón / Raspón', color: '#f59e0b' },
  { id: 'Abolladura', label: 'Abolladura', color: '#ef4444' },
  { id: 'Golpe', label: 'Golpe / Choque', color: '#dc2626' },
  { id: 'Trizado', label: 'Vidrio / Foco Trizado', color: '#3b82f6' },
  { id: 'Pintura', label: 'Pintura Levantada / Salpicada', color: '#8b5cf6' },
  { id: 'Faltante', label: 'Pieza Faltante', color: '#ec4899' },
  { id: 'Otro', label: 'Otro Detalle', color: '#64748b' },
];

export const VISTAS_CONFIG: Record<
  VistaCarroceria,
  {
    label: string;
    shortLabel: string;
    viewBox: string;
    imageSrc: string;
    aspectRatio: string;
    isMirrored?: boolean;
  }
> = {
  LADO_DERECHO: {
    label: 'Lado Derecho (Copiloto)',
    shortLabel: 'Lado Der.',
    viewBox: '0 0 615 230',
    imageSrc: '/assets/inspeccion/auto-perfil.png',
    aspectRatio: '615 / 230',
    isMirrored: true,
  },
  LADO_IZQUIERDO: {
    label: 'Lado Izquierdo (Conductor)',
    shortLabel: 'Lado Izq.',
    viewBox: '0 0 615 230',
    imageSrc: '/assets/inspeccion/auto-perfil.png',
    aspectRatio: '615 / 230',
    isMirrored: false,
  },
  FRONTAL: {
    label: 'Parte Frontal (Delantera)',
    shortLabel: 'Frontal',
    viewBox: '0 0 296 225',
    imageSrc: '/assets/inspeccion/auto-frontal.png',
    aspectRatio: '296 / 225',
    isMirrored: false,
  },
  TRASERA: {
    label: 'Parte Trasera (Posterior)',
    shortLabel: 'Trasera',
    viewBox: '0 0 296 230',
    imageSrc: '/assets/inspeccion/auto-trasera.png',
    aspectRatio: '296 / 230',
    isMirrored: false,
  },
  SUPERIOR: {
    label: 'Vista Superior (Techo/Capó)',
    shortLabel: 'Superior',
    viewBox: '0 0 615 296',
    imageSrc: '/assets/inspeccion/auto-superior.png',
    aspectRatio: '615 / 296',
    isMirrored: false,
  },
};

/**
 * Parsea el campo rayonesCarroceria desde la base de datos (sea JSON o texto plano legacy).
 */
export function parsearRegistroCarroceria(valor: string | null | undefined): RegistroCarroceriaJSON {
  if (!valor || !valor.trim()) {
    return { resumen: '', danios: [] };
  }

  const str = valor.trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed.danios)) {
        return {
          resumen: typeof parsed.resumen === 'string' ? parsed.resumen : '',
          danios: parsed.danios,
        };
      }
    } catch {
      // Fallback a texto plano si el JSON es inválido
    }
  }

  return {
    resumen: str,
    danios: [],
  };
}

/**
 * Serializa los daños a un formato compatible para almacenar en rayonesCarroceria.
 */
export function serializarRegistroCarroceria(
  danios: DanioCarroceria[],
  textoLibre?: string
): string {
  if (!danios || danios.length === 0) {
    return textoLibre?.trim() || '';
  }

  // Generar resumen legible para WhatsApp / PDF
  const resumenPartes = danios.map((d) => {
    const vista = VISTAS_CONFIG[d.vista]?.shortLabel || d.vista;
    const desc = d.descripcion ? `${d.tipo}: ${d.descripcion}` : d.tipo;
    return `[#${d.numero} ${vista}] ${desc}`;
  });

  const resumenGenerado = resumenPartes.join(' · ');
  const resumenFinal = textoLibre?.trim()
    ? `${textoLibre.trim()} (Puntos mapeados: ${resumenGenerado})`
    : resumenGenerado;

  const payload: RegistroCarroceriaJSON = {
    resumen: resumenFinal,
    danios,
  };

  return JSON.stringify(payload);
}
