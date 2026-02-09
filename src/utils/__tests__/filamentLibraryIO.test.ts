import { describe, it, expect } from 'vitest';
import { parseFilamentLibrary, serializeFilamentLibrary } from '../filamentLibraryIO';
import { calculateD50FromTd, calculateTdFromD50 } from '../../types';

describe('filamentLibraryIO', () => {
  it('serializes as versioned payload', () => {
    const td = calculateTdFromD50(1.0);
    const json = serializeFilamentLibrary([
      {
        id: 'a',
        name: 'A',
        hexColor: '#112233',
        d50Mm: 1.0,
        td,
        enabled: true,
        orderIndex: 0,
      },
    ]);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('layerforge_filaments');
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.filaments)).toBe(true);
    expect(parsed.filaments[0].id).toBe('a');
  });

  it('parses v1 payload', () => {
    const text = JSON.stringify({
      format: 'layerforge_filaments',
      version: 1,
      exportedAt: '2026-02-09T00:00:00.000Z',
      filaments: [
        {
          id: 'a',
          name: 'A',
          hexColor: '#112233',
          d50Mm: 1.0,
          enabled: true,
          orderIndex: 0,
        },
      ],
    });

    const filaments = parseFilamentLibrary(text);
    expect(filaments).toHaveLength(1);
    expect(filaments[0].id).toBe('a');
    expect(filaments[0].td).toBeCloseTo(calculateTdFromD50(1.0), 6);
  });

  it('parses plain Filament[] array', () => {
    const text = JSON.stringify([
      {
        id: 'x',
        name: 'X',
        hexColor: 'aabbcc',
        d50Mm: 2.0,
        enabled: false,
        orderIndex: 2,
      },
    ]);

    const filaments = parseFilamentLibrary(text);
    expect(filaments).toHaveLength(1);
    expect(filaments[0].hexColor).toBe('#AABBCC');
    expect(filaments[0].enabled).toBe(false);
    expect(filaments[0].orderIndex).toBe(0); // reindexed
  });

  it('fills td when missing', () => {
    const text = JSON.stringify([
      {
        id: 'a',
        name: 'A',
        hexColor: '#112233',
        d50Mm: 1.5,
        enabled: true,
        orderIndex: 0,
      },
    ]);

    const filaments = parseFilamentLibrary(text);
    expect(filaments[0].td).toBeCloseTo(calculateTdFromD50(1.5), 6);
  });

  it('fills d50Mm when missing', () => {
    const td = 1.234;
    const text = JSON.stringify([
      {
        id: 'a',
        name: 'A',
        hexColor: '#112233',
        td,
        enabled: true,
        orderIndex: 0,
      },
    ]);

    const filaments = parseFilamentLibrary(text);
    expect(filaments[0].d50Mm).toBeCloseTo(calculateD50FromTd(td), 6);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseFilamentLibrary('{')).toThrow();
  });

  it('deduplicates ids by suffixing', () => {
    const text = JSON.stringify([
      { id: 'dup', name: 'A', hexColor: '#112233', d50Mm: 1.0, enabled: true, orderIndex: 0 },
      { id: 'dup', name: 'B', hexColor: '#445566', d50Mm: 1.0, enabled: true, orderIndex: 1 },
    ]);

    const filaments = parseFilamentLibrary(text);
    expect(filaments).toHaveLength(2);
    expect(filaments[0].id).toBe('dup');
    expect(filaments[1].id).toBe('dup_2');
  });
});

