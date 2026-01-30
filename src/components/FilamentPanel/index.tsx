import { useState } from 'react';
import {
  Stack,
  Text,
  Button,
  ScrollArea,
  Card,
  Group,
  ColorInput,
  TextInput,
  NumberInput,
  Checkbox,
  ActionIcon,
  Modal,
  Box,
  Tooltip,
} from '@mantine/core';
import { useProjectStore } from '../../stores/projectStore';
import { calculateTdFromD50 } from '../../types';
import type { Filament } from '../../types';

function generateId() {
  return `filament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function FilamentCard({ filament }: { filament: Filament }) {
  const { removeFilament, toggleFilament } = useProjectStore();

  // Calculate approximate layer range based on d50
  const minMm = Math.round(filament.d50Mm * 0.3 * 100) / 100;
  const maxMm = Math.round(filament.d50Mm * 1.5 * 100) / 100;

  return (
    <Box
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        backgroundColor: 'rgba(15, 46, 38, 0.4)',
        transition: 'background-color 0.2s',
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <Checkbox
          checked={filament.enabled}
          onChange={() => toggleFilament(filament.id)}
          size="xs"
        />
        <Box
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            backgroundColor: filament.hexColor,
            boxShadow: `0 0 6px ${filament.hexColor}40`,
            flexShrink: 0,
          }}
        />
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={500} truncate c="forge.0">
            {filament.name}
          </Text>
          <Tooltip label={`Td: ${filament.td.toFixed(2)} | d50: ${filament.d50Mm?.toFixed(2)} mm`} position="right">
            <Text size="xs" c="dimmed">
              {minMm}-{maxMm} mm
            </Text>
          </Tooltip>
        </Stack>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => removeFilament(filament.id)}
          style={{ opacity: 0.7 }}
        >
          ×
        </ActionIcon>
      </Group>
    </Box>
  );
}

export function FilamentPanel() {
  const { filaments, addFilament } = useProjectStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [newFilament, setNewFilament] = useState({
    name: '',
    hexColor: '#FFFFFF',
    d50Mm: 0.85, // Default d50 in mm
  });

  // Calculate Td from d50 for display
  const calculatedTd = calculateTdFromD50(newFilament.d50Mm);

  const handleAddFilament = () => {
    const filament: Filament = {
      id: generateId(),
      name: newFilament.name || 'New Filament',
      hexColor: newFilament.hexColor,
      d50Mm: newFilament.d50Mm,
      td: calculateTdFromD50(newFilament.d50Mm),
      enabled: true,
      orderIndex: filaments.length,
      calibration: {
        method: 'backlit_step_wedge',
        d50Mm: newFilament.d50Mm,
        layerHeightMm: 0.20,
        infillPercent: 100,
      },
    };
    addFilament(filament);
    setNewFilament({ name: '', hexColor: '#FFFFFF', d50Mm: 0.85 });
    setModalOpen(false);
  };

  const sortedFilaments = [...filaments].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  return (
    <Stack h="100%" gap={0}>
      <Group
        p="xs"
        justify="space-between"
        style={{ borderBottom: '1px solid rgba(26, 61, 50, 0.4)' }}
      >
        <Text size="sm" fw={600} c="forge.0">
          Filament Library
        </Text>
        <Button 
          size="xs" 
          variant="filled" 
          onClick={() => setModalOpen(true)}
          style={{ 
            boxShadow: '0 0 10px rgba(31, 174, 122, 0.3)',
          }}
        >
          + Add
        </Button>
      </Group>

      <ScrollArea style={{ flex: 1 }} p="xs">
        <Stack gap="xs">
          {sortedFilaments.map((filament) => (
            <FilamentCard key={filament.id} filament={filament} />
          ))}
          {filaments.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py="xl">
              No filaments defined.
              <br />
              Add filaments to start.
            </Text>
          )}
        </Stack>
      </ScrollArea>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Filament"
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="e.g. Bambu Basic White"
            value={newFilament.name}
            onChange={(e) =>
              setNewFilament({ ...newFilament, name: e.target.value })
            }
          />
          <ColorInput
            label="Color"
            value={newFilament.hexColor}
            onChange={(color) =>
              setNewFilament({ ...newFilament, hexColor: color })
            }
          />
          <NumberInput
            label="d50 (mm)"
            description="Grosor donde casi no se ve la linea negra de atras (95% opaco)"
            value={newFilament.d50Mm}
            onChange={(val) =>
              setNewFilament({ ...newFilament, d50Mm: Number(val) || 0.85 })
            }
            min={0.1}
            max={5}
            step={0.05}
            decimalScale={2}
          />
          <Box 
            p="xs" 
            style={{ 
              backgroundColor: 'var(--mantine-color-dark-6)', 
              borderRadius: 4 
            }}
          >
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Td calculado:</Text>
              <Text size="sm" fw={500}>{calculatedTd.toFixed(3)}</Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {calculatedTd < 0.5 ? 'Muy translúcido' : 
               calculatedTd < 1.0 ? 'Translúcido' :
               calculatedTd < 1.5 ? 'Semi-opaco' : 'Opaco'}
            </Text>
          </Box>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFilament}>Add Filament</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
