import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  ColorInput,
  Divider,
  Group,
  Image,
  Modal,
  NumberInput,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Stepper,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useProjectStore } from '../../stores/projectStore';
import { calculateTdFromD50 } from '../../types';
import type { EasyModeDraftImage, EasyModeRecipe, Filament, PrintSettings } from '../../types';
import { computeRecipeMetrics } from '../../utils/easyModeMetrics';
import { generateExploreRecipes, generateRefineRecipes, sortFilamentsByTd } from '../../utils/easyModeRecipes';
import { renderRecipeThumbnailsBatch } from '../../utils/easyModePreview';

// Check if running in Tauri
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

// Convert Uint8Array to base64 without stack overflow
const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }

  return btoa(chunks.join(''));
};

type WizardStepId = 'image' | 'filaments' | 'explore' | 'refine';

type DraftImage = EasyModeDraftImage;

const buildImageKey = (dataUrl: string) => {
  const head = dataUrl.slice(0, 64);
  const tail = dataUrl.slice(Math.max(0, dataUrl.length - 64));
  return `${dataUrl.length}:${head}:${tail}`;
};

const generateFilamentId = () =>
  `filament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const computeDimsFromAspect = (params: {
  aspectRatio: number;
  currentWidthMm: number;
  currentHeightMm: number;
}) => {
  const { aspectRatio, currentWidthMm, currentHeightMm } = params;
  const maxDimension = Math.max(currentWidthMm, currentHeightMm);

  if (aspectRatio >= 1) {
    return { widthMm: maxDimension, heightMm: Math.round(maxDimension / aspectRatio) };
  }

  return { widthMm: Math.round(maxDimension * aspectRatio), heightMm: maxDimension };
};

const pickFilamentPack = (filaments: Filament[], size: 2 | 3 | 4): string[] => {
  const ordered = sortFilamentsByTd(filaments);
  if (ordered.length === 0) return [];
  if (ordered.length <= size) return ordered.map((f) => f.id);

  if (size === 2) return [ordered[0].id, ordered[ordered.length - 1].id];
  if (size === 3) {
    const mid = Math.floor((ordered.length - 1) / 2);
    return [ordered[0].id, ordered[mid].id, ordered[ordered.length - 1].id];
  }

  const idx1 = Math.round((ordered.length - 1) / 3);
  const idx2 = Math.round(((ordered.length - 1) * 2) / 3);
  return [ordered[0].id, ordered[idx1].id, ordered[idx2].id, ordered[ordered.length - 1].id];
};

const formatLuminanceMethod = (method: EasyModeRecipe['luminanceMethod']): string => {
  switch (method) {
    case 'rec601':
      return 'Rec.601';
    case 'rec709':
      return 'Rec.709';
    case 'max_channel':
      return 'Max';
    case 'scaled_max_channel':
      return 'Scaled Max';
    case 'combo':
      return 'Combo';
    case 'color_aware':
      return 'Color Aware';
    case 'color_pop':
      return 'Color Pop';
    default:
      return method;
  }
};

function RecipeTile(props: {
  recipe: EasyModeRecipe;
  thumb?: string;
  selected: boolean;
  printSettings: PrintSettings;
  selectedFilamentCount: number;
  filamentNameById: Map<string, string>;
  onClick: () => void;
}) {
  const { recipe, thumb, selected, printSettings, selectedFilamentCount, filamentNameById, onClick } = props;
  const metrics = computeRecipeMetrics({ recipe, printSettings, selectedFilamentCount });
  const warnings = metrics.warnings;
  const orderNames = recipe.filamentOrderIds
    .map((id) => filamentNameById.get(id) ?? id)
    .join(' → ');

  return (
    <Card
      withBorder
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'rgba(31, 174, 122, 0.9)' : 'rgba(31, 174, 122, 0.2)',
      }}
      onClick={onClick}
    >
      <Box style={{ position: 'relative' }}>
        {thumb ? <Image src={thumb} radius="sm" /> : <Skeleton height={140} radius="sm" />}
        {selected && (
          <Badge size="xs" variant="filled" color="forge" style={{ position: 'absolute', top: 8, left: 8 }}>
            Selected
          </Badge>
        )}
      </Box>
      <Text size="xs" fw={600} mt="xs" lineClamp={2}>
        {recipe.label}
      </Text>
      <Group gap="xs" mt={6}>
        <Badge size="xs" variant="light">
          Lum {formatLuminanceMethod(recipe.luminanceMethod)}
        </Badge>
        <Badge size="xs" variant="light">
          Stops {recipe.stopStrategy === 'linear' ? 'Linear' : 'Weighted'}
        </Badge>
        {orderNames && (
          <Tooltip label={`Order: ${orderNames}`} multiline>
            <Badge size="xs" variant="light">
              Order
            </Badge>
          </Tooltip>
        )}
        <Badge size="xs" variant="light">
          Depth {metrics.depthMm.toFixed(2)}mm
        </Badge>
        <Badge size="xs" variant="light">
          L {metrics.totalLayers}
        </Badge>
        <Badge size="xs" variant="light">
          Swaps {metrics.swapsDistinctLayers}
        </Badge>
      </Group>
      {warnings.length > 0 && (
        <Tooltip label={warnings.join('\n')} multiline>
          <Badge size="xs" color="yellow" variant="light" mt={6}>
            Warnings ({warnings.length})
          </Badge>
        </Tooltip>
      )}
    </Card>
  );
}

export function EasyModeWizard() {
  const opened = useProjectStore((s) => s.easyModeWizardOpen);
  const closeWizard = useProjectStore((s) => s.closeEasyModeWizard);
  const applyEasyModeSetup = useProjectStore((s) => s.applyEasyModeSetup);

  const imageData = useProjectStore((s) => s.imageData);
  const modelGeometry = useProjectStore((s) => s.modelGeometry);
  const printSettings = useProjectStore((s) => s.printSettings);
  const filaments = useProjectStore((s) => s.filaments);

  const addFilament = useProjectStore((s) => s.addFilament);
  const updateFilament = useProjectStore((s) => s.updateFilament);
  const removeFilament = useProjectStore((s) => s.removeFilament);

  const setProcessing = useProjectStore((s) => s.setProcessing);
  const setHeightmapData = useProjectStore((s) => s.setHeightmapData);
  const setMeshReady = useProjectStore((s) => s.setMeshReady);

  const needsImageStep = !imageData;
  const steps: WizardStepId[] = useMemo(
    () => (needsImageStep ? ['image', 'filaments', 'explore', 'refine'] : ['filaments', 'explore', 'refine']),
    [needsImageStep]
  );

  const [step, setStep] = useState<WizardStepId>(needsImageStep ? 'image' : 'filaments');
  const [draftImage, setDraftImage] = useState<DraftImage | null>(null);

  const wizardImageDataUrl = draftImage?.dataUrl ?? imageData;
  const wizardImageKey = wizardImageDataUrl ? buildImageKey(wizardImageDataUrl) : '';

  const [selectedFilamentIds, setSelectedFilamentIds] = useState<string[]>([]);
  const selectedFilaments = useMemo(() => {
    const selectedSet = new Set(selectedFilamentIds);
    return filaments.filter((f) => selectedSet.has(f.id));
  }, [filaments, selectedFilamentIds]);

  const [searchQuery, setSearchQuery] = useState('');

  const sortedFilaments = useMemo(() => {
    return [...filaments]
      .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [filaments, searchQuery]);

  const selectedFilamentsSorted = useMemo(
    () => sortFilamentsByTd(selectedFilaments),
    [selectedFilaments]
  );

  const selectedFilamentsKey = useMemo(() => {
    return selectedFilamentsSorted
      .map((f) => `${f.id}:${f.hexColor}:${f.td}`)
      .join('|');
  }, [selectedFilamentsSorted]);

  const filamentNameById = useMemo(() => {
    return new Map(filaments.map((f) => [f.id, f.name]));
  }, [filaments]);

  const [exploreRecipes, setExploreRecipes] = useState<EasyModeRecipe[]>([]);
  const [refineRecipes, setRefineRecipes] = useState<EasyModeRecipe[]>([]);
  const [centerRecipe, setCenterRecipe] = useState<EasyModeRecipe | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [refineRoundIndex, setRefineRoundIndex] = useState(1);

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const thumbCacheRef = useRef<Map<string, string>>(new Map());
  const generationTokenRef = useRef(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [editorTargetId, setEditorTargetId] = useState<string | null>(null);
  const [editorData, setEditorData] = useState({ name: '', hexColor: '#FFFFFF', d50Mm: 0.85 });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [filamentToDelete, setFilamentToDelete] = useState<Filament | null>(null);

  const displayedRecipes = step === 'explore' ? exploreRecipes : step === 'refine' ? refineRecipes : [];

  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) return null;
    return refineRecipes.find((r) => r.id === selectedRecipeId) ?? null;
  }, [refineRecipes, selectedRecipeId]);

  const prevOpenedRef = useRef(false);
  useEffect(() => {
    const prev = prevOpenedRef.current;
    prevOpenedRef.current = opened;
    if (!opened || prev) return;

    setStep(needsImageStep ? 'image' : 'filaments');
    setDraftImage(null);
    setRefineRoundIndex(1);

    const enabledIds = filaments.filter((f) => f.enabled).map((f) => f.id);
    setSelectedFilamentIds(enabledIds.length > 0 ? enabledIds : pickFilamentPack(filaments, 2));

    setExploreRecipes([]);
    setRefineRecipes([]);
    setCenterRecipe(null);
    setSelectedRecipeId(null);
    setThumbs({});
    setIsGenerating(false);
    setGenerationProgress(0);
    generationTokenRef.current++;
    setIsApplying(false);
  }, [opened, needsImageStep, filaments]);

  const handleCancel = () => {
    generationTokenRef.current++;
    closeWizard();
  };

  const openImageForWizard = async () => {
    if (!isTauri()) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const img = new window.Image();
          img.onload = () => {
            const aspectRatio = img.width / img.height;
            const dims = computeDimsFromAspect({
              aspectRatio,
              currentWidthMm: printSettings.widthMm,
              currentHeightMm: printSettings.heightMm,
            });
            setDraftImage({
              path: file.name,
              dataUrl,
              aspectRatio,
              widthMm: dims.widthMm,
              heightMm: dims.heightMm,
            });
            generationTokenRef.current++;
            setThumbs({});
            if (step === 'image') setStep('filaments');
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (!selected) return;

      const path = typeof selected === 'string' ? selected : (selected as { path: string }).path;
      const contents = await readFile(path);
      const base64 = uint8ArrayToBase64(new Uint8Array(contents));
      const ext = path.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      const dataUrl = `data:${mime};base64,${base64}`;

      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const dims = computeDimsFromAspect({
          aspectRatio,
          currentWidthMm: printSettings.widthMm,
          currentHeightMm: printSettings.heightMm,
        });
        setDraftImage({
          path,
          dataUrl,
          aspectRatio,
          widthMm: dims.widthMm,
          heightMm: dims.heightMm,
        });
        generationTokenRef.current++;
        setThumbs({});
        if (step === 'image') setStep('filaments');
      };
      img.src = dataUrl;
    } catch (err) {
      console.error('Easy Mode: failed to open image:', err);
    }
  };

  const canGoToExplore = !!wizardImageDataUrl && selectedFilamentIds.length > 0;

  const toggleSelectedFilament = (id: string) => {
    setSelectedFilamentIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return [...set];
    });
  };

  const applyPack = (size: 2 | 3 | 4) => {
    setSelectedFilamentIds(pickFilamentPack(filaments, size));
  };

  const handleExplore = () => {
    if (!canGoToExplore) return;
    setRefineRoundIndex(1);
    const recipes = generateExploreRecipes({
      selectedFilaments,
      layerHeightMm: printSettings.layerHeightMm,
    });
    setExploreRecipes(recipes);
    setRefineRecipes([]);
    setCenterRecipe(null);
    setSelectedRecipeId(null);
    setStep('explore');
    generationTokenRef.current++;
    setThumbs({});
  };

  const handlePickExploreRecipe = (recipe: EasyModeRecipe) => {
    setCenterRecipe(recipe);
    setRefineRoundIndex(1);
    const refine = generateRefineRecipes({
      center: recipe,
      selectedFilaments,
      layerHeightMm: printSettings.layerHeightMm,
      roundIndex: 1,
    });
    setRefineRecipes(refine);
    setSelectedRecipeId(null);
    setStep('refine');
    generationTokenRef.current++;
    setThumbs({});
  };

  const handleAnotherRound = () => {
    const center = selectedRecipe ?? centerRecipe;
    if (!center) return;
    const nextRound = refineRoundIndex + 1;
    setCenterRecipe(center);
    const refine = generateRefineRecipes({
      center,
      selectedFilaments,
      layerHeightMm: printSettings.layerHeightMm,
      roundIndex: nextRound,
    });
    setRefineRoundIndex(nextRound);
    setRefineRecipes(refine);
    setSelectedRecipeId(null);
    generationTokenRef.current++;
    setThumbs({});
  };

  useEffect(() => {
    if (!opened) return;
    if (step !== 'explore' && step !== 'refine') return;
    if (!wizardImageDataUrl) return;
    if (displayedRecipes.length === 0) return;
    if (selectedFilaments.length === 0) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1;
    const thumbMaxPx = Math.max(480, Math.min(720, Math.round(480 * dpr)));

    const token = ++generationTokenRef.current;
    const shouldCancel = () => generationTokenRef.current !== token;
    const cache = thumbCacheRef.current;

    const total = displayedRecipes.length;
    const initialThumbs: Record<string, string> = {};
    const missing: EasyModeRecipe[] = [];

    for (const recipe of displayedRecipes) {
      const key = `${wizardImageKey}|${selectedFilamentsKey}|inv${modelGeometry.invert ? 1 : 0}|px${thumbMaxPx}|${recipe.id}`;
      const cached = cache.get(key);
      if (cached) initialThumbs[recipe.id] = cached;
      else missing.push(recipe);
    }

    setThumbs(initialThumbs);
    setGenerationProgress(Math.round(((total - missing.length) / total) * 100));

    if (missing.length === 0) {
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);

      (async () => {
        let produced = 0;
        try {
          for await (const { id, dataUrl } of renderRecipeThumbnailsBatch({
            imageDataUrl: wizardImageDataUrl,
            recipes: missing,
            filaments: selectedFilamentsSorted,
            invert: modelGeometry.invert,
            maxPx: thumbMaxPx,
            shouldCancel,
          })) {
            if (shouldCancel()) return;
            cache.set(
              `${wizardImageKey}|${selectedFilamentsKey}|inv${modelGeometry.invert ? 1 : 0}|px${thumbMaxPx}|${id}`,
              dataUrl
            );
            setThumbs((prev) => ({ ...prev, [id]: dataUrl }));
            produced++;
            const done = total - missing.length + produced;
            setGenerationProgress(Math.round((done / total) * 100));
          }
      } finally {
        if (!shouldCancel()) setIsGenerating(false);
      }
    })();
  }, [
    opened,
    step,
    wizardImageDataUrl,
    wizardImageKey,
    displayedRecipes,
    selectedFilamentsKey,
    selectedFilamentsSorted,
    modelGeometry.invert,
  ]);

  const finalRecipe = selectedRecipe ?? centerRecipe;

  const applyDisabled =
    isApplying || !finalRecipe || selectedFilamentIds.length === 0 || !wizardImageDataUrl;

  const handleApply = async () => {
    const recipe = selectedRecipe ?? centerRecipe;
    if (!recipe) return;
    if (!wizardImageDataUrl) return;
    if (selectedFilamentIds.length === 0) return;

    setIsApplying(true);
    try {
      applyEasyModeSetup({
        image: draftImage ?? undefined,
        selectedFilamentIds,
        recipe,
      });

      closeWizard();

      if (!isTauri()) return;
      const state = useProjectStore.getState();
      if (!state.imagePath) return;

      setProcessing(true);
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const currentState = useProjectStore.getState();
        const g = currentState.modelGeometry;

        const response = await invoke<{ heightmap_base64: string; width: number; height: number }>(
          'process_image',
          {
            request: {
              image_path: currentState.imagePath,
              geometry: {
                min_depth_mm: g.minDepthMm,
                max_depth_mm: g.maxDepthMm,
                gamma: g.gamma,
                contrast: g.contrast,
                offset: g.offset,
                smoothing: g.smoothing,
                spike_removal: g.spikeRemoval,
                luminance_method: g.luminanceMethod,
                tone_mapping_mode: g.toneMappingMode,
                transfer_curve: g.transferCurve,
                dynamic_depth: g.dynamicDepth,
                invert: g.invert,
              },
            },
          }
        );

        setHeightmapData(response.heightmap_base64, response.width, response.height);
        setMeshReady(true);
      } catch (err) {
        console.debug('Easy Mode: sidecar processing failed, using JS preview.', err);
      } finally {
        setProcessing(false);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const editorTd = calculateTdFromD50(editorData.d50Mm);

  const openAddFilament = () => {
    setEditorMode('add');
    setEditorTargetId(null);
    setEditorData({ name: '', hexColor: '#FFFFFF', d50Mm: 0.85 });
    setEditorOpen(true);
  };

  const openEditFilament = (filament: Filament) => {
    setEditorMode('edit');
    setEditorTargetId(filament.id);
    setEditorData({ name: filament.name, hexColor: filament.hexColor, d50Mm: filament.d50Mm });
    setEditorOpen(true);
  };

  const saveEditor = () => {
    if (editorMode === 'add') {
      const filament: Filament = {
        id: generateFilamentId(),
        name: editorData.name || 'New Filament',
        hexColor: editorData.hexColor,
        d50Mm: editorData.d50Mm,
        td: calculateTdFromD50(editorData.d50Mm),
        enabled: false, // avoid affecting current project until Apply
        orderIndex: filaments.length,
        calibration: {
          method: 'backlit_step_wedge',
          d50Mm: editorData.d50Mm,
          layerHeightMm: 0.2,
          infillPercent: 100,
        },
      };

      addFilament(filament);
      setSelectedFilamentIds((prev) => (prev.includes(filament.id) ? prev : [...prev, filament.id]));
      setEditorOpen(false);
      return;
    }

    if (!editorTargetId) return;
    updateFilament(editorTargetId, {
      name: editorData.name,
      hexColor: editorData.hexColor,
      d50Mm: editorData.d50Mm,
      td: calculateTdFromD50(editorData.d50Mm),
    });
    setEditorOpen(false);
  };

  const requestDelete = (filament: Filament) => {
    setFilamentToDelete(filament);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (filamentToDelete) {
      removeFilament(filamentToDelete.id);
      setSelectedFilamentIds((prev) => prev.filter((id) => id !== filamentToDelete.id));
    }
    setDeleteModalOpen(false);
    setFilamentToDelete(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      fullScreen
      closeOnClickOutside={false}
      title="Easy Mode"
      zIndex={2000}
    >
      <Stack h="100%" gap="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} c="forge.0">
              Guided setup
            </Text>
            <Text size="xs" c="dimmed">
              Pick filaments, explore previews, then apply settings to your project.
            </Text>
          </Stack>
          <Group gap="xs" style={{ flexShrink: 0 }}>
            {wizardImageDataUrl && (
              <Button size="xs" variant="subtle" onClick={openImageForWizard} disabled={isApplying}>
                Change image
              </Button>
            )}
            <Button size="xs" variant="subtle" onClick={handleCancel} disabled={isApplying}>
              Cancel
            </Button>
            <Button size="xs" onClick={handleApply} disabled={applyDisabled}>
              {isApplying ? 'Applying...' : 'Apply'}
            </Button>
          </Group>
        </Group>

        <Stepper
          active={Math.max(0, steps.indexOf(step))}
          onStepClick={(idx) => {
            const id = steps[idx];
            if (!id) return;
            if ((id === 'explore' || id === 'refine') && !canGoToExplore) return;
            if (id === 'explore') {
              handleExplore();
              return;
            }
            if (id === 'refine' && refineRecipes.length === 0) return;
            setStep(id);
          }}
          styles={{ stepLabel: { fontSize: 12 }, stepDescription: { fontSize: 11 } }}
        >
          {needsImageStep && <Stepper.Step label="Image" description="Load an image" />}
          <Stepper.Step label="Filaments" description="Select your set" />
          <Stepper.Step label="Explore" description="Pick a recipe" />
          <Stepper.Step label="Refine" description="Iterate quickly" />
        </Stepper>

        <Divider />

        <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {step === 'image' && (
            <Stack gap="md" align="center" py="xl">
              <Text size="sm" c="dimmed">
                Load an image to start
              </Text>
              <Button onClick={openImageForWizard}>Open image</Button>
              {wizardImageDataUrl && (
                <Image src={wizardImageDataUrl} fit="contain" style={{ maxHeight: 260, maxWidth: 520 }} />
              )}
            </Stack>
          )}

          {step === 'filaments' && (
            <Stack gap="md">
              <Group justify="space-between" align="flex-end">
                <Stack gap={2}>
                  <Text size="sm" fw={600}>
                    Select filaments
                  </Text>
                  <Text size="xs" c="dimmed">
                    Tip: 2-4 filaments is usually best.
                  </Text>
                </Stack>
                <Group gap="xs">
                  <Button size="xs" variant="light" onClick={() => applyPack(2)}>
                    2-pack
                  </Button>
                  <Button size="xs" variant="light" onClick={() => applyPack(3)}>
                    3-pack
                  </Button>
                  <Button size="xs" variant="light" onClick={() => applyPack(4)}>
                    4-pack
                  </Button>
                </Group>
              </Group>

              {!wizardImageDataUrl && (
                <Box>
                  <Text size="xs" c="dimmed">
                    No image loaded yet.
                  </Text>
                  <Button mt="xs" size="xs" onClick={openImageForWizard}>
                    Open image
                  </Button>
                </Box>
              )}

              <Group justify="space-between" align="center">
                <TextInput
                  placeholder="Search filament..."
                  size="xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button size="xs" onClick={openAddFilament}>
                  + Add
                </Button>
              </Group>

              <Stack gap="xs">
                {sortedFilaments.map((f) => {
                  const checked = selectedFilamentIds.includes(f.id);
                  return (
                    <Box
                      key={f.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid rgba(31, 174, 122, 0.18)',
                        backgroundColor: checked ? 'rgba(15, 46, 38, 0.45)' : 'rgba(10, 13, 15, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Checkbox checked={checked} onChange={() => toggleSelectedFilament(f.id)} />
                      <Box
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          backgroundColor: f.hexColor,
                          boxShadow: `0 0 8px ${f.hexColor}40`,
                          flexShrink: 0,
                        }}
                      />
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                          {f.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Td {f.td.toFixed(2)} • d95 {f.d50Mm.toFixed(2)} mm
                        </Text>
                      </Box>
                      <Group gap="xs" style={{ flexShrink: 0 }}>
                        <Button size="xs" variant="subtle" onClick={() => openEditFilament(f)}>
                          Edit
                        </Button>
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => requestDelete(f)} title="Delete">
                          ×
                        </ActionIcon>
                      </Group>
                    </Box>
                  );
                })}

                {sortedFilaments.length === 0 && (
                  <Text size="xs" c="dimmed" ta="center" py="xl">
                    No filaments found.
                  </Text>
                )}
              </Stack>
            </Stack>
          )}

          {(step === 'explore' || step === 'refine') && (
            <Stack gap="md">
              <Group justify="space-between" align="flex-end">
                <Stack gap={2}>
                  <Text size="sm" fw={600}>
                    {step === 'explore' ? 'Explore recipes' : 'Refine'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {step === 'explore'
                      ? 'Pick the preview you like; then refine around it.'
                      : 'Select a variant, then generate another round if needed.'}
                  </Text>
                </Stack>
              </Group>

              {step === 'refine' && (
                <Group justify="space-between">
                  <Button size="xs" variant="subtle" onClick={() => setStep('explore')} disabled={isApplying}>
                    Back
                  </Button>
                  <Button size="xs" variant="light" onClick={handleAnotherRound} disabled={!finalRecipe || isApplying}>
                    Another round
                  </Button>
                </Group>
              )}

              {isGenerating && (
                <Box>
                  <Text size="xs" c="dimmed" mb={6}>
                    Generating previews...
                  </Text>
                  <Progress value={generationProgress} size="sm" radius="xl" color="forge" animated />
                </Box>
              )}

              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                {displayedRecipes.map((recipe) => (
                  <RecipeTile
                    key={recipe.id}
                    recipe={recipe}
                    thumb={thumbs[recipe.id]}
                    selected={selectedRecipeId === recipe.id}
                    printSettings={printSettings}
                    selectedFilamentCount={selectedFilamentIds.length}
                    filamentNameById={filamentNameById}
                    onClick={() => {
                      if (step === 'explore') handlePickExploreRecipe(recipe);
                      else setSelectedRecipeId(recipe.id);
                    }}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          )}
        </Box>

        <Group justify="space-between" mt="auto" pt="sm">
          <Button
            variant="subtle"
            onClick={() => {
              const idx = steps.indexOf(step);
              if (idx <= 0) return;
              setStep(steps[idx - 1]);
            }}
            disabled={isApplying || steps.indexOf(step) <= 0}
          >
            Back
          </Button>

          <Group gap="xs">
            {step === 'image' && (
              <Button onClick={() => setStep('filaments')} disabled={!wizardImageDataUrl || isApplying}>
                Next
              </Button>
            )}
            {step === 'filaments' && (
              <Button onClick={handleExplore} disabled={!canGoToExplore || isApplying}>
                Explore
              </Button>
            )}
          </Group>
        </Group>

        <Modal
          opened={editorOpen}
          onClose={() => setEditorOpen(false)}
          title={editorMode === 'add' ? 'Add filament' : 'Edit filament'}
          size="sm"
          zIndex={2100}
        >
          <Stack gap="sm">
            <TextInput
              label="Name"
              value={editorData.name}
              onChange={(e) => setEditorData({ ...editorData, name: e.target.value })}
            />
            <ColorInput
              label="Color"
              value={editorData.hexColor}
              onChange={(color) => setEditorData({ ...editorData, hexColor: color })}
            />
            <NumberInput
              label="d95 (mm)"
              value={editorData.d50Mm}
              onChange={(val) => setEditorData({ ...editorData, d50Mm: Number(val) || 0.85 })}
              min={0.1}
              max={10}
              step={0.05}
              decimalScale={2}
            />
            <Box p="xs" style={{ backgroundColor: 'var(--mantine-color-dark-6)', borderRadius: 6 }}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Calculated Td:
                </Text>
                <Text size="sm" fw={500}>
                  {editorTd.toFixed(3)}
                </Text>
              </Group>
            </Box>
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEditor}>{editorMode === 'add' ? 'Add' : 'Save'}</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete filament"
          size="sm"
          zIndex={2100}
        >
          <Stack gap="md">
            <Text size="sm">
              Delete{' '}
              <Text span fw={600} c="forge.0">
                {filamentToDelete?.name}
              </Text>
              ?
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button color="red" onClick={confirmDelete}>
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Modal>
  );
}
