import { Box, Text, Stack, Image, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { DemoApp } from './DemoApp';
import { useTranslation } from '../i18n/LanguageContext';

function MobileFallback() {
  const t = useTranslation();
  
  return (
    <Box 
      className="demo-mobile-fallback"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 46, 38, 0.4) 0%, rgba(10, 13, 15, 0.8) 100%)',
        border: '1px solid rgba(31, 174, 122, 0.3)',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <Stack gap="md" align="center">
        <Image
          src="/landing/assets/personaje_layerforgeado.PNG"
          alt="LayerForge Preview"
          h={200}
          fit="contain"
          radius="md"
          style={{
            boxShadow: '0 0 30px rgba(31, 174, 122, 0.2)',
          }}
        />
        
        <Text size="lg" c="white" fw={500}>
          {t.interface.mobileTitle}
        </Text>
        
        <Text size="sm" c="dimmed" maw={280}>
          {t.interface.mobileDesc}
        </Text>
        
        <Text size="xs" c="forge.2" fs="italic">
          {t.interface.mobileNote}
        </Text>
        
        <Button
          variant="filled"
          color="forge"
          size="sm"
          component="a"
          href="#download"
          style={{
            boxShadow: '0 0 15px rgba(31, 174, 122, 0.3)',
          }}
        >
          {t.interface.mobileBtn}
        </Button>
      </Stack>
    </Box>
  );
}

export function InterfaceShowcase() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const t = useTranslation();
  
  return (
    <section id="interface" className="landing-section">
      <Stack gap="xl" align="center">
        <Box ta="center" mb={isMobile ? "sm" : "lg"}>
          <Text size="sm" c="forge.4" fw={500} mb="xs">
            {t.interface.label}
          </Text>
          <Text size={isMobile ? "lg" : "xl"} c="white" fw={600}>
            {t.interface.title}
          </Text>
          <Text size={isMobile ? "xs" : "sm"} c="dimmed" mt="xs">
            {isMobile ? t.interface.subtitleMobile : t.interface.subtitleDesktop}
          </Text>
        </Box>
        
        <Box style={{ maxWidth: 1100, width: '100%' }}>
          {isMobile ? <MobileFallback /> : <DemoApp />}
        </Box>
      </Stack>
    </section>
  );
}
