import { Box, Title, Text, Button, Group, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { NebulaScene } from '../three/NebulaScene';
import { Character3D } from '../three/Character3D';
import { STRIPE_PAYMENT_LINK } from '../constants';

export function Hero() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const stripeLink = STRIPE_PAYMENT_LINK.trim();
  const purchaseHref = stripeLink.length > 0 ? stripeLink : '#pricing';
  const purchaseTarget = stripeLink.length > 0 ? '_blank' : undefined;
  const purchaseRel = stripeLink.length > 0 ? 'noopener noreferrer' : undefined;
  
  return (
    <section className="hero">
      {/* 3D Background */}
      <div className="hero__background">
        <NebulaScene />
      </div>
      
      {/* Content */}
      <div className="hero__content">
        {/* Left side - Text */}
        <Stack gap={isMobile ? "lg" : "xl"}>
          <Box>
            <Title 
              order={1} 
              size={isMobile ? "1.75rem" : isTablet ? "2.25rem" : "3rem"}
              fw={700}
              c="white"
              style={{ lineHeight: 1.2 }}
              className="hero__title"
            >
              Convierte una imagen en un{' '}
              <span className="glow-text glow-text--strong">relieve multicolor</span>
              {' '}de otra dimensión.
            </Title>
          </Box>
          
          <ul className="bullet-list">
            <li>
              <Text size={isMobile ? "md" : "lg"} c="gray.3">Exporta STL + Plan de cambios</Text>
            </li>
            <li>
              <Text size={isMobile ? "md" : "lg"} c="gray.3">Planifica cambios por Z</Text>
            </li>
            <li>
              <Text size={isMobile ? "md" : "lg"} c="gray.3">Colores ilimitados</Text>
            </li>
          </ul>
          
          {isMobile ? (
            <Stack gap="sm">
              <Button
                size="md"
                fullWidth
                className="cta-primary"
                component="a"
                href={purchaseHref}
                target={purchaseTarget}
                rel={purchaseRel}
                styles={{
                  root: {
                    padding: '12px 24px',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }
                }}
              >
                Pruébalo por 5€
              </Button>
              <Group gap="sm" grow>
                <Button
                  size="md"
                  variant="outline"
                  className="cta-secondary"
                  component="a"
                  href="#interface"
                >
                  Ver qué hace
                </Button>
                <Button
                  size="md"
                  variant="subtle"
                  c="forge.2"
                  component="a"
                  href="#manifesto"
                >
                  Manifiesto
                </Button>
              </Group>
            </Stack>
          ) : (
            <Group gap="md" wrap="wrap">
              <Button
                size="lg"
                className="cta-primary"
                component="a"
                href={purchaseHref}
                target={purchaseTarget}
                rel={purchaseRel}
                styles={{
                  root: {
                    padding: '12px 32px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }
                }}
              >
                Pruébalo por 5€
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="cta-secondary"
                component="a"
                href="#interface"
                styles={{
                  root: {
                    padding: '12px 24px',
                  }
                }}
              >
                Ver qué hace
              </Button>
              <Button
                size="lg"
                variant="subtle"
                c="forge.2"
                component="a"
                href="#manifesto"
                styles={{
                  root: {
                    padding: '12px 24px',
                  }
                }}
              >
                Leer el manifiesto
              </Button>
            </Group>
          )}
          
          <Text size={isMobile ? "xs" : "sm"} c="dimmed">
            Pago único · Sin suscripción · Uso comercial permitido
          </Text>
        </Stack>
        
        {/* Right side - Character (hidden on mobile via CSS, smaller on tablet) */}
        {!isMobile && (
          <Box>
            <Character3D />
          </Box>
        )}
      </div>
      
      {/* Signature */}
      <Box
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
        }}
      >
        <Text 
          size="sm" 
          c="dimmed" 
          fs="italic"
          style={{ 
            opacity: 0.6,
            letterSpacing: '0.05em'
          }}
        >
          Nah. I'll win.
        </Text>
      </Box>
    </section>
  );
}
