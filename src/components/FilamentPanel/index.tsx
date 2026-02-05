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

function FilamentCard({ 
  filament, 
  onDeleteClick, 
  onEditClick 
}: { 
  filament: Filament; 
  onDeleteClick: (filament: Filament) => void;
  onEditClick: (filament: Filament) => void;
}) {
  const { toggleFilament } = useProjectStore();

  // Calculate approximate layer range based on d50
  const minMm = Math.round(filament.d50Mm * 0.3 * 100) / 100;
  const maxMm = Math.round(filament.d50Mm * 1.5 * 100) / 100;

  return (
    <Box
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        backgroundColor: filament.enabled ? 'rgba(15, 46, 38, 0.4)' : 'rgba(15, 46, 38, 0.2)',
        transition: 'background-color 0.2s',
        opacity: filament.enabled ? 1 : 0.6,
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <Checkbox
          checked={filament.enabled}
          onChange={() => toggleFilament(filament.id)}
          size="xs"
        />
        <Box
          onClick={() => onEditClick(filament)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            minWidth: 0,
            cursor: 'pointer',
          }}
        >
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
            <Tooltip label={`Td: ${filament.td.toFixed(2)} | d95: ${filament.d50Mm?.toFixed(2)} mm`} position="right">
              <Text size="xs" c="dimmed">
                {minMm}-{maxMm} mm
              </Text>
            </Tooltip>
          </Stack>
        </Box>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => onDeleteClick(filament)}
          style={{ opacity: 0.7 }}
        >
          ×
        </ActionIcon>
      </Group>
    </Box>
  );
}

