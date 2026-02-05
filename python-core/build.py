#!/usr/bin/env python3
"""Build script for Layerforge Python sidecar.

This script uses PyInstaller to create a standalone executable
that can be bundled with the Tauri application.
"""

import os
import sys
import shutil
import platform
from pathlib import Path

# Determine the platform-specific executable extension
PLATFORM = platform.system().lower()
EXE_SUFFIX = '.exe' if PLATFORM == 'windows' else ''

# Paths
ROOT_DIR = Path(__file__).parent
DIST_DIR = ROOT_DIR / 'dist'
BUILD_DIR = ROOT_DIR / 'build'
TAURI_BINARIES_DIR = ROOT_DIR.parent / 'src-tauri' / 'binaries'

# Output name must match what Tauri expects
# Format: {name}-{target_triple}
def get_target_triple():
    """Get the Rust target triple for the current platform."""
    machine = platform.machine().lower()
    
    if PLATFORM == 'darwin':
        if machine == 'arm64':
            return 'aarch64-apple-darwin'
        return 'x86_64-apple-darwin'
    elif PLATFORM == 'windows':
        return 'x86_64-pc-windows-msvc'
    elif PLATFORM == 'linux':
        return 'x86_64-unknown-linux-gnu'
    
    # Default fallback
    return 'x86_64-unknown-linux-gnu'


def build():
    """Build the sidecar executable."""
    import PyInstaller.__main__
    
    # Clean previous builds
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    
    # Packages to exclude (not needed, speeds up build significantly)
    excludes = [
        # Deep learning
        'torch', 'torchvision', 'torchaudio',
        'tensorflow', 'tensorflow_gpu', 'tensorboard',
        'keras', 'onnx', 'onnxruntime',
        # Data science
        'pandas', 'sklearn', 'scikit-learn', 'scikit-image',
        # Visualization
        'matplotlib', 'seaborn', 'plotly', 'bokeh',
        # Computer vision
        'cv2', 'opencv-python', 'opencv-contrib-python',
        # Interactive
        'IPython', 'jupyter', 'notebook', 'ipykernel',
        # Testing
        'pytest', 'pytest-cov', 'coverage',
        # Docs
        'sphinx', 'docutils',
        # GUI
        'tkinter', 'PIL.ImageTk', 'Tkinter',
        'PyQt5', 'PyQt6', 'PySide2', 'PySide6',
        'wx', 'kivy',
        # Math/science
        'sympy', 'networkx', 'dask',
        # Storage
        'h5py', 'tables', 'zarr',
        # Acceleration
        'numba', 'cupy',
        # Cloud
        'boto3', 'botocore', 'awscli',
        'google', 'azure',
    ]
    
    # PyInstaller arguments
    args = [
        str(ROOT_DIR / 'layerforge' / 'cli.py'),
        '--name', 'layerforge-core',
        '--onefile',
        '--clean',
        '--noconfirm',
        '--distpath', str(DIST_DIR),
        '--workpath', str(BUILD_DIR),
        '--specpath', str(BUILD_DIR),
        # Hidden imports that might not be detected
        '--hidden-import', 'numpy',
        '--hidden-import', 'PIL',
        '--hidden-import', 'PIL.Image',
        '--hidden-import', 'stl',
        '--hidden-import', 'stl.mesh',
        '--hidden-import', 'scipy',
        '--hidden-import', 'scipy.ndimage',
    ]
    
    # Add exclusions
    for pkg in excludes:
        args.extend(['--exclude-module', pkg])
    
    print(f"Building sidecar for {PLATFORM}...")
    PyInstaller.__main__.run(args)
    
    # Copy to Tauri binaries directory with correct name
    target_triple = get_target_triple()
    source_exe = DIST_DIR / f'layerforge-core{EXE_SUFFIX}'
    target_name = f'layerforge-core-{target_triple}{EXE_SUFFIX}'
    target_path = TAURI_BINARIES_DIR / target_name
    
    # Create binaries directory if it doesn't exist
    TAURI_BINARIES_DIR.mkdir(parents=True, exist_ok=True)
    
    if source_exe.exists():
        shutil.copy2(source_exe, target_path)
        print(f"Copied to: {target_path}")
        print("Build complete!")
    else:
        print(f"Error: Expected output not found at {source_exe}")
        sys.exit(1)


def clean():
    """Clean build artifacts."""
    dirs_to_clean = [DIST_DIR, BUILD_DIR]
    for d in dirs_to_clean:
        if d.exists():
            shutil.rmtree(d)
            print(f"Removed: {d}")


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'clean':
        clean()
    else:
        build()
