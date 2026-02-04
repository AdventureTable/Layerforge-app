import { Box, ScrollArea } from '@mantine/core';
import { Hero } from './components/Hero';
import { TerminalDemo } from './components/TerminalDemo';
import { InterfaceShowcase } from './components/InterfaceShowcase';
import { Features } from './components/Features';
import { Philosophy } from './components/Philosophy';
import { Manifesto } from './components/Manifesto';
import { Download } from './components/Download';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { LanguageToggle } from './components/LanguageToggle';
import { LanguageProvider } from './i18n/LanguageContext';
import './styles/landing.css';

function LandingContent() {
  return (
    <ScrollArea h="100vh" type="scroll" scrollbarSize={8}>
      {/* Fixed language toggle */}
      <Box
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <LanguageToggle />
      </Box>
      
      <Box className="landing">
        <Hero />
        <TerminalDemo />
        <InterfaceShowcase />
        <Features />
        <Philosophy />
        <Manifesto />
        <Download />
        <FAQ />
        <Footer />
      </Box>
    </ScrollArea>
  );
}

export function Landing() {
  return (
    <LanguageProvider>
      <LandingContent />
    </LanguageProvider>
  );
}
