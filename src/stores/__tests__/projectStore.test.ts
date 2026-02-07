import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../projectStore';
import {
  DEFAULT_MODEL_GEOMETRY,
  DEFAULT_PRINT_SETTINGS,
  DEFAULT_LIGHTING,
  DEFAULT_FILAMENTS,
} from '../../types';

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useProjectStore.getState().resetProject();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useProjectStore.getState();

      expect(state.imagePath).toBeNull();
      expect(state.imageData).toBeNull();
      expect(state.filaments).toEqual(DEFAULT_FILAMENTS);
      expect(state.modelGeometry).toEqual(DEFAULT_MODEL_GEOMETRY);
      expect(state.printSettings).toEqual(DEFAULT_PRINT_SETTINGS);
      expect(state.lighting).toEqual(DEFAULT_LIGHTING);
      expect(state.isDirty).toBe(false);
      expect(state.isProcessing).toBe(false);
      expect(state.liveUpdate).toBe(true);
      expect(state.activeView).toBe('image');
    });
  });

  describe('image actions', () => {
    it('setImage should update imagePath and imageData', () => {
      const { setImage } = useProjectStore.getState();

      setImage('/path/to/image.png', 'data:image/png;base64,abc123');

      const state = useProjectStore.getState();
      expect(state.imagePath).toBe('/path/to/image.png');
      expect(state.imageData).toBe('data:image/png;base64,abc123');
      expect(state.isDirty).toBe(true);
      expect(state.meshReady).toBe(false);
    });

    it('clearImage should reset image data', () => {
      const { setImage, clearImage } = useProjectStore.getState();

      setImage('/path/to/image.png', 'data:image/png;base64,abc123');
      clearImage();

      const state = useProjectStore.getState();
      expect(state.imagePath).toBeNull();
      expect(state.imageData).toBeNull();
      expect(state.heightmapData).toBeNull();
      expect(state.previewData).toBeNull();
    });
  });

  describe('filament actions', () => {
    it('addFilament should add a filament to the list', () => {
      const { addFilament } = useProjectStore.getState();
      const initialCount = useProjectStore.getState().filaments.length;

      const newFilament = {
        id: 'test-filament',
        name: 'Test Filament',
        hexColor: '#FF0000',
        td: 1.5,
        enabled: true,
        orderIndex: 10,
      };

      addFilament(newFilament);

      const state = useProjectStore.getState();
      expect(state.filaments.length).toBe(initialCount + 1);
      expect(state.filaments.find((f) => f.id === 'test-filament')).toEqual(
        newFilament
      );
      expect(state.isDirty).toBe(true);
    });

    it('updateFilament should modify an existing filament', () => {
      const { updateFilament } = useProjectStore.getState();
      const firstFilament = useProjectStore.getState().filaments[0];

      updateFilament(firstFilament.id, { name: 'Updated Name', td: 2.5 });

      const state = useProjectStore.getState();
      const updated = state.filaments.find((f) => f.id === firstFilament.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.td).toBe(2.5);
      expect(updated?.hexColor).toBe(firstFilament.hexColor); // Unchanged
    });

    it('removeFilament should remove filament and its stops', () => {
      const { removeFilament, updateColorStop } = useProjectStore.getState();
      const firstFilament = useProjectStore.getState().filaments[0];

      // Add a color stop for this filament
      updateColorStop(firstFilament.id, 1.0);

      // Remove the filament
      removeFilament(firstFilament.id);

      const state = useProjectStore.getState();
      expect(state.filaments.find((f) => f.id === firstFilament.id)).toBeUndefined();
      expect(
        state.colorPlan.stops.find((s) => s.filamentId === firstFilament.id)
      ).toBeUndefined();
    });

    it('toggleFilament should toggle enabled state', () => {
      const { toggleFilament } = useProjectStore.getState();
      const firstFilament = useProjectStore.getState().filaments[0];
      const initialEnabled = firstFilament.enabled;

      toggleFilament(firstFilament.id);

      const state = useProjectStore.getState();
      const toggled = state.filaments.find((f) => f.id === firstFilament.id);
      expect(toggled?.enabled).toBe(!initialEnabled);
    });

    it('reorderFilaments should update orderIndex', () => {
      const state = useProjectStore.getState();
      const reversed = [...state.filaments].reverse();

      state.reorderFilaments(reversed);

      const newState = useProjectStore.getState();
      newState.filaments.forEach((f, i) => {
        expect(f.orderIndex).toBe(i);
      });
    });
  });

  describe('settings actions', () => {
    it('setModelGeometry should update settings and mark dirty', () => {
      const { setModelGeometry } = useProjectStore.getState();

      setModelGeometry({ minDepthMm: 0.6, maxDepthMm: 3.0 });

      const state = useProjectStore.getState();
      expect(state.modelGeometry.minDepthMm).toBe(0.6);
      expect(state.modelGeometry.maxDepthMm).toBe(3.0);
      expect(state.modelGeometry.gamma).toBe(DEFAULT_MODEL_GEOMETRY.gamma); // Unchanged
      expect(state.isDirty).toBe(true);
      expect(state.meshReady).toBe(false);
    });

    it('setPrintSettings should update settings', () => {
      const { setPrintSettings } = useProjectStore.getState();

      setPrintSettings({ widthMm: 150, heightMm: 120 });

      const state = useProjectStore.getState();
      expect(state.printSettings.widthMm).toBe(150);
      expect(state.printSettings.heightMm).toBe(120);
      expect(state.printSettings.layerHeightMm).toBe(
        DEFAULT_PRINT_SETTINGS.layerHeightMm
      ); // Unchanged
    });

    it('setLighting should update lighting settings', () => {
      const { setLighting } = useProjectStore.getState();

      setLighting({ mode: 'frontlit', intensity: 0.8 });

      const state = useProjectStore.getState();
      expect(state.lighting.mode).toBe('frontlit');
      expect(state.lighting.intensity).toBe(0.8);
    });
  });

  describe('color stop actions', () => {
    it('updateColorStop should add a new stop', () => {
      const { updateColorStop } = useProjectStore.getState();
      const firstFilament = useProjectStore.getState().filaments[0];

      updateColorStop(firstFilament.id, 1.5);

      const state = useProjectStore.getState();
      const stop = state.colorPlan.stops.find(
        (s) => s.filamentId === firstFilament.id
      );
      expect(stop).toBeDefined();
      expect(stop?.thresholdZMm).toBe(1.5);
    });

    it('updateColorStop should update an existing stop', () => {
      const { updateColorStop } = useProjectStore.getState();
      const firstFilament = useProjectStore.getState().filaments[0];

      updateColorStop(firstFilament.id, 1.5);
      updateColorStop(firstFilament.id, 2.0);

      const state = useProjectStore.getState();
      const stops = state.colorPlan.stops.filter(
        (s) => s.filamentId === firstFilament.id
      );
      expect(stops.length).toBe(1);
      expect(stops[0].thresholdZMm).toBe(2.0);
    });

    it('updateColorStop should keep stops sorted by threshold', () => {
      const { updateColorStop } = useProjectStore.getState();
      const filaments = useProjectStore.getState().filaments;

      updateColorStop(filaments[0].id, 2.0);
      updateColorStop(filaments[1].id, 1.0);
      updateColorStop(filaments[2].id, 1.5);

      const state = useProjectStore.getState();
      const thresholds = state.colorPlan.stops.map((s) => s.thresholdZMm);
      expect(thresholds).toEqual([1.0, 1.5, 2.0]);
    });

    it('initializeColorStops should create evenly distributed stops', () => {
      const { initializeColorStops } = useProjectStore.getState();

      initializeColorStops();

      const state = useProjectStore.getState();
      const enabledFilaments = state.filaments.filter((f) => f.enabled);
      expect(state.colorPlan.stops.length).toBe(enabledFilaments.length);

      // Verify stops are evenly distributed
      const { minDepthMm, maxDepthMm } = state.modelGeometry;
      const range = maxDepthMm - minDepthMm;
      const step = range / enabledFilaments.length;

      state.colorPlan.stops.forEach((stop, i) => {
        const expectedThreshold = minDepthMm + step * (i + 1);
        expect(stop.thresholdZMm).toBeCloseTo(expectedThreshold, 5);
      });
    });
  });

  describe('processing state', () => {
    it('setHeightmapData should update heightmap info', () => {
      const { setHeightmapData } = useProjectStore.getState();

      setHeightmapData('base64data', 100, 80);

      const state = useProjectStore.getState();
      expect(state.heightmapData).toBe('base64data');
      expect(state.heightmapWidth).toBe(100);
      expect(state.heightmapHeight).toBe(80);
    });

    it('setProcessing should update isProcessing', () => {
      const { setProcessing } = useProjectStore.getState();

      setProcessing(true);
      expect(useProjectStore.getState().isProcessing).toBe(true);

      setProcessing(false);
      expect(useProjectStore.getState().isProcessing).toBe(false);
    });

    it('setMeshReady should update meshReady', () => {
      const { setMeshReady } = useProjectStore.getState();

      setMeshReady(true);
      expect(useProjectStore.getState().meshReady).toBe(true);

      setMeshReady(false);
      expect(useProjectStore.getState().meshReady).toBe(false);
    });
  });

  describe('UI state', () => {
    it('setActiveView should update activeView', () => {
      const { setActiveView } = useProjectStore.getState();

      setActiveView('preview');
      expect(useProjectStore.getState().activeView).toBe('preview');

      setActiveView('3d');
      expect(useProjectStore.getState().activeView).toBe('3d');
    });

    it('setLiveUpdate should update liveUpdate', () => {
      const { setLiveUpdate } = useProjectStore.getState();

      setLiveUpdate(false);
      expect(useProjectStore.getState().liveUpdate).toBe(false);

      setLiveUpdate(true);
      expect(useProjectStore.getState().liveUpdate).toBe(true);
    });

    it('markDirty and markClean should update isDirty', () => {
      const { markDirty, markClean } = useProjectStore.getState();

      markDirty();
      expect(useProjectStore.getState().isDirty).toBe(true);

      markClean();
      expect(useProjectStore.getState().isDirty).toBe(false);
    });
  });

  describe('easy mode wizard', () => {
    it('openEasyModeWizard and closeEasyModeWizard should toggle', () => {
      const { openEasyModeWizard, closeEasyModeWizard } = useProjectStore.getState();

      openEasyModeWizard();
      expect(useProjectStore.getState().easyModeWizardOpen).toBe(true);

      closeEasyModeWizard();
      expect(useProjectStore.getState().easyModeWizardOpen).toBe(false);
    });

    it('applyEasyModeSetup should apply recipe settings and enabled filaments', () => {
      const { applyEasyModeSetup } = useProjectStore.getState();
      const state = useProjectStore.getState();

      const f0 = state.filaments[0];
      const f1 = state.filaments[1];

      applyEasyModeSetup({
        selectedFilamentIds: [f0.id, f1.id],
        recipe: {
          id: 'test_recipe',
          label: 'Test Recipe',
          minDepthMm: 0.56,
          maxDepthMm: 2.0,
          dynamicDepth: true,
          luminanceMethod: 'rec709',
          toneMappingMode: 'gamma',
          gamma: 1.2,
          contrast: 1.1,
          offset: 0.05,
          filamentOrderIds: [f1.id, f0.id],
          stops: [
            { filamentId: f1.id, thresholdZMm: 1.0 },
            { filamentId: f0.id, thresholdZMm: 2.0 },
          ],
        } as any,
      });

      const next = useProjectStore.getState();

      // Enabled set
      const enabled = next.filaments.filter((f) => f.enabled).map((f) => f.id);
      expect(new Set(enabled)).toEqual(new Set([f0.id, f1.id]));

      // OrderIndex reflects recipe order first
      const ordered = [...next.filaments].sort((a, b) => a.orderIndex - b.orderIndex);
      expect(ordered[0].id).toBe(f1.id);
      expect(ordered[1].id).toBe(f0.id);

      // Geometry / color plan applied
      expect(next.modelGeometry.minDepthMm).toBe(0.56);
      expect(next.modelGeometry.maxDepthMm).toBe(2.0);
      expect(next.modelGeometry.dynamicDepth).toBe(true);
      expect(next.modelGeometry.luminanceMethod).toBe('rec709');
      expect(next.modelGeometry.toneMappingMode).toBe('gamma');
      expect(next.modelGeometry.gamma).toBe(1.2);
      expect(next.modelGeometry.contrast).toBe(1.1);
      expect(next.modelGeometry.offset).toBe(0.05);
      expect(next.colorPlan.stops).toEqual([
        { filamentId: f1.id, thresholdZMm: 1.0 },
        { filamentId: f0.id, thresholdZMm: 2.0 },
      ]);

      // UX post-apply
      expect(next.activeView).toBe('preview');
      expect(next.isDirty).toBe(true);
      expect(next.meshReady).toBe(false);
      expect(next.heightmapData).toBeNull();
      expect(next.previewData).toBeNull();
    });

    it('applyEasyModeSetup should apply image when provided', () => {
      const { applyEasyModeSetup } = useProjectStore.getState();
      const state = useProjectStore.getState();

      const f0 = state.filaments[0];
      const f1 = state.filaments[1];

      applyEasyModeSetup({
        image: {
          path: 'test.png',
          dataUrl: 'data:image/png;base64,xyz',
          aspectRatio: 1.25,
          widthMm: 150,
          heightMm: 120,
        },
        selectedFilamentIds: [f0.id, f1.id],
        recipe: {
          id: 'test_recipe_img',
          label: 'Test Recipe Img',
          minDepthMm: 0.56,
          maxDepthMm: 2.0,
          dynamicDepth: false,
          luminanceMethod: 'rec601',
          toneMappingMode: 'curve',
          transferCurve: [
            { x: 0, y: 0 },
            { x: 0.25, y: 0.2 },
            { x: 0.5, y: 0.5 },
            { x: 0.75, y: 0.8 },
            { x: 1, y: 1 },
          ],
          filamentOrderIds: [f0.id, f1.id],
          stops: [
            { filamentId: f0.id, thresholdZMm: 1.0 },
            { filamentId: f1.id, thresholdZMm: 2.0 },
          ],
        } as any,
      });

      const next = useProjectStore.getState();
      expect(next.imagePath).toBe('test.png');
      expect(next.imageData).toBe('data:image/png;base64,xyz');
      expect(next.imageAspectRatio).toBe(1.25);
      expect(next.printSettings.widthMm).toBe(150);
      expect(next.printSettings.heightMm).toBe(120);
    });
  });

  describe('project actions', () => {
    it('resetProject should restore initial state', () => {
      const { setImage, addFilament, setModelGeometry, resetProject } =
        useProjectStore.getState();

      // Make some changes
      setImage('/path/to/image.png', 'data:image/png;base64,abc123');
      addFilament({
        id: 'new',
        name: 'New',
        hexColor: '#00FF00',
        td: 1,
        enabled: true,
        orderIndex: 10,
      });
      setModelGeometry({ gamma: 2.0 });

      // Reset
      resetProject();

      const state = useProjectStore.getState();
      expect(state.imagePath).toBeNull();
      expect(state.filaments).toEqual(DEFAULT_FILAMENTS);
      expect(state.modelGeometry).toEqual(DEFAULT_MODEL_GEOMETRY);
    });

    it('getProjectJSON should return valid JSON', () => {
      const { setImage, getProjectJSON } = useProjectStore.getState();

      setImage('/path/to/image.png', 'data:image/png;base64,abc123');

      const json = getProjectJSON();
      const parsed = JSON.parse(json);

      expect(parsed.imagePath).toBe('/path/to/image.png');
      expect(parsed.imageData).toBe('data:image/png;base64,abc123');
      expect(parsed.filaments).toBeDefined();
      expect(parsed.modelGeometry).toBeDefined();
    });

    it('loadProject should restore saved state', () => {
      const { loadProject } = useProjectStore.getState();

      const savedProject = {
        imagePath: '/saved/path.png',
        imageData: 'data:saved',
        filaments: [
          {
            id: 'saved',
            name: 'Saved',
            hexColor: '#AABBCC',
            td: 1.2,
            enabled: true,
            orderIndex: 0,
          },
        ],
        modelGeometry: {
          ...DEFAULT_MODEL_GEOMETRY,
          gamma: 1.5,
        },
      };

      loadProject(savedProject);

      const state = useProjectStore.getState();
      expect(state.imagePath).toBe('/saved/path.png');
      expect(state.filaments[0].name).toBe('Saved');
      expect(state.modelGeometry.gamma).toBe(1.5);
      expect(state.isDirty).toBe(false);
    });

    it('loadProject should merge modelGeometry defaults for older projects', () => {
      const { loadProject } = useProjectStore.getState();

      loadProject({
        imagePath: '/saved/path.png',
        modelGeometry: {
          gamma: 2.0,
        } as any,
      });

      const state = useProjectStore.getState();
      expect(state.modelGeometry.gamma).toBe(2.0);
      expect(state.modelGeometry.luminanceMethod).toBe('rec601');
      expect(state.modelGeometry.toneMappingMode).toBe('gamma');
      expect(state.modelGeometry.dynamicDepth).toBe(false);
      expect(state.modelGeometry.transferCurve.length).toBeGreaterThan(0);
      expect(state.isDirty).toBe(false);
    });
  });
});
