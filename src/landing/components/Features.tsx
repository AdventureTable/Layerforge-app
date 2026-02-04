import { Box, Text, Title, SimpleGrid, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useStaggeredAnimation } from '../hooks/useScrollAnimation';
import { useTranslation } from '../i18n/LanguageContext';

interface FeatureProps {
  title: string;
  description: string;
  icon: string;
  isVisible?: boolean;
  index?: number;
}

const featureIcons = ['▲', '◆', '≡', '◫', '↗', '✓'];

function FeatureCard({ title, description, icon, isVisible = true, index = 0 }: FeatureProps) {
  return (
    <Box 
      className="feature-card"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`,
      }}
    >
      <Stack gap="md">
        <Text 
          size="2rem" 
          className="glow-text"
          style={{ lineHeight: 1 }}
        >
          {icon}
        </Text>
        <Box>
          <Title order={4} c="white" mb="xs">
            {title}
          </Title>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            {description}
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}

export function Features() {
  const t = useTranslation();
  const features = t.features.items.map((item, index) => ({
    ...item,
    icon: featureIcons[index] || '•',
  }));
  
  const { containerRef, visibleItems } = useStaggeredAnimation(features.length, 100);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <section className="landing-section">
      <Stack gap={isMobile ? "lg" : "xl"}>
        <Box ta="center" mb={isMobile ? "sm" : "lg"}>
          <Text size="sm" c="forge.4" fw={500} mb="xs">
            {t.features.label}
          </Text>
          <Title order={2} size={isMobile ? "1.5rem" : undefined} c="white">
            {t.features.title}
          </Title>
        </Box>
        
        <div ref={containerRef}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={isMobile ? "md" : "lg"}>
            {features.map((feature, index) => (
              <FeatureCard 
                key={index} 
                {...feature} 
                isVisible={visibleItems.includes(index)}
                index={index}
              />
            ))}
          </SimpleGrid>
        </div>
      </Stack>
    </section>
  );
}
