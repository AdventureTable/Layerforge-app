import {
  Group,
  Title,
  Button,
  Text,
  Badge,
  Anchor,
} from '@mantine/core';
import { useProjectStore } from '../../stores/projectStore';

const ADVENTURE_TABLE_URL = 'https://adventure-table.com/';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

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
        
        {/* Support Button (Buy me a coffee style) */}
        <Button
          component="a"
          href="https://ko-fi.com/adventuretable"
          target="_blank"
          variant="light"
          size="xs"
          radius="xl"
          color="yellow"
          leftSection="☕"
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
          onClick={(e) => {
            e.preventDefault();
            // Use Tauri's shell open if available
            if (typeof window !== 'undefined' && '__TAURI__' in window) {
              import('@tauri-apps/plugin-shell').then(({ open }) => {
                open('https://ko-fi.com/adventuretable');
              }).catch(() => {
                window.open('https://ko-fi.com/adventuretable', '_blank');
              });
            } else {
              window.open('https://ko-fi.com/adventuretable', '_blank');
            }
          }}
        >
          Support Project
        </Button>

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
        {imagePath && (
          <Text size="xs" c="dark.1" truncate style={{ maxWidth: 200 }}>
            {imagePath.split(/[\\/]/).pop()}
          </Text>
        )}
        
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
