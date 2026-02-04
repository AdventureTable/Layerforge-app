import { Box, Text, Title, Stack, Accordion } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from '../i18n/LanguageContext';

export function FAQ() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const t = useTranslation();
  
  return (
    <section className="landing-section">
      <Stack gap={isMobile ? "lg" : "xl"} maw={700} mx="auto">
        <Box ta="center" mb={isMobile ? "sm" : "lg"}>
          <Text size="sm" c="forge.4" fw={500} mb="xs">
            {t.faq.label}
          </Text>
          <Title order={2} size={isMobile ? "1.5rem" : undefined} c="white">
            {t.faq.title}
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
          {t.faq.items.map((faq, index) => (
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
