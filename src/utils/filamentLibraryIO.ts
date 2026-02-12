import type { Filament, FilamentLibraryExportV1 } from '../types';
import { calculateD50FromTd, calculateTdFromD50 } from '../types';

const DEFAULT_HEX = '#FFFFFF';
const DEFAULT_D50_MM = 0.85;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const normalizeHexColor = (value: unknown): string => {
  if (typeof value !== 'string') return DEFAULT_HEX;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return DEFAULT_HEX;
  return withHash.toUpperCase();
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export function serializeFilamentLibrary(filaments: Filament[]): string {
  const payload: FilamentLibraryExportV1 = {
    format: 'layerforge_filaments',
    version: 1,
    exportedAt: new Date().toISOString(),
    filaments,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseFilamentLibrary(text: string): Filament[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file.');
  }

  let filamentsRaw: unknown;
  if (Array.isArray(parsed)) {
    filamentsRaw = parsed;
  } else if (
    isRecord(parsed) &&
    parsed.format === 'layerforge_filaments' &&
    parsed.version === 1 &&
    Array.isArray(parsed.filaments)
  ) {
    filamentsRaw = parsed.filaments;
  } else {
    throw new Error('Unrecognized filament library format.');
  }

  const seenIds = new Map<string, number>();

  const normalized = (filamentsRaw as unknown[]).map((raw, index): Filament => {
    const rec = isRecord(raw) ? raw : {};

    const baseId =
      typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `imported_${index}`;
    const count = seenIds.get(baseId) ?? 0;
    seenIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}_${count + 1}`;

    const name =
      typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : baseId;
    const hexColor = normalizeHexColor(rec.hexColor);

    const tdCandidate = toFiniteNumber(rec.td);
    const d50Candidate = toFiniteNumber(rec.d50Mm);

    const d50Mm =
      d50Candidate && d50Candidate > 0
        ? d50Candidate
        : tdCandidate && tdCandidate > 0
          ? calculateD50FromTd(tdCandidate)
          : DEFAULT_D50_MM;

    const td =
      tdCandidate && tdCandidate > 0 ? tdCandidate : calculateTdFromD50(d50Mm);

    const enabled = typeof rec.enabled === 'boolean' ? rec.enabled : true;
    const orderIndex = toFiniteNumber(rec.orderIndex) ?? index;

    return {
      id,
      name,
      hexColor,
      d50Mm,
      td,
      enabled,
      orderIndex,
      notes: typeof rec.notes === 'string' ? rec.notes : undefined,
      calibration: isRecord(rec.calibration) ? (rec.calibration as any) : undefined,
    };
  });

  // Keep stable order based on provided orderIndex, then reindex 0..n-1
  return normalized
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (a.f.orderIndex - b.f.orderIndex) || (a.i - b.i))
    .map((entry, idx) => ({ ...entry.f, orderIndex: idx }));
}

