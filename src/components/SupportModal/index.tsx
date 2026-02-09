import { Modal, Stack, Text, Button, Group, Anchor, Box, Divider } from '@mantine/core';

// URLs - these should match the landing page constants
const INSTAGRAM_URL = 'https://www.instagram.com/adventure_table';
const ETSY_URL = 'https://www.etsy.com/shop/AdventureTable';
const GUMROAD_COFFEE_URL = 'https://ko-fi.com/adventuretable';

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

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.28 3.6-2.54 3.6-5.36 0-3.07-2.48-5.64-5.6-5.64a5.83 5.83 0 0 0-4 1.6A5.83 5.83 0 0 0 9 3c-3.12 0-5.6 2.57-5.6 5.64 0 2.82 2.11 4.08 3.6 5.36L12 21l7-7z" />
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

interface SupportModalProps {
  opened: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function SupportModal({ 
  opened, 
  onClose,
  title = "Thanks for using LayerForge!",
  description = "LayerForge is free. If you find it useful, consider supporting us:"
}: SupportModalProps) {
  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
          {title}
        </Text>

        {/* Subtitle */}
        <Text size="sm" c="dimmed" ta="center" maw={280}>
          {description}
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
