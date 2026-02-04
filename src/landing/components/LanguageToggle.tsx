import { Button, Group } from '@mantine/core';
import { useLanguage } from '../i18n/LanguageContext';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Group gap={4}>
      <Button
        size="xs"
        variant={language === 'en' ? 'filled' : 'subtle'}
        color={language === 'en' ? 'forge' : 'gray'}
        onClick={() => setLanguage('en')}
        styles={{
          root: {
            padding: '4px 8px',
            minWidth: 32,
            height: 24,
            fontSize: '0.7rem',
            fontWeight: language === 'en' ? 600 : 400,
          },
        }}
      >
        EN
      </Button>
      <Button
        size="xs"
        variant={language === 'es' ? 'filled' : 'subtle'}
        color={language === 'es' ? 'forge' : 'gray'}
        onClick={() => setLanguage('es')}
        styles={{
          root: {
            padding: '4px 8px',
            minWidth: 32,
            height: 24,
            fontSize: '0.7rem',
            fontWeight: language === 'es' ? 600 : 400,
          },
        }}
      >
        ES
      </Button>
    </Group>
  );
}
