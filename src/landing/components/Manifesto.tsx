import { Box, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

export function Manifesto() {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({ threshold: 0.2 });
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <section
      id="manifesto"
      ref={ref}
      className="manifesto"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      <Stack gap={isMobile ? 'md' : 'lg'} align="center" maw={900} mx="auto" px={isMobile ? 'sm' : 0}>
        <Text size="sm" c="forge.4" fw={500} mb="xs">
          MANIFIESTO
        </Text>

        <Title
          order={2}
          size={isMobile ? '1.5rem' : '2.25rem'}
          c="white"
          ta="center"
          style={{ lineHeight: 1.3 }}
        >
          LayerForge no nace de la rabia. Nace de la curiosidad.
        </Title>

        <Stack gap={isMobile ? 'xs' : 'sm'} maw={720}>
          <Text size={isMobile ? 'sm' : 'lg'} c="dimmed" ta="center">
            De preguntarse: "¿Por qué esto es así?"
          </Text>
          <Text size={isMobile ? 'sm' : 'lg'} c="dimmed" ta="center">
            Y de una respuesta sencilla: "Nah. I'll do it myself."
          </Text>
          <Text size={isMobile ? 'sm' : 'lg'} c="dimmed" ta="center">
            No es un ataque. No es una cruzada. Es una sonrisa silenciosa mientras el código compila.
          </Text>
        </Stack>

        <Box className="manifesto__quote">
          <Text size={isMobile ? 'sm' : 'md'} c="forge.2" fs="italic" ta="center">
            "Nah. I'll win."
          </Text>
        </Box>
      </Stack>
    </section>
  );
}
