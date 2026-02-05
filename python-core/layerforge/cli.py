#!/usr/bin/env python3
"""CLI entry point for Layerforge Python sidecar.

This module provides a JSON-RPC like interface for communication
with the Tauri frontend via stdin/stdout.
"""

import sys
import json
import traceback
from typing import Any, Dict

from layerforge.image_processor import ImageProcessor
from layerforge.heightmap import HeightMapGenerator
from layerforge.mesh_generator import MeshGenerator
from layerforge.color_planner import ColorPlanner


def process_image(params: Dict[str, Any]) -> Dict[str, Any]:
    """Process an image and return heightmap data.
    
    Args:
        params: {
            image_path: str,
            geometry: {
                min_depth_mm: float,
                max_depth_mm: float,
                gamma: float,
                contrast: float,
                offset: float,
                smoothing: float,
                spike_removal: str,
                invert: bool
            }
        }
        
    Returns:
        {
            heightmap_base64: str,
            width: int,
            height: int
        }
    """
    image_path = params.get('image_path')
    geometry = params.get('geometry', {})
    
    # Process image
    processor = ImageProcessor()
    processor.load_image(image_path)
    processed = processor.process(
        gamma=geometry.get('gamma', 1.0),
        contrast=geometry.get('contrast', 1.0),
        offset=geometry.get('offset', 0.0),
        smoothing=geometry.get('smoothing', 0.0),
        spike_removal=geometry.get('spike_removal', 'none'),
        invert=geometry.get('invert', False)
    )
    
    # Generate heightmap
    heightmap_gen = HeightMapGenerator()
    heightmap = heightmap_gen.generate(
        processed,
        min_depth_mm=geometry.get('min_depth_mm', 0.48),
        max_depth_mm=geometry.get('max_depth_mm', 2.24)
    )
    
    width, height = heightmap_gen.get_dimensions()
    
    return {
        'heightmap_base64': heightmap_gen.to_base64(),
        'width': width,
        'height': height
    }


def generate_mesh(params: Dict[str, Any]) -> Dict[str, Any]:
    """Generate STL mesh from heightmap.
    
    Args:
        params: {
            request: {
                heightmap_base64: str,
                width: int,
                height: int,
                geometry: {...},
                print_settings: {...}
            },
            output_path: str
        }
        
    Returns:
        {path: str}
    """
    import numpy as np
    from scipy import ndimage
    
    request = params.get('request', {})
    output_path = params.get('output_path')
    
    heightmap_b64 = request.get('heightmap_base64')
    width = request.get('width')
    height = request.get('height')
    print_settings = request.get('print_settings', {})
    
    # Get target resolution (default to image resolution if not specified)
    mesh_resolution = print_settings.get('mesh_resolution')
    
    # Load heightmap
    heightmap_gen = HeightMapGenerator.from_base64(heightmap_b64, width, height)
    heightmap = heightmap_gen.heightmap
    
    # Downsample heightmap if resolution is specified and less than original
    if mesh_resolution and mesh_resolution > 0:
        original_h, original_w = heightmap.shape
        original_max = max(original_w, original_h)
        
        if mesh_resolution < original_max:
            # Calculate scale factor
            scale = mesh_resolution / original_max
            new_w = max(1, int(original_w * scale))
            new_h = max(1, int(original_h * scale))
            
            # Downsample using zoom (bilinear interpolation)
            zoom_factors = (new_h / original_h, new_w / original_w)
            heightmap = ndimage.zoom(heightmap, zoom_factors, order=1)
    
    # Check if border is enabled
    has_border = print_settings.get('has_border', False)
    border_width_mm = print_settings.get('border_width_mm', 2) if has_border else 0
    
    # Generate mesh with offset if border is enabled
    mesh_gen = MeshGenerator()
    mesh = mesh_gen.create_relief_mesh(
        heightmap,
        width_mm=print_settings.get('width_mm', 100),
        height_mm=print_settings.get('height_mm', 100),
        base_layer_mm=print_settings.get('base_layer_mm', 0.16),
        offset_x=border_width_mm,
        offset_y=border_width_mm
    )
    
    # Add border if enabled
    if has_border:
        border = mesh_gen.add_border(
            width_mm=print_settings.get('width_mm', 100),
            height_mm=print_settings.get('height_mm', 100),
            border_width_mm=border_width_mm,
            border_depth_mm=print_settings.get('border_depth_mm', 2),
            base_layer_mm=print_settings.get('base_layer_mm', 0.16)
        )
        mesh_gen.mesh = mesh_gen.combine_meshes(mesh, border)
    
    # Export
    saved_path = mesh_gen.export_stl(output_path, binary=True)
    
    return {'path': saved_path}