export function FilamentPanel() {
  const { filaments, addFilament, removeFilament, updateFilament } = useProjectStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [filamentToDelete, setFilamentToDelete] = useState<Filament | null>(null);
  const [filamentToEdit, setFilamentToEdit] = useState<Filament | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFilament, setNewFilament] = useState({
    name: '',
    hexColor: '#FFFFFF',
    d50Mm: 0.85, // Default d50 in mm
  });
  const [editFilamentData, setEditFilamentData] = useState({
    name: '',
    hexColor: '#FFFFFF',
    d50Mm: 0.85,
  });

  // Calculate Td from d50 for display
  const calculatedTd = calculateTdFromD50(newFilament.d50Mm);
  const editCalculatedTd = calculateTdFromD50(editFilamentData.d50Mm);

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

  const handleDeleteClick = (filament: Filament) => {
    setFilamentToDelete(filament);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (filamentToDelete) {
      removeFilament(filamentToDelete.id);
    }
    setDeleteModalOpen(false);
    setFilamentToDelete(null);
  };

  const handleEditClick = (filament: Filament) => {
    setFilamentToEdit(filament);
    setEditFilamentData({
      name: filament.name,
      hexColor: filament.hexColor,
      d50Mm: filament.d50Mm,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (filamentToEdit) {
      updateFilament(filamentToEdit.id, {
        name: editFilamentData.name || filamentToEdit.name,
        hexColor: editFilamentData.hexColor,
        d50Mm: editFilamentData.d50Mm,
        td: calculateTdFromD50(editFilamentData.d50Mm),
      });
    }
    setEditModalOpen(false);
    setFilamentToEdit(null);
  };

  // Sort: enabled first, then by orderIndex. Filter by search query.
  const sortedFilaments = [...filaments]
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Enabled first
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1;
      }
      // Then by orderIndex
      return a.orderIndex - b.orderIndex;
    });

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

      {/* Search input */}
      <Box px="xs" pt="xs">
        <TextInput
          placeholder="Search filament..."
          size="xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          styles={{
            input: {
              backgroundColor: 'rgba(15, 46, 38, 0.3)',
              borderColor: 'rgba(31, 174, 122, 0.2)',
            }
          }}
        />
      </Box>

      <ScrollArea style={{ flex: 1 }} p="xs">
        <Stack gap="xs">
          {sortedFilaments.map((filament) => (
            <FilamentCard 
              key={filament.id} 
              filament={filament} 
              onDeleteClick={handleDeleteClick}
              onEditClick={handleEditClick}
            />
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

      {/* Calibration section */}
      <Box
        p="xs"
        style={{ borderTop: '1px solid rgba(26, 61, 50, 0.4)' }}
      >
        <Button 
          size="xs" 
          variant="subtle" 
          fullWidth
          c="forge.2"
          onClick={() => setCalibrationModalOpen(true)}
        >
          Calibrate filament
        </Button>
      </Box>

      {/* Calibration Modal */}
      <Modal
        opened={calibrationModalOpen}
        onClose={() => setCalibrationModalOpen(false)}
        title="Calibrate filament"
        size="md"
        zIndex={1000}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            To obtain the d95 value of your filaments, print the calibration STL and measure at which step the black line is barely visible.
          </Text>
          
          <Box 
            p="sm" 
            style={{ 
              backgroundColor: 'rgba(15, 46, 38, 0.4)', 
              borderRadius: 8,
              border: '1px solid rgba(31, 174, 122, 0.2)',
            }}
          >
            <Stack gap="xs">
              <Text size="sm" fw={600} c="forge.0">Instructions:</Text>
              <Text size="xs" c="gray.4">
                1. Download and print the STL with the filament you want to calibrate
              </Text>
              <Text size="xs" c="gray.4">
                2. Use 100% infill and 0.20mm layer height
              </Text>
              <Text size="xs" c="gray.4">
                3. Place the piece over a black line (or use a marker)
              </Text>
              <Text size="xs" c="gray.4">
                4. Find the step where the black line is barely visible (95% opaque)
              </Text>
              <Text size="xs" c="gray.4">
                5. That thickness in mm is your d95 value
              </Text>
            </Stack>
          </Box>

          <Button 
            component="a"
            href="/landing/assets/testlayerforge.stl"
            download="testlayerforge.stl"
            fullWidth
            style={{ 
              boxShadow: '0 0 10px rgba(31, 174, 122, 0.3)',
            }}
          >
            Download calibration STL
          </Button>

          <Button 
            variant="subtle" 
            onClick={() => setCalibrationModalOpen(false)}
          >
            Close
          </Button>
        </Stack>
      </Modal>

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
            label={
              <Group gap={4} align="center">
                <Text size="sm" fw={500}>d95 (mm)</Text>
                <Tooltip label="How to get this value?">
                  <ActionIcon 
                    size="xs" 
                    variant="subtle" 
                    c="forge.2"
                    onClick={() => setCalibrationModalOpen(true)}
                  >
                    <Text size="xs" fw={700}>?</Text>
                  </ActionIcon>
                </Tooltip>
              </Group>
            }
            description="Thickness where the black line behind is barely visible (95% opaque)"
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
              <Text size="xs" c="dimmed">Calculated Td:</Text>
              <Text size="sm" fw={500}>{calculatedTd.toFixed(3)}</Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {calculatedTd < 0.5 ? 'Very translucent' : 
               calculatedTd < 1.0 ? 'Translucent' :
               calculatedTd < 1.5 ? 'Semi-opaque' : 'Opaque'}
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

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete filament"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete{' '}
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

      {/* Edit Filament Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit filament"
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="e.g. Bambu Basic White"
            value={editFilamentData.name}
            onChange={(e) =>
              setEditFilamentData({ ...editFilamentData, name: e.target.value })
            }
          />
          <ColorInput
            label="Color"
            value={editFilamentData.hexColor}
            onChange={(color) =>
              setEditFilamentData({ ...editFilamentData, hexColor: color })
            }
          />
          <NumberInput
            label={
              <Group gap={4} align="center">
                <Text size="sm" fw={500}>d95 (mm)</Text>
                <Tooltip label="How to get this value?">
                  <ActionIcon 
                    size="xs" 
                    variant="subtle" 
                    c="forge.2"
                    onClick={() => setCalibrationModalOpen(true)}
                  >
                    <Text size="xs" fw={700}>?</Text>
                  </ActionIcon>
                </Tooltip>
              </Group>
            }
            description="Thickness where the black line behind is barely visible (95% opaque)"
            value={editFilamentData.d50Mm}
            onChange={(val) =>
              setEditFilamentData({ ...editFilamentData, d50Mm: Number(val) || 0.85 })
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
              <Text size="xs" c="dimmed">Calculated Td:</Text>
              <Text size="sm" fw={500}>{editCalculatedTd.toFixed(3)}</Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {editCalculatedTd < 0.5 ? 'Very translucent' : 
               editCalculatedTd < 1.0 ? 'Translucent' :
               editCalculatedTd < 1.5 ? 'Semi-opaque' : 'Opaque'}
            </Text>
          </Box>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
