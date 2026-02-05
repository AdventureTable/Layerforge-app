"""Shared fixtures for Layerforge tests."""

import pytest
import numpy as np
from PIL import Image
import io
import base64
import tempfile
import os


@pytest.fixture
def sample_rgb_array():
    """Create a simple 8x8 RGB gradient image array."""
    img = np.zeros((8, 8, 3), dtype=np.float32)
    for i in range(8):
        for j in range(8):
            # Gradient from black (top-left) to white (bottom-right)
            val = (i + j) / 14.0
            img[i, j] = [val, val, val]
    return img


@pytest.fixture
def sample_grayscale_array():
    """Create a simple 8x8 grayscale gradient array."""
    img = np.zeros((8, 8), dtype=np.float32)
    for i in range(8):
        for j in range(8):
            img[i, j] = (i + j) / 14.0
    return img


@pytest.fixture
def sample_image_path(sample_rgb_array, tmp_path):
    """Create a temporary PNG file for testing."""
    img_uint8 = (sample_rgb_array * 255).astype(np.uint8)
    img = Image.fromarray(img_uint8, mode='RGB')
    path = tmp_path / "test_image.png"
    img.save(path)
    return str(path)


@pytest.fixture
def sample_image_base64(sample_rgb_array):
    """Create a base64 encoded PNG for testing."""
    img_uint8 = (sample_rgb_array * 255).astype(np.uint8)
    img = Image.fromarray(img_uint8, mode='RGB')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{b64}"


@pytest.fixture
def sample_heightmap():
    """Create a simple 8x8 heightmap array."""
    heightmap = np.zeros((8, 8), dtype=np.float32)
    for i in range(8):
        for j in range(8):
            # Values from 0.5 to 2.0 mm
            heightmap[i, j] = 0.5 + (i + j) / 14.0 * 1.5
    return heightmap


@pytest.fixture
def sample_filaments():
    """Create sample filament data."""
    return [
        {
            'id': 'white',
            'name': 'White',
            'hex_color': '#FFFFFF',
            'td': 0.5,
            'enabled': True,
            'order_index': 0,
        },
        {
            'id': 'gray',
            'name': 'Gray',
            'hex_color': '#808080',
            'td': 1.0,
            'enabled': True,
            'order_index': 1,
        },
        {
            'id': 'black',
            'name': 'Black',
            'hex_color': '#1A1A1A',
            'td': 2.0,
            'enabled': True,
            'order_index': 2,
        },
    ]


@pytest.fixture
def sample_stops():
    """Create sample color stops."""
    return [
        {'filament_id': 'white', 'threshold_z_mm': 1.0},
        {'filament_id': 'gray', 'threshold_z_mm': 1.5},
        {'filament_id': 'black', 'threshold_z_mm': 2.0},
    ]


@pytest.fixture
def temp_output_dir(tmp_path):
    """Create a temporary directory for output files."""
    return tmp_path
