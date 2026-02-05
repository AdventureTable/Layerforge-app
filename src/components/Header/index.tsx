import {
  Group,
  Title,
  Button,
  Text,
  Badge,
  Anchor,
  Menu,
  ActionIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useProjectStore } from '../../stores/projectStore';
import { AboutModal } from '../AboutModal';

const ADVENTURE_TABLE_URL = 'https://adventure-table.com/';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Help Icon
function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
}

// Convert Uint8Array to base64 without stack overflow
const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  const chunks: string[] = [];
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  
  return btoa(chunks.join(''));
};

export function Header() {
  const [aboutOpened, { open: openAbout, close: closeAbout }] = useDisclosure(false);
  const {
    imagePath,
    isDirty,
    isProcessing,
    setImage,
    resetProject,
    loadProject,
    getProjectJSON,
    setPrintSettings,
    setImageAspectRatio,
    printSettings,
  } = useProjectStore();

  // Helper to update dimensions based on image aspect ratio
  const updateDimensionsFromImage = (imageDataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setImageAspectRatio(aspectRatio);
      
      // Calculate new dimensions keeping max dimension and fitting the other
      const maxDimension = Math.max(printSettings.widthMm, printSettings.heightMm);
      
      if (aspectRatio >= 1) {
        // Landscape or square
        setPrintSettings({
          widthMm: maxDimension,
          heightMm: Math.round(maxDimension / aspectRatio),
        });
      } else {
        // Portrait
        setPrintSettings({
          widthMm: Math.round(maxDimension * aspectRatio),
          heightMm: maxDimension,
        });
      }
    };
    img.src = imageDataUrl;
  };

  const handleOpenImage = async () => {
    if (!isTauri()) {
      // Fallback for browser: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            setImage(file.name, dataUrl);
            updateDimensionsFromImage(dataUrl);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');
      
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp'],
          },
        ],
      });

      if (selected) {
        const path = typeof selected === 'string' ? selected : (selected as { path: string }).path;
        const contents = await readFile(path);
        const base64 = uint8ArrayToBase64(new Uint8Array(contents));
        const ext = path.split('.').pop()?.toLowerCase() || 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        const dataUrl = `data:${mime};base64,${base64}`;
        setImage(path, dataUrl);
        updateDimensionsFromImage(dataUrl);
      }
    } catch (error) {
      console.error('Failed to open image:', error);
    }
  };

  const handleSaveProject = async () => {
    const json = getProjectJSON();
    
    if (!isTauri()) {
      // Fallback for browser: download file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project.cfproj';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      
      const path = await save({
        filters: [
          {
            name: 'LayerForge Project',
            extensions: ['cfproj'],
          },
        ],
        defaultPath: 'project.cfproj',
      });

      if (path) {
        await writeTextFile(path, json);
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleOpenProject = async () => {
    if (!isTauri()) {
      // Fallback for browser: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.cfproj,application/json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          const project = JSON.parse(text);
          loadProject(project);
        }
      };
      input.click();
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');
      
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'LayerForge Project',
            extensions: ['cfproj'],
          },
        ],
      });

      if (selected) {
        const path = typeof selected === 'string' ? selected : (selected as { path: string }).path;
        const contents = await readFile(path);
        const json = new TextDecoder().decode(contents);
        const project = JSON.parse(json);
        loadProject(project);
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  return (
    <Group
      h="100%"
      px="md"
      justify="space-between"
      style={{ 
        borderBottom: '1px solid rgba(31, 174, 122, 0.2)',
        backgroundColor: 'rgba(10, 13, 15, 0.6)',
      }}
    >
      <Group gap="md">
        <Group gap="xs" align="center">
          <img 
            src="/landing/assets/icon.png" 
            alt="LayerForge" 
            style={{ height: 28, width: 28 }}
          />
          <Title 
            order={4} 
            style={{ 
              color: '#1FAE7A',
              textShadow: '0 0 20px rgba(31, 174, 122, 0.5)',
              letterSpacing: '0.5px',
            }}
          >
            LayerForge
          </Title>
        </Group>
        
        {/* Support Button (Buy me a coffee style) - REMOVED to simplify UI and keep single support modal */ }


        {isDirty && (
          <Badge 
            size="xs" 
            variant="dot" 
            color="forge.2"
            style={{ textTransform: 'uppercase', fontSize: 9 }}
          >
            Unsaved
          </Badge>
        )}
        {isProcessing && (
          <Badge 
            size="xs" 
            variant="filled" 
            color="forge"
            style={{ 
              boxShadow: '0 0 8px rgba(31, 174, 122, 0.4)',
              textTransform: 'uppercase',
              fontSize: 9,
            }}
          >
            Processing...
          </Badge>
        )}
      </Group>

      <Group gap="sm">
        <Button 
          size="xs" 
          variant="subtle" 
          onClick={handleOpenImage}
          c="forge.2"
        >
          Open Image
        </Button>
        <Button 
          size="xs" 
          variant="subtle" 
          onClick={handleOpenProject}
          c="forge.2"
        >
          Open Project
        </Button>
        <Button 
          size="xs" 
          variant="subtle" 
          onClick={handleSaveProject}
          c="forge.2"
        >
          Save Project
        </Button>
        <Button 
          size="xs" 
          variant="subtle" 
          color="red" 
          onClick={resetProject}
          style={{ opacity: 0.8 }}
        >
          New
        </Button>
      </Group>

      <Group gap="md">
        <AboutModal opened={aboutOpened} onClose={closeAbout} />
        {imagePath && (
          <Text size="xs" c="dark.1" truncate style={{ maxWidth: 200 }}>
            {imagePath.split(/[\\/]/).pop()}
          </Text>
        )}
        
        {/* Help Menu - Now main Support entry point */}
        <Button 
          variant="light" 
          color="yellow" 
          size="xs"
          leftSection={<HeartIcon />}
          onClick={openAbout}
          styles={{
            root: {
              backgroundColor: 'rgba(255, 200, 0, 0.1)',
              color: '#FFD43B',
              border: '1px solid rgba(255, 200, 0, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 200, 0, 0.2)',
              }
            }
          }}
        >
          Support / About
        </Button>

        {/* Powered by Adventure Table */}
        <Group gap={4} style={{ opacity: 0.7 }}>
          <Text size="xs" c="dimmed">
            Powered by
          </Text>
          <Anchor
            href={ADVENTURE_TABLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="forge.4"
            fw={500}
            style={{ textDecoration: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              // Use Tauri's shell open if available
              if (typeof window !== 'undefined' && '__TAURI__' in window) {
                import('@tauri-apps/plugin-shell').then(({ open }) => {
                  open(ADVENTURE_TABLE_URL);
                }).catch(() => {
                  window.open(ADVENTURE_TABLE_URL, '_blank');
                });
              } else {
                window.open(ADVENTURE_TABLE_URL, '_blank');
              }
            }}
          >
            Adventure Table
          </Anchor>
        </Group>
      </Group>
    </Group>
  );
}
