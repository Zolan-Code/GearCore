export interface ColumnPreset {
  id: string;
  name: string;
  order: string[];
  visible: string[];
  pageSize?: number;
  createdAt: string;
}

export function parseStoredLayout(
  raw: string,
  defaultColumnIds: string[]
): { presets: ColumnPreset[]; activePresetId: string | null } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.presets)) {
      const validPresets: ColumnPreset[] = parsed.presets.map((p: any, idx: number) => {
        const validOrder = Array.isArray(p.order)
          ? p.order.filter((id: string) => defaultColumnIds.includes(id))
          : [];
        const missing = defaultColumnIds.filter((id) => !validOrder.includes(id));
        const validVisible = Array.isArray(p.visible)
          ? p.visible.filter((id: string) => defaultColumnIds.includes(id))
          : defaultColumnIds;
        return {
          id: p.id || `preset-${idx + 1}`,
          name: p.name || `Vista ${idx + 1}`,
          order: [...validOrder, ...missing],
          visible: validVisible.length > 0 ? validVisible : defaultColumnIds,
          pageSize: p.pageSize,
          createdAt: p.createdAt || new Date().toISOString(),
        };
      });
      return {
        presets: validPresets,
        activePresetId: parsed.activePresetId || null,
      };
    } else if (parsed && (parsed.order || parsed.visible)) {
      const validOrder = Array.isArray(parsed.order)
        ? parsed.order.filter((id: string) => defaultColumnIds.includes(id))
        : [];
      const missing = defaultColumnIds.filter((id) => !validOrder.includes(id));
      const validVisible = Array.isArray(parsed.visible)
        ? parsed.visible.filter((id: string) => defaultColumnIds.includes(id))
        : defaultColumnIds;
      const legacyPreset: ColumnPreset = {
        id: 'preset-migrated',
        name: 'Vista personalizada',
        order: [...validOrder, ...missing],
        visible: validVisible.length > 0 ? validVisible : defaultColumnIds,
        pageSize: parsed.pageSize,
        createdAt: new Date().toISOString(),
      };
      return {
        presets: [legacyPreset],
        activePresetId: legacyPreset.id,
      };
    }
  } catch (e) {
    console.warn('Error al parsear layout de localStorage:', e);
  }
  return { presets: [], activePresetId: null };
}
