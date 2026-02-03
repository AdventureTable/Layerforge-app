import { Box, Text, Title, Stack, Button, List, ThemeIcon, Group, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { STRIPE_PAYMENT_LINK } from '../constants';

const features = [
  'Pago único',
  'Actualizaciones incluidas',
  'Uso personal y comercial',
  'Colores ilimitados',
  'Export STL + Plan de cambios',
  'Plan de cambios por altura',
];

export function Pricing() {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({ threshold: 0.2 });
  const isMobile = useMediaQuery('(max-width: 768px)');
  const stripeLink = STRIPE_PAYMENT_LINK.trim();
  const purchaseHref = stripeLink.length > 0 ? stripeLink : '#pricing';
  const purchaseTarget = stripeLink.length > 0 ? '_blank' : undefined;
  const purchaseRel = stripeLink.length > 0 ? 'noopener noreferrer' : undefined;
  
  return (
    <section 
      id="pricing"
      ref={ref}
      className="landing-section"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      <Stack gap={isMobile ? "lg" : "xl"} align="center">
        <Box ta="center" mb={isMobile ? "sm" : "lg"}>
          <Text size="sm" c="forge.4" fw={500} mb="xs">
            PRECIO
          </Text>
          <Title order={2} size={isMobile ? "1.5rem" : undefined} c="white">
            Sin trucos. Sin letra pequeña.
          </Title>
        </Box>
        
        <Box className="pricing-card" maw={450} w="100%">
          <Stack gap={isMobile ? "md" : "lg"} align="center">
            <Badge 
              size={isMobile ? "md" : "lg"}
              variant="light" 
              color="forge"
              style={{ 
                boxShadow: '0 0 15px rgba(31, 174, 122, 0.3)',
              }}
            >
              Early Access
            </Badge>
            
            <Box ta="center">
              <Group gap="xs" justify="center" align="baseline">
                <Title 
                  order={1} 
                  size={isMobile ? "3rem" : "4rem"}
                  className="glow-text glow-text--strong"
                  style={{ fontWeight: 700 }}
                >
                  5€
                </Title>
                <Text size={isMobile ? "md" : "lg"} c="dimmed" td="line-through">15€</Text>
              </Group>
              <Text size={isMobile ? "xs" : "sm"} c="dimmed" mt="xs">
                Después del early access
              </Text>
            </Box>
            
            <List
              spacing={isMobile ? "xs" : "sm"}
              size={isMobile ? "xs" : "sm"}
              center
              icon={
                <ThemeIcon color="forge" size={isMobile ? 18 : 20} radius="xl">
                  <Text size="xs">✓</Text>
                </ThemeIcon>
              }
            >
              {features.map((feature) => (
                <List.Item key={feature}>
                  <Text c="gray.3" size={isMobile ? "sm" : undefined}>{feature}</Text>
                </List.Item>
              ))}
            </List>
            
            <Button
              size={isMobile ? "lg" : "xl"}
              fullWidth
              className="cta-primary"
              mt={isMobile ? "sm" : "md"}
              component="a"
              href={purchaseHref}
              target={purchaseTarget}
              rel={purchaseRel}
              styles={{
                root: {
                  height: isMobile ? 48 : 56,
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: 600,
                }
              }}
            >
              Comprar LayerForge
            </Button>
            
            <Text size="xs" c="dimmed" ta="center" maw={300}>
              La activación es ligera y solo para evitar pirateo casual. Luego funciona offline.
            </Text>
          </Stack>
        </Box>
      </Stack>
    </section>
  );
}
