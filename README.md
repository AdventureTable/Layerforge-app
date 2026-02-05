# Layerforge

[![Powered by Adventure Table](https://img.shields.io/badge/Powered%20by-Adventure%20Table-22c55e?style=for-the-badge&logo=etsy&logoColor=white)](https://adventure-table.com/)
[![License: Source Available](https://img.shields.io/badge/License-Source%20Available-blue?style=for-the-badge)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/AdventureTable/Layerforge-app/build.yml?style=for-the-badge)](https://github.com/AdventureTable/Layerforge-app/actions)

> **Create stunning filament paintings and lithophanes with your 3D printer.**  
> Brought to you by [Adventure Table](https://adventure-table.com/) — Visit our [Etsy Shop](https://adventure-table.com/) for exclusive 3D models.

A desktop application for creating 3D-printable lithophanes and relief models with filament color swap planning.

## Features

- **Image to STL Conversion**: Generate 3D relief models from 2D images
- **Filament Library**: Manage filaments with color and transmission depth (Td) properties
- **Color Planning**: Define color ranges using height-based sliders
- **Live Preview**: See real-time preview of how your print will look
- **3D View**: Visualize the mesh in 3D with Three.js
- **Export Options**: Export STL files and print swap plans

## Community & Support

**Love this tool?**  
Support development by buying us a coffee or checking out our premium models!

- ☕ [**Buy me a Coffee (Ko-fi)**](https://ko-fi.com/adventuretable)
- 🛒 [**Adventure Table Shop (Etsy)**](https://adventure-table.com/)
- 🌐 [**Official Website**](https://layerforge.app/)

## Tech Stack

- **Desktop Shell**: Tauri 2.x
- **Frontend**: React 18 + TypeScript + Mantine 7
- **3D Rendering**: Three.js with React Three Fiber
- **State Management**: Zustand
- **Core Processing**: Python (as sidecar)

## Project Structure

```
layerforge/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   ├── stores/             # Zustand stores
│   ├── types/              # TypeScript types
│   └── styles/             # CSS styles
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/                # Rust source
│   └── binaries/           # Python sidecar executables
└── python-core/            # Python processing core
    └── layerforge/         # Python package
```

## Prerequisites

- Node.js 18+
- Rust (latest stable)
- Python 3.9+
- Tauri CLI

## Setup

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Set Up Python Environment

```bash
cd python-core
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Build Python Sidecar

```bash
cd python-core
python build.py
```

This creates the executable and copies it to `src-tauri/binaries/`.

### 4. Run Development Mode (No build required)

To run the application in development mode with hot-reloading:

```bash
npm run tauri dev
```

## Building for Production

```bash
# Build Python sidecar first
cd python-core
python build.py

# Build Tauri app
cd ..
npm run tauri build
```

## Usage

1. **Open an Image**: Click "Open Image" to load a PNG/JPG image
2. **Adjust Geometry**: Configure depth range, gamma, contrast, and smoothing
3. **Define Filaments**: Add filaments with their colors and Td values
4. **Set Color Ranges**: Use sliders to define height thresholds for each filament
5. **Preview**: Check the preview to see expected results
6. **Export**: Export STL file and print plan

## Model Geometry Settings

- **Min/Max Depth**: Height range for the relief (in mm)
- **Gamma**: Brightness curve adjustment
- **Contrast**: Contrast multiplier
- **Smoothing**: Gaussian blur for smoother surfaces
- **Spike Removal**: Median filter for noise reduction
- **Invert**: Flip light/dark mapping

## Print Settings

- **Layer Height**: Print layer height (affects swap calculations)
- **Base Layer**: Solid base thickness
- **Width/Height**: Physical dimensions of the model
- **Border**: Optional frame around the model

## Export Formats

### STL File
Standard 3D mesh file compatible with all slicers.

### Print Plan (TXT)
Human-readable swap instructions:
```
Layer 0-12: White
Layer 13: Switch to Orange
Layer 21: Switch to Black
```

### Print Plan (JSON)
Machine-readable format for automation:
```json
{
  "swaps": [
    {"layer": 0, "z_mm": 0, "filament_id": "white"},
    {"layer": 13, "z_mm": 1.04, "filament_id": "orange"}
  ]
}
```

## License

Source Available License. See [LICENSE](LICENSE) file for details.

Copyright (c) 2026 LayerForge. All rights reserved.
