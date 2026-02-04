import { Box, Text, Stack, Anchor, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from '../i18n/LanguageContext';
import { ADVENTURE_TABLE_URL, INSTAGRAM_URL, ETSY_URL } from '../constants';

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function EtsyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.559 4.283c0-.347.06-.578.18-.694.121-.115.32-.173.599-.173h6.348c.855 0 1.472.263 1.851.788.38.525.569 1.388.569 2.589v.203h1.983V2.283L19.735 2H4.69L4.265 2.283v4.713h1.985v-.203c0-.885.09-1.533.268-1.943.179-.41.52-.61 1.022-.61h.019zm0 15.434c0-.887.09-1.533.268-1.943.179-.41.52-.615 1.022-.615h.668c.855 0 1.538.242 2.048.726.51.484.765 1.149.765 1.994v.203H15.314v-.203c0-.885.091-1.533.268-1.943.179-.41.52-.615 1.022-.615h.019c.279 0 .479-.058.599-.173.121-.116.181-.347.181-.694v-7.786c0-.347-.06-.578-.181-.694-.12-.115-.32-.173-.599-.173h-3.158c-.855 0-1.543.237-2.062.712-.52.475-.788 1.127-.805 1.955v.203H8.611v-.203c0-.865.255-1.518.765-1.955.51-.438 1.195-.659 2.052-.712h3.158c.855 0 1.472.264 1.851.789.379.525.569 1.387.569 2.588v7.786c0 1.201-.19 2.064-.569 2.589-.379.525-.996.788-1.851.788H8.559v1.986h10.702c.347 0 .578-.06.694-.181.115-.12.173-.319.173-.598V5.689c0-.279-.058-.478-.173-.599-.116-.12-.347-.18-.694-.18H3.389c-.347 0-.578.06-.694.18-.115.121-.173.32-.173.599v16.622c0 .279.058.478.173.598.116.121.347.181.694.181h5.17v-3.373z"/>
    </svg>
  );
}

export function Footer() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const t = useTranslation();
  
  return (
    <footer className="footer">
      <Stack gap={isMobile ? "md" : "lg"} align="center">
        <Text 
          size={isMobile ? "md" : "lg"}
          c="dimmed"
          fs="italic"
        >
          {t.footer.tagline}
        </Text>
        
        <img 
          src="/landing/assets/logo-horizontal.png" 
          alt="LayerForge" 
          style={{ 
            height: isMobile ? 40 : 50,
            filter: 'drop-shadow(0 0 10px rgba(31, 174, 122, 0.3))',
          }}
        />
        
        <Text 
          size={isMobile ? "lg" : "xl"}
          fw={600}
          className="glow-text"
          style={{ letterSpacing: '0.05em' }}
        >
          {t.footer.motto}
        </Text>
        
        {/* Social links */}
        <Group gap="md" mt="sm">
          <Anchor 
            href={INSTAGRAM_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            c="dimmed"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1FAE7A'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            <InstagramIcon />
            <Text size="sm">@adventure_table</Text>
          </Anchor>
          
          <Anchor 
            href={ETSY_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            c="dimmed"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1FAE7A'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            <EtsyIcon />
            <Text size="sm">Etsy Shop</Text>
          </Anchor>
        </Group>
        
        <Box 
          mt={isMobile ? "md" : "xl"}
          pt={isMobile ? "md" : "lg"}
          style={{ borderTop: '1px solid rgba(31, 174, 122, 0.1)' }}
          w="100%"
          maw={600}
        >
          <Group justify="center" gap={isMobile ? "lg" : "xl"}>
            <Anchor href="#manifesto" c="dimmed" size={isMobile ? "xs" : "sm"} style={{ textDecoration: 'none' }}>
              {t.footer.manifesto}
            </Anchor>
            <Anchor href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" c="dimmed" size={isMobile ? "xs" : "sm"} style={{ textDecoration: 'none' }}>
              {t.footer.support}
            </Anchor>
            <Anchor href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" c="dimmed" size={isMobile ? "xs" : "sm"} style={{ textDecoration: 'none' }}>
              {t.footer.contact}
            </Anchor>
          </Group>
        </Box>
        
        {/* Powered by Adventure Table */}
        <Group gap="xs" mt="md">
          <Text size="xs" c="dimmed">
            {t.footer.poweredBy}
          </Text>
          <Anchor 
            href={ADVENTURE_TABLE_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            size="xs"
            c="forge.4"
            fw={500}
            style={{ textDecoration: 'none' }}
          >
            {t.footer.adventureTable}
          </Anchor>
        </Group>
        
        <Text size="xs" c="dimmed" mt={isMobile ? "sm" : "md"}>
          {t.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
        </Text>
      </Stack>
    </footer>
  );
}
