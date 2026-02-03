import { Box, ScrollArea } from '@mantine/core';
import { Hero } from './components/Hero';
import { TerminalDemo } from './components/TerminalDemo';
import { InterfaceShowcase } from './components/InterfaceShowcase';
import { Features } from './components/Features';
import { Philosophy } from './components/Philosophy';
import { Manifesto } from './components/Manifesto';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import './styles/landing.css';

export function Landing() {
  return (
    <ScrollArea h="100vh" type="scroll" scrollbarSize={8}>
      <Box className="landing">
        <Hero />
        <TerminalDemo />
        <InterfaceShowcase />
        <Features />
        <Philosophy />
        <Manifesto />
        <Pricing />
        <FAQ />
        <Footer />
      </Box>
    </ScrollArea>
  );
}
