import { Modal, Text, Button, Stack, Image, Anchor, Box, Divider, Group } from '@mantine/core';

interface AboutModalProps {
  opened: boolean;
  onClose: () => void;
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function EtsyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function CoffeeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function AboutModal({ opened, onClose }: AboutModalProps) {
  const openLink = (url: string) => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      import('@tauri-apps/plugin-shell').then(({ open }) => {
        open(url);
      }).catch(() => {
        window.open(url, '_blank');
      });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title={null}
      centered
      size="sm"
      radius="md"
      styles={{
        content: {
          background: 'linear-gradient(135deg, rgba(15, 46, 38, 0.95) 0%, rgba(10, 13, 15, 0.98) 100%)',
          border: '1px solid rgba(31, 174, 122, 0.3)',
        },
        header: {
          background: 'transparent',
        },
        body: {
            padding: 24
        }
      }}
    >
      <Stack align="center" gap="lg">
        <Image src="/landing/assets/logo-horizontal.png" w={180} fit="contain" mt="xs" />
        
        <Text ta="center" size="sm" c="dimmed" lh={1.4}>
          LayerForge is a free tool designed to help you create stunning filament paintings and lithophanes.
          <br />
          <Text span c="forge.4" size="xs">Version 0.1.0 (Beta)</Text>
        </Text>

        <Divider w="100%" color="rgba(31, 174, 122, 0.2)" />

        <Stack w="100%" gap="sm">
            <Button 
                variant="light" 
                color="forge" 
                fullWidth
                size="md"
                leftSection={<InstagramIcon />}
                onClick={() => openLink('https://www.instagram.com/adventure_table')}
                styles={{ root: { height: 44 } }}
            >
                Follow on Instagram
            </Button>

             <Button 
                variant="light" 
                color="forge" 
                fullWidth
                size="md"
                leftSection={<EtsyIcon />}
                onClick={() => openLink('https://www.etsy.com/shop/AdventureTable')}
                styles={{ root: { height: 44 } }}
            >
                Visit our Etsy Shop
            </Button>

            <Button 
                variant="light" 
                color="forge" 
                fullWidth
                size="md"
                leftSection={<CoffeeIcon />}
                onClick={() => openLink('https://ko-fi.com/adventuretable')}
                styles={{ root: { height: 44 } }}
            >
                Buy us a coffee
            </Button>

             <Button 
                variant="light" 
                color="forge"
                fullWidth
                size="md"
                leftSection={<GithubIcon />}
                onClick={() => openLink('https://github.com/AdventureTable/Layerforge-app')}
                styles={{ root: { height: 44 } }}
            >
                Star on GitHub
            </Button>
        </Stack>

        <Button
          variant="subtle"
          color="gray"
          onClick={onClose}
          size="xs"
        >
          Close
        </Button>

        <Group gap={4}>
            <Text size="xs" c="dimmed">
            Powered by
            </Text>
            <Anchor
            href="https://adventure-table.com/"
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="forge.4"
            fw={500}
            onClick={(e) => {
                e.preventDefault();
                openLink('https://adventure-table.com/');
            }}
            >
            Adventure Table
            </Anchor>
        </Group>

        <Text size="xs" c="dimmed" ta="center" style={{ opacity: 0.5 }}>
          Copyright © 2026 LayerForge. Source Available License.
        </Text>
      </Stack>
    </Modal>
  );
}
