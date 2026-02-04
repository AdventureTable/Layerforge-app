import { Box, Text, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useTranslation } from '../i18n/LanguageContext';

export function Philosophy() {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({ threshold: 0.3 });
  const isMobile = useMediaQuery('(max-width: 768px)');
  const t = useTranslation();
  
  return (
    <section 
      ref={ref}
      className="philosophy"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      <Stack gap={isMobile ? "lg" : "xl"} align="center" maw={800} mx="auto" px={isMobile ? "sm" : 0}>
        <Text 
          size={isMobile ? "1.25rem" : "2.5rem"}
          fw={300} 
          c="white"
          ta="center"
          style={{ lineHeight: 1.4 }}
          className="philosophy-title"
        >
          {t.philosophy.title1}{' '}
          <span className="glow-text">{t.philosophy.titleHighlight}</span>
          {' '}{t.philosophy.title2}
        </Text>
        
        <Text 
          size={isMobile ? "sm" : "lg"}
          c="dimmed" 
          ta="center"
          maw={600}
        >
          {t.philosophy.subtitle}
        </Text>
        
        <Box 
          mt={isMobile ? "md" : "xl"}
          pt={isMobile ? "md" : "xl"}
          style={{ borderTop: '1px solid rgba(31, 174, 122, 0.2)' }}
        >
          <Text 
            size={isMobile ? "sm" : "md"}
            c="forge.2" 
            ta="center"
            fs="italic"
          >
            {t.philosophy.quote}
          </Text>
        </Box>
      </Stack>
    </section>
  );
}
