import { Box, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useTranslation } from '../i18n/LanguageContext';

export function Manifesto() {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({ threshold: 0.2 });
  const isMobile = useMediaQuery('(max-width: 768px)');
  const t = useTranslation();

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
          {t.manifesto.label}
        </Text>

        <Title
          order={2}
          size={isMobile ? '1.5rem' : '2.25rem'}
          c="white"
          ta="center"
          style={{ lineHeight: 1.3 }}
        >
          {t.manifesto.title}
        </Title>

        <Stack gap={isMobile ? 'xs' : 'sm'} maw={720}>
          <Text size={isMobile ? 'sm' : 'lg'} c="dimmed" ta="center">
            {t.manifesto.line1}
          </Text>
          <Text size={isMobile ? 'sm' : 'lg'} c="dimmed" ta="center">
            {t.manifesto.line2}
          </Text>
          <Text size={isMobile ? 'sm' : 'lg'} c="dimmed" ta="center">
            {t.manifesto.line3}
          </Text>
        </Stack>

        <Box className="manifesto__quote">
          <Text size={isMobile ? 'sm' : 'md'} c="forge.2" fs="italic" ta="center">
            {t.manifesto.quote}
          </Text>
        </Box>
      </Stack>
    </section>
  );
}
