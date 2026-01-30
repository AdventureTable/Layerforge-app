import { Box, Text, Stack, Anchor, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

export function Footer() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <footer className="footer">
      <Stack gap={isMobile ? "md" : "lg"} align="center">
        <Text 
          size={isMobile ? "md" : "lg"}
          c="dimmed"
          fs="italic"
        >
          Built out of curiosity.
        </Text>
        
        <Text 
          size={isMobile ? "lg" : "xl"}
          fw={600}
          className="glow-text"
          style={{ letterSpacing: '0.05em' }}
        >
          Nah. I'll win.
        </Text>
        
        <Box 
          mt={isMobile ? "md" : "xl"}
          pt={isMobile ? "md" : "lg"}
          style={{ borderTop: '1px solid rgba(31, 174, 122, 0.1)' }}
          w="100%"
          maw={600}
        >
          <Group justify="center" gap={isMobile ? "lg" : "xl"}>
            <Anchor href="#" c="dimmed" size={isMobile ? "xs" : "sm"} style={{ textDecoration: 'none' }}>
              Manifiesto
            </Anchor>
            <Anchor href="#" c="dimmed" size={isMobile ? "xs" : "sm"} style={{ textDecoration: 'none' }}>
              Soporte
            </Anchor>
            <Anchor href="#" c="dimmed" size={isMobile ? "xs" : "sm"} style={{ textDecoration: 'none' }}>
              Contacto
            </Anchor>
          </Group>
        </Box>
        
        <Text size="xs" c="dimmed" mt={isMobile ? "md" : "lg"}>
          © {new Date().getFullYear()} LayerForge. Hecho con curiosidad.
        </Text>
      </Stack>
    </footer>
  );
}
