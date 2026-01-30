import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import App from './App';
import { Landing } from './landing/Landing';
import '@mantine/core/styles.css';
import './styles/global.css';

// Check if running in Tauri (desktop app) or browser (landing page)
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

const theme = createTheme({
  primaryColor: 'forge',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
  colors: {
    // Custom primary color - emerald green scale
    forge: [
      '#E8FFF3',
      '#C2FFDD',
      '#6CFF9A', // Verde neón / glow
      '#4DE89A',
      '#1FAE7A', // Verde esmeralda energético (primary)
      '#1A9468',
      '#157A56',
      '#106044',
      '#0B4632',
      '#062C20',
    ],
    dark: [
      '#B8D4C9', // Lightest text
      '#6B8F83', // Verde grisáceo - secondary text
      '#4A6B61',
      '#2D4A40',
      '#1A3D32', // Borders
      '#153028',
      '#0F2E26', // Verde abismo oscuro - panels
      '#0C211B',
      '#0A1512',
      '#0A0D0F', // Negro profundo - background
    ],
  },
  components: {
    Input: {
      styles: {
        input: {
          backgroundColor: 'rgba(15, 46, 38, 0.4)',
          borderColor: 'rgba(26, 61, 50, 0.6)',
        },
      },
    },
    Select: {
      styles: {
        input: {
          backgroundColor: 'rgba(15, 46, 38, 0.4)',
          borderColor: 'rgba(26, 61, 50, 0.6)',
        },
      },
    },
    NumberInput: {
      styles: {
        input: {
          backgroundColor: 'rgba(15, 46, 38, 0.4)',
          borderColor: 'rgba(26, 61, 50, 0.6)',
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          backgroundColor: 'rgba(15, 46, 38, 0.4)',
          borderColor: 'rgba(26, 61, 50, 0.6)',
        },
      },
    },
    Tabs: {
      styles: {
        tab: {
          borderColor: 'transparent',
          '&[dataActive]': {
            borderColor: '#1FAE7A',
          },
        },
      },
    },
    Card: {
      styles: {
        root: {
          backgroundColor: 'rgba(15, 46, 38, 0.3)',
        },
      },
    },
    Modal: {
      styles: {
        content: {
          backgroundColor: '#0F2E26',
        },
        header: {
          backgroundColor: '#0F2E26',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      {isTauri() ? <App /> : <Landing />}
    </MantineProvider>
  </React.StrictMode>
);
