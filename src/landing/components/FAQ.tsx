import { Box, Text, Title, Stack, Accordion } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

const faqs = [
  {
    question: '¿Es un slicer?',
    answer: 'No. LayerForge genera el modelo y el plan de cambios por altura. Luego usas tu slicer habitual.',
  },
  {
    question: '¿Cómo hago los cambios de color?',
    answer: 'Por capa (pausas / color change) o con AMS/MMU/CFS. LayerForge te da las alturas.',
  },
  {
    question: '¿Puedo vender mis impresiones?',
    answer: 'Sí. Ese es literalmente el punto.',
  },
  {
    question: '¿Va a tener suscripción?',
    answer: 'No. Si algún día la tuviera, ya no sería LayerForge.',
  },
  {
    question: '¿Por qué es tan barato?',
    answer: 'Porque no necesita ser caro.',
  },
];

export function FAQ() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <section className="landing-section">
      <Stack gap={isMobile ? "lg" : "xl"} maw={700} mx="auto">
        <Box ta="center" mb={isMobile ? "sm" : "lg"}>
          <Text size="sm" c="forge.4" fw={500} mb="xs">
            FAQ
          </Text>
          <Title order={2} size={isMobile ? "1.5rem" : undefined} c="white">
            Preguntas frecuentes
          </Title>
        </Box>
        
        <Accordion
          variant="separated"
          styles={{
            item: {
              backgroundColor: 'rgba(15, 46, 38, 0.3)',
              borderColor: 'rgba(31, 174, 122, 0.15)',
              '&[data-active]': {
                backgroundColor: 'rgba(15, 46, 38, 0.5)',
                borderColor: 'rgba(31, 174, 122, 0.3)',
              },
            },
            control: {
              '&:hover': {
                backgroundColor: 'rgba(31, 174, 122, 0.1)',
              },
            },
            label: {
              color: 'white',
              fontWeight: 500,
            },
            content: {
              color: 'var(--mantine-color-gray-4)',
            },
            chevron: {
              color: '#1FAE7A',
            },
          }}
        >
          {faqs.map((faq, index) => (
            <Accordion.Item key={index} value={`faq-${index}`}>
              <Accordion.Control>{faq.question}</Accordion.Control>
              <Accordion.Panel>{faq.answer}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </section>
  );
}
