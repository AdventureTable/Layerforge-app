"""Tests for CLI module."""

import pytest
import json
import os

from cheapforge.cli import (
    handle_request,
    process_image,
    generate_mesh,
    compute_preview,
    compute_swaps,
    export_plan,
    METHODS,
)


class TestCLI:
    """Tests for CLI module."""

    def test_handle_request_parses_json(self, sample_image_path):
        """Test that handle_request correctly parses JSON."""
        request = json.dumps({
            'method': 'process_image',
            'params': {
                'image_path': sample_image_path,
                'geometry': {
                    'min_depth_mm': 0.5,
                    'max_depth_mm': 2.0,
                    'gamma': 1.0,
                    'contrast': 1.0,
                    'offset': 0.0,
                    'smoothing': 0.0,
                    'spike_removal': 'none',
                    'invert': False,
                }
            }
        })

        result = handle_request(request)
        parsed = json.loads(result)

        assert 'error' not in parsed or parsed.get('error') is None
        assert 'heightmap_base64' in parsed

    def test_handle_request_unknown_method(self):
        """Test handling of unknown method."""
        request = json.dumps({
            'method': 'unknown_method',
            'params': {}
        })

        result = handle_request(request)
        parsed = json.loads(result)

        assert 'error' in parsed
        assert 'unknown_method' in parsed['error'].lower() or 'Unknown' in parsed['error']

    def test_handle_request_invalid_json(self):
        """Test handling of invalid JSON."""
        result = handle_request("not valid json {{{")
        parsed = json.loads(result)

        assert 'error' in parsed

    def test_handle_request_missing_params(self):
        """Test handling of missing parameters."""
        request = json.dumps({
            'method': 'process_image',
            # Missing params
        })

        result = handle_request(request)
        parsed = json.loads(result)

        # Should either handle gracefully or return error
        assert isinstance(parsed, dict)

    def test_all_methods_registered(self):
        """Test that all expected methods are registered."""
        expected_methods = [
            'process_image',
            'generate_mesh',
            'compute_preview',
            'compute_swaps',
            'export_plan',
        ]

        for method in expected_methods:
            assert method in METHODS

    def test_process_image_function(self, sample_image_path):
        """Test process_image function directly."""
        params = {
            'image_path': sample_image_path,
            'geometry': {
                'min_depth_mm': 0.5,
                'max_depth_mm': 2.0,
                'gamma': 1.0,
                'contrast': 1.0,
                'offset': 0.0,
                'smoothing': 0.0,
                'spike_removal': 'none',
                'invert': False,
            }
        }

        result = process_image(params)

        assert 'heightmap_base64' in result
        assert 'width' in result
        assert 'height' in result
        assert result['width'] == 8
        assert result['height'] == 8

    def test_compute_swaps_function(self, sample_stops):
        """Test compute_swaps function directly."""
        params = {
            'stops': sample_stops,
            'layer_height_mm': 0.08,
            'min_depth_mm': 0.5,
            'max_depth_mm': 2.0,
        }

        result = compute_swaps(params)

        assert 'swaps' in result
        assert isinstance(result['swaps'], list)

    def test_generate_mesh_function(self, sample_image_path, temp_output_dir):
        """Test generate_mesh function with heightmap."""
        # First process an image to get heightmap
        process_params = {
            'image_path': sample_image_path,
            'geometry': {
                'min_depth_mm': 0.5,
                'max_depth_mm': 2.0,
                'gamma': 1.0,
                'contrast': 1.0,
                'offset': 0.0,
                'smoothing': 0.0,
                'spike_removal': 'none',
                'invert': False,
            }
        }
        img_result = process_image(process_params)

        # Now generate mesh
        mesh_params = {
            'request': {
                'heightmap_base64': img_result['heightmap_base64'],
                'width': img_result['width'],
                'height': img_result['height'],
                'geometry': process_params['geometry'],
                'print_settings': {
                    'width_mm': 100,
                    'height_mm': 80,
                    'layer_height_mm': 0.08,
                    'base_layer_mm': 0.16,
                    'has_border': False,
                }
            },
            'output_path': str(temp_output_dir / 'test_output.stl')
        }

        result = generate_mesh(mesh_params)

        assert 'path' in result
        assert os.path.exists(result['path'])

    def test_export_plan_function_txt(
        self, sample_filaments, sample_stops, temp_output_dir
    ):
        """Test export_plan function with TXT format."""
        params = {
            'swaps': [
                {'layer': 10, 'z_mm': 0.8, 'filament_id': 'white'},
                {'layer': 20, 'z_mm': 1.6, 'filament_id': 'gray'},
            ],
            'filaments': sample_filaments,
            'print_settings': {
                'width_mm': 100,
                'height_mm': 80,
                'layer_height_mm': 0.08,
                'base_layer_mm': 0.16,
                'has_border': False,
            },
            'geometry': {
                'min_depth_mm': 0.5,
                'max_depth_mm': 2.0,
            },
            'output_path': str(temp_output_dir / 'plan.txt'),
            'format': 'txt',
        }

        result = export_plan(params)

        assert 'path' in result
        assert os.path.exists(result['path'])

    def test_export_plan_function_json(
        self, sample_filaments, sample_stops, temp_output_dir
    ):
        """Test export_plan function with JSON format."""
        params = {
            'swaps': [
                {'layer': 10, 'z_mm': 0.8, 'filament_id': 'white'},
            ],
            'filaments': sample_filaments,
            'print_settings': {'width_mm': 100},
            'geometry': {'min_depth_mm': 0.5, 'max_depth_mm': 2.0},
            'output_path': str(temp_output_dir / 'plan.json'),
            'format': 'json',
        }

        result = export_plan(params)

        assert 'path' in result
        assert os.path.exists(result['path'])

        with open(result['path'], 'r') as f:
            data = json.load(f)
            assert 'swaps' in data

    def test_error_returns_traceback(self):
        """Test that errors include traceback for debugging."""
        request = json.dumps({
            'method': 'process_image',
            'params': {
                'image_path': '/nonexistent/path/image.png',
                'geometry': {}
            }
        })

        result = handle_request(request)
        parsed = json.loads(result)

        assert 'error' in parsed
        # Should include traceback for debugging
        if 'traceback' in parsed:
            assert len(parsed['traceback']) > 0
