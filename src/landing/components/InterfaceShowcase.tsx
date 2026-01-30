import { Box, Text, Stack, Image, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { DemoApp } from './DemoApp';

function MobileFallback() {
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
          Interfaz interactiva
        </Text>
        
        <Text size="sm" c="dimmed" maw={280}>
          La demo completa está diseñada para pantallas más grandes. 
          Pruébala en desktop para la experiencia completa.
        </Text>
        
        <Text size="xs" c="forge.2" fs="italic">
          O mejor aún, cómpralo y úsalo donde quieras.
        </Text>
        
        <Button
          variant="filled"
          color="forge"
          size="sm"
          component="a"
          href="#pricing"
          style={{
            boxShadow: '0 0 15px rgba(31, 174, 122, 0.3)',
          }}
        >
          Ver precio
        </Button>
      </Stack>
    </Box>
  );
}

export function InterfaceShowcase() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <section className="landing-section">
      <Stack gap="xl" align="center">
        <Box ta="center" mb={isMobile ? "sm" : "lg"}>
          <Text size="sm" c="forge.4" fw={500} mb="xs">
            LA INTERFAZ
          </Text>
          <Text size={isMobile ? "lg" : "xl"} c="white" fw={600}>
            Simple. Directa. Sin rodeos.
          </Text>
          <Text size={isMobile ? "xs" : "sm"} c="dimmed" mt="xs">
            {isMobile ? "Mejor experiencia en desktop" : "Prueba los controles - es la aplicación real"}
          </Text>
        </Box>
        
        <Box style={{ maxWidth: 1100, width: '100%' }}>
          {isMobile ? <MobileFallback /> : <DemoApp />}
        </Box>
      </Stack>
    </section>
  );
}
