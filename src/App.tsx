import { AppShell } from '@mantine/core';
import { FilamentPanel } from './components/FilamentPanel';
import { PreviewArea } from './components/PreviewArea';
import { ColorCore } from './components/ColorCore';
import { BottomPanel } from './components/BottomPanel';
import { Header } from './components/Header';
import { ResolutionChangeModal } from './components/ResolutionChangeModal';
import { EasyModeWizard } from './components/EasyModeWizard';
import { useHeightmapProcessing } from './hooks/useHeightmapProcessing';

function App() {
  useHeightmapProcessing();

  return (
    <AppShell
      header={{ height: 50 }}
      navbar={{ width: 260, breakpoint: 'sm' }}
      aside={{ width: 80, breakpoint: 'sm' }}
      footer={{ height: 320 }}
      padding={0}
      styles={{
        main: {
          backgroundColor: 'transparent',
        },
        header: {
          backgroundColor: 'rgba(10, 13, 15, 0.8)',
          borderColor: 'rgba(31, 174, 122, 0.2)',
        },
        navbar: {
          backgroundColor: 'rgba(15, 46, 38, 0.3)',
          borderColor: 'rgba(31, 174, 122, 0.15)',
        },
        aside: {
          backgroundColor: 'rgba(15, 46, 38, 0.3)',
          borderColor: 'rgba(31, 174, 122, 0.15)',
        },
        footer: {
          backgroundColor: 'rgba(10, 13, 15, 0.7)',
          borderColor: 'rgba(31, 174, 122, 0.2)',
        },
      }}
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>

      <AppShell.Navbar>
        <FilamentPanel />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          display: 'flex',
          height: 'calc(100vh - 50px - 320px)',
          overflow: 'hidden',
        }}
      >
        <PreviewArea />
      </AppShell.Main>

      <AppShell.Aside>
        <ColorCore />
      </AppShell.Aside>

      <AppShell.Footer>
        <BottomPanel />
      </AppShell.Footer>

      {/* Modals */}
      <ResolutionChangeModal />
      <EasyModeWizard />
    </AppShell>
  );
}

export default App;
