import { Modal, Button, Text, Group, Stack } from '@mantine/core';
import { useProjectStore } from '../../stores/projectStore';

export function ResolutionChangeModal() {
  const showModal = useProjectStore((state) => state.showResolutionModal);
  const pendingResolution = useProjectStore((state) => state.pendingResolutionChange);
  const currentResolution = useProjectStore((state) => state.printSettings.meshResolution);
  const acceptPendingResolution = useProjectStore((state) => state.acceptPendingResolution);
  const rejectPendingResolution = useProjectStore((state) => state.rejectPendingResolution);

  return (
    <Modal
      opened={showModal}
      onClose={rejectPendingResolution}
      title="Resolution Change"
      centered
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm">
          The recommended mesh resolution has changed based on your settings.
        </Text>
        
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Current resolution:</Text>
          <Text size="sm" fw={500}>{currentResolution}</Text>
        </Group>
        
        <Group justify="space-between">
          <Text size="sm" c="dimmed">New recommended:</Text>
          <Text size="sm" fw={500} c="forge">{pendingResolution}</Text>
        </Group>
        
        <Text size="sm" c="dimmed">
          Would you like to update to the new recommended resolution, or keep your current value?
        </Text>
        
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={rejectPendingResolution}>
            Keep Current
          </Button>
          <Button onClick={acceptPendingResolution}>
            Use Recommended
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
