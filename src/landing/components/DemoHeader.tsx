import {
  Group,
  Title,
  Text,
  Badge,
} from '@mantine/core';

export function DemoHeader() {
  return (
    <Group
      h="100%"
      px="md"
      justify="space-between"
      style={{ 
        borderBottom: '1px solid rgba(31, 174, 122, 0.2)',
        backgroundColor: 'rgba(10, 13, 15, 0.6)',
      }}
    >
      <Group gap="md">
        <Title 
          order={4} 
          style={{ 
            color: '#1FAE7A',
            textShadow: '0 0 20px rgba(31, 174, 122, 0.5)',
            letterSpacing: '0.5px',
          }}
        >
          LayerForge
        </Title>
        <Badge 
          size="xs" 
          variant="filled" 
          color="forge"
          style={{ 
            boxShadow: '0 0 8px rgba(31, 174, 122, 0.4)',
            textTransform: 'uppercase',
            fontSize: 9,
          }}
        >
          DEMO
        </Badge>
      </Group>

      <Group gap="xs">
        <Text size="xs" c="dark.1" truncate style={{ maxWidth: 200 }}>
          imageimage.jpg
        </Text>
      </Group>
    </Group>
  );
}