def compute_preview(params: Dict[str, Any]) -> Dict[str, Any]:
    """Compute preview image with filament colors.
    
    Args:
        params: {
            heightmap_base64: str,
            width: int,
            height: int,
            filaments: [...],
            stops: [...],
            geometry: {...}
        }
        
    Returns:
        {preview_base64: str}
    """
    import numpy as np
    from PIL import Image
    import base64
    import io
    
    heightmap_b64 = params.get('heightmap_base64')
    width = params.get('width')
    height = params.get('height')
    filaments = params.get('filaments', [])
    stops = params.get('stops', [])
    geometry = params.get('geometry', {})
    
    # Load heightmap
    heightmap_gen = HeightMapGenerator.from_base64(heightmap_b64, width, height)
    heightmap = heightmap_gen.heightmap
    
    min_depth = geometry.get('min_depth_mm', 0.48)
    max_depth = geometry.get('max_depth_mm', 2.24)
    depth_range = max_depth - min_depth
    
    # Sort stops by threshold
    sorted_stops = sorted(stops, key=lambda s: s.get('threshold_z_mm', s.get('thresholdZMm', 0)))
    
    # Create filament lookup
    filament_map = {}
    for f in filaments:
        fid = f.get('id', f.get('filament_id', ''))
        filament_map[fid] = f
    
    # Create output image
    preview = np.zeros((height, width, 3), dtype=np.uint8)
    
    for y in range(height):
        for x in range(width):
            h = heightmap[y, x]
            
            # Find applicable filament
            filament = None
            for stop in sorted_stops:
                threshold = stop.get('threshold_z_mm', stop.get('thresholdZMm', 0))
                if h <= threshold:
                    fid = stop.get('filament_id', stop.get('filamentId', ''))
                    filament = filament_map.get(fid)
                    break
            
            if filament is None and filaments:
                filament = filaments[-1]
            
            if filament:
                # Parse hex color
                hex_color = filament.get('hex_color', filament.get('hexColor', '#FFFFFF'))
                if hex_color.startswith('#'):
                    hex_color = hex_color[1:]
                r = int(hex_color[0:2], 16)
                g = int(hex_color[2:4], 16)
                b = int(hex_color[4:6], 16)
                
                # Apply transmission model
                td = filament.get('td', 1.0)
                t = (h - min_depth) / depth_range if depth_range > 0 else 0
                t = max(0, min(1, t))
                atten = np.exp(-td * t)
                
                # Blend with white (backlit simulation)
                preview[y, x, 0] = int(255 * atten + r * (1 - atten))
                preview[y, x, 1] = int(255 * atten + g * (1 - atten))
                preview[y, x, 2] = int(255 * atten + b * (1 - atten))
            else:
                # Default gray
                gray = int(128 + 127 * (h - min_depth) / depth_range) if depth_range > 0 else 128
                preview[y, x] = [gray, gray, gray]
    
    # Convert to base64 PNG
    img = Image.fromarray(preview, mode='RGB')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    preview_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return {'preview_base64': f'data:image/png;base64,{preview_b64}'}


def compute_swaps(params: Dict[str, Any]) -> Dict[str, Any]:
    """Compute filament swap plan.
    
    Args:
        params: {
            stops: [...],
            layer_height_mm: float,
            min_depth_mm: float,
            max_depth_mm: float
        }
        
    Returns:
        {swaps: [...]}
    """
    stops = params.get('stops', [])
    layer_height = params.get('layer_height_mm', 0.08)
    min_depth = params.get('min_depth_mm', 0.48)
    max_depth = params.get('max_depth_mm', 2.24)
    
    planner = ColorPlanner()
    planner.set_stops(stops)
    swaps = planner.compute_swaps(layer_height, min_depth, max_depth)
    
    return {
        'swaps': [
            {
                'layer': s.layer,
                'z_mm': s.z_mm,
                'filament_id': s.filament_id
            }
            for s in swaps
        ]
    }


def export_plan(params: Dict[str, Any]) -> Dict[str, Any]:
    """Export print plan to file.
    
    Args:
        params: {
            swaps: [...],
            filaments: [...],
            print_settings: {...},
            geometry: {...},
            output_path: str,
            format: 'txt' | 'json'
        }
        
    Returns:
        {path: str}
    """
    swaps = params.get('swaps', [])
    filaments = params.get('filaments', [])
    print_settings = params.get('print_settings', {})
    geometry = params.get('geometry', {})
    output_path = params.get('output_path')
    fmt = params.get('format', 'txt')
    
    planner = ColorPlanner()
    planner.set_filaments(filaments)
    planner.set_stops([
        {'filament_id': s.get('filament_id'), 'threshold_z_mm': s.get('z_mm', 0)}
        for s in swaps
    ])
    planner.swaps = [
        ColorPlanner.SwapEntry(
            layer=s.get('layer', 0),
            z_mm=s.get('z_mm', 0),
            filament_id=s.get('filament_id', '')
        ) if hasattr(ColorPlanner, 'SwapEntry') else type('SwapEntry', (), s)()
        for s in swaps
    ]
    
    # Recreate swaps as proper dataclass instances
    from layerforge.color_planner import SwapEntry
    planner.swaps = [
        SwapEntry(
            layer=s.get('layer', 0),
            z_mm=s.get('z_mm', 0),
            filament_id=s.get('filament_id', '')
        )
        for s in swaps
    ]
    
    if fmt == 'json':
        path = planner.export_plan_json(print_settings, geometry, output_path)
    else:
        path = planner.export_plan_txt(print_settings, geometry, output_path)
    
    return {'path': path}


# Method dispatcher
METHODS = {
    'process_image': process_image,
    'generate_mesh': generate_mesh,
    'compute_preview': compute_preview,
    'compute_swaps': compute_swaps,
    'export_plan': export_plan,
}


def handle_request(request_json: str) -> str:
    """Handle a JSON-RPC style request.
    
    Args:
        request_json: JSON string with {method, params}
        
    Returns:
        JSON string with result or error
    """
    try:
        request = json.loads(request_json)
        method = request.get('method')
        params = request.get('params', {})
        
        if method not in METHODS:
            return json.dumps({
                'error': f'Unknown method: {method}',
                'available_methods': list(METHODS.keys())
            })
        
        result = METHODS[method](params)
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({
            'error': str(e),
            'traceback': traceback.format_exc()
        })


def main():
    """Main entry point for CLI."""
    if len(sys.argv) > 1:
        # Request passed as command line argument
        request_json = sys.argv[1]
        result = handle_request(request_json)
        print(result)
    else:
        # Read single request from stdin (for sidecar mode)
        # Read all input until EOF or first complete JSON
        request_json = sys.stdin.readline().strip()
        if request_json:
            result = handle_request(request_json)
            print(result)


if __name__ == '__main__':
    main()
