import { describe, it, expect } from 'vitest';
import {
  autoDepthRangeFromFilaments,
  computeLinearStops,
  computeWeightedStops,
  generateExploreRecipes,
  generateRefineRecipes,
} from '../easyModeRecipes';

const makeFilament = (id: string, td: number, orderIndex: number) => ({
  id,
  name: id,
  hexColor: '#FFFFFF',
  td,
  d50Mm: 1.0,
  enabled: true,
  orderIndex,
});

describe('easyModeRecipes', () => {
  it('autoDepthRangeFromFilaments quantizes and clamps', () => {
    const layerH = 0.08;
    const { minDepthMm, maxDepthMm } = autoDepthRangeFromFilaments(
      [makeFilament('a', 0.5, 0), makeFilament('b', 2.0, 1)] as any,
      layerH
    );

    expect(minDepthMm).toBeGreaterThanOrEqual(0.24);
    expect(maxDepthMm).toBeLessThanOrEqual(6.0);
    expect(maxDepthMm).toBeGreaterThan(minDepthMm);
    expect(minDepthMm / layerH).toBeCloseTo(Math.round(minDepthMm / layerH), 6);
    expect(maxDepthMm / layerH).toBeCloseTo(Math.round(maxDepthMm / layerH), 6);
  });

  it('computeWeightedStops returns monotonic thresholds and last=max', () => {
    const layerH = 0.08;
    const min = 0.48;
    const max = 2.24;
    const filaments = [
      makeFilament('f1', 0.5, 0),
      makeFilament('f2', 1.0, 1),
      makeFilament('f3', 2.0, 2),
    ] as any;

    const { stops, hadCollisions } = computeWeightedStops(filaments, min, max, layerH);
    expect(hadCollisions).toBe(false);
    expect(stops).toHaveLength(3);
    expect(stops[2].thresholdZMm).toBeCloseTo(max, 6);
    expect(stops[0].thresholdZMm).toBeGreaterThan(min);
    expect(stops[1].thresholdZMm).toBeGreaterThan(stops[0].thresholdZMm);
    expect(stops[2].thresholdZMm).toBeGreaterThan(stops[1].thresholdZMm);
  });

  it('computeLinearStops returns monotonic thresholds and last=max', () => {
    const layerH = 0.08;
    const min = 0.48;
    const max = 2.24;
    const filaments = [
      makeFilament('f1', 0.5, 0),
      makeFilament('f2', 1.0, 1),
      makeFilament('f3', 2.0, 2),
    ] as any;

    const { stops, hadCollisions } = computeLinearStops(filaments, min, max, layerH);
    expect(hadCollisions).toBe(false);
    expect(stops).toHaveLength(3);
    expect(stops[2].thresholdZMm).toBeCloseTo(max, 6);
    expect(stops[0].thresholdZMm).toBeGreaterThan(min);
    expect(stops[1].thresholdZMm).toBeGreaterThan(stops[0].thresholdZMm);
    expect(stops[2].thresholdZMm).toBeGreaterThan(stops[1].thresholdZMm);
  });

  it('generateExploreRecipes returns 16 unique recipes', () => {
    const recipes = generateExploreRecipes({
      selectedFilaments: [makeFilament('a', 0.5, 0), makeFilament('b', 2.0, 1)] as any,
      layerHeightMm: 0.08,
    });
    expect(recipes).toHaveLength(16);
    expect(new Set(recipes.map((r) => r.id)).size).toBe(16);
    expect(new Set(recipes.map((r) => r.stopStrategy)).size).toBeGreaterThan(1);
    expect(new Set(recipes.map((r) => r.dynamicDepth)).size).toBeGreaterThan(1);
  });

  it('recipes keep filamentOrderIds as a permutation of the selection', () => {
    const filaments = [
      makeFilament('a', 0.5, 0),
      makeFilament('b', 1.0, 1),
      makeFilament('c', 2.0, 2),
    ] as any;
    const selectedIds = filaments.map((f: any) => f.id).sort();

    const explore = generateExploreRecipes({ selectedFilaments: filaments, layerHeightMm: 0.08 });
    explore.forEach((r) => {
      expect(new Set(r.filamentOrderIds).size).toBe(r.filamentOrderIds.length);
      expect([...r.filamentOrderIds].sort()).toEqual(selectedIds);
      expect(r.stops).toHaveLength(r.filamentOrderIds.length);
    });

    const refine = generateRefineRecipes({
      center: explore[0],
      selectedFilaments: filaments,
      layerHeightMm: 0.08,
      roundIndex: 1,
    });
    refine.forEach((r) => {
      expect(new Set(r.filamentOrderIds).size).toBe(r.filamentOrderIds.length);
      expect([...r.filamentOrderIds].sort()).toEqual(selectedIds);
      expect(r.stops).toHaveLength(r.filamentOrderIds.length);
    });
  });

  it('generateRefineRecipes returns 16 unique recipes', () => {
    const filaments = [makeFilament('a', 0.5, 0), makeFilament('b', 2.0, 1)] as any;
    const explore = generateExploreRecipes({
      selectedFilaments: filaments,
      layerHeightMm: 0.08,
    });
    const center = explore[0];
    const refine = generateRefineRecipes({
      center,
      selectedFilaments: filaments,
      layerHeightMm: 0.08,
      roundIndex: 1,
    });

    expect(refine).toHaveLength(16);
    expect(new Set(refine.map((r) => r.id)).size).toBe(16);
    refine.forEach((r) => {
      expect(r.minDepthMm).toBeCloseTo(center.minDepthMm, 6);
    });
  });

  it('generateRefineRecipes changes when roundIndex changes', () => {
    const filaments = [makeFilament('a', 0.5, 0), makeFilament('b', 2.0, 1)] as any;
    const explore = generateExploreRecipes({
      selectedFilaments: filaments,
      layerHeightMm: 0.08,
    });
    const center = explore[0];

    const r1 = generateRefineRecipes({
      center,
      selectedFilaments: filaments,
      layerHeightMm: 0.08,
      roundIndex: 1,
    });
    const r2 = generateRefineRecipes({
      center,
      selectedFilaments: filaments,
      layerHeightMm: 0.08,
      roundIndex: 2,
    });

    expect(r1.map((r) => r.id)).not.toEqual(r2.map((r) => r.id));
  });
});
