import { Modal, Stack, Text, Button, Group, Anchor, Box, Divider } from '@mantine/core';

// URLs - these should match the landing page constants
const INSTAGRAM_URL = 'https://www.instagram.com/adventure_table';
const ETSY_URL = 'https://www.etsy.com/shop/AdventureTable';
const GUMROAD_COFFEE_URL = ''; // Placeholder - add your Gumroad link here

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function EtsyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.559 4.283c0-.347.06-.578.18-.694.121-.115.32-.173.599-.173h6.348c.855 0 1.472.263 1.851.788.38.525.569 1.388.569 2.589v.203h1.983V2.283L19.735 2H4.69L4.265 2.283v4.713h1.985v-.203c0-.885.09-1.533.268-1.943.179-.41.52-.61 1.022-.61h.019zm0 15.434c0-.887.09-1.533.268-1.943.179-.41.52-.615 1.022-.615h.668c.855 0 1.538.242 2.048.726.51.484.765 1.149.765 1.994v.203H15.314v-.203c0-.885.091-1.533.268-1.943.179-.41.52-.615 1.022-.615h.019c.279 0 .479-.058.599-.173.121-.116.181-.347.181-.694v-7.786c0-.347-.06-.578-.181-.694-.12-.115-.32-.173-.599-.173h-3.158c-.855 0-1.543.237-2.062.712-.52.475-.788 1.127-.805 1.955v.203H8.611v-.203c0-.865.255-1.518.765-1.955.51-.438 1.195-.659 2.052-.712h3.158c.855 0 1.472.264 1.851.789.379.525.569 1.387.569 2.588v7.786c0 1.201-.19 2.064-.569 2.589-.379.525-.996.788-1.851.788H8.559v1.986h10.702c.347 0 .578-.06.694-.181.115-.12.173-.319.173-.598V5.689c0-.279-.058-.478-.173-.599-.116-.12-.347-.18-.694-.18H3.389c-.347 0-.578.06-.694.18-.115.121-.173.32-.173.599v16.622c0 .279.058.478.173.598.116.121.347.181.694.181h5.17v-3.373z"/>
    </svg>
  );
}

function CoffeeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 21v-2h18v2H2zm2-4v-5q0-1.25.875-2.125T7 9h10q1.25 0 2.125.875T20 12v5h2q.425 0 .713.288T23 18v1H1v-1q0-.425.288-.713T2 17h2zm2 0h10v-5H6v5zm12-5h2v5h-2v-5zM2 8V6h18v2H2zm9-3V2h2v3h-2z"/>
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
}

interface SupportModalProps {
  opened: boolean;
  onClose: () => void;
}

export function SupportModal({ opened, onClose }: SupportModalProps) {
  const hasCoffeeLink = GUMROAD_COFFEE_URL.trim().length > 0;

  const openLink = (url: string) => {
    // Use Tauri's shell open if available, otherwise fallback to window.open
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
          padding: '24px',
        },
      }}
    >
      <Stack gap="lg" align="center">
        {/* Heart icon */}
        <Box
          style={{
            color: '#1FAE7A',
            filter: 'drop-shadow(0 0 10px rgba(31, 174, 122, 0.5))',
          }}
        >
          <HeartIcon />
        </Box>

        {/* Title */}
        <Text size="lg" fw={600} c="white" ta="center">
          Thanks for using LayerForge!
        </Text>

        {/* Subtitle */}
        <Text size="sm" c="dimmed" ta="center" maw={280}>
          LayerForge is free. If you find it useful, consider supporting us:
        </Text>

        <Divider w="100%" color="rgba(31, 174, 122, 0.2)" />

        {/* Support buttons */}
        <Stack gap="sm" w="100%">
          <Button
            variant="light"
            color="forge"
            fullWidth
            leftSection={<InstagramIcon />}
            onClick={() => openLink(INSTAGRAM_URL)}
            styles={{
              root: {
                height: 44,
              },
            }}
          >
            Follow on Instagram
          </Button>

          <Button
            variant="light"
            color="forge"
            fullWidth
            leftSection={<EtsyIcon />}
            onClick={() => openLink(ETSY_URL)}
            styles={{
              root: {
                height: 44,
              },
            }}
          >
            Visit our Etsy Shop
          </Button>

          {hasCoffeeLink && (
            <Button
              variant="light"
              color="forge"
              fullWidth
              leftSection={<CoffeeIcon />}
              onClick={() => openLink(GUMROAD_COFFEE_URL)}
              styles={{
                root: {
                  height: 44,
                },
              }}
            >
              Buy me a coffee
            </Button>
          )}
        </Stack>

        {/* Close button */}
        <Button
          variant="subtle"
          color="gray"
          onClick={onClose}
          mt="xs"
        >
          Close
        </Button>

        {/* Powered by */}
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
      </Stack>
    </Modal>
  );
}
