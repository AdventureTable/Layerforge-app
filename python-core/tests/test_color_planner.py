"""Tests for ColorPlanner module."""

import pytest
import json
import os

from cheapforge.color_planner import ColorPlanner, Filament, ColorStop, SwapEntry


class TestColorPlanner:
    """Tests for ColorPlanner class."""

    def test_set_filaments(self, sample_filaments):
        """Test setting filaments from dict list."""
        planner = ColorPlanner()

        planner.set_filaments(sample_filaments)

        assert len(planner.filaments) == 3
        assert planner.filaments[0].id == 'white'
        assert planner.filaments[0].name == 'White'
        assert planner.filaments[0].hex_color == '#FFFFFF'
        assert planner.filaments[0].td == 0.5

    def test_set_filaments_with_alternate_keys(self):
        """Test filaments with camelCase keys."""
        planner = ColorPlanner()

        filaments = [
            {
                'id': 'test',
                'name': 'Test',
                'hexColor': '#00FF00',  # camelCase
                'td': 1.0,
                'enabled': True,
                'orderIndex': 0,  # camelCase
            }
        ]

        planner.set_filaments(filaments)

        assert planner.filaments[0].hex_color == '#00FF00'
        assert planner.filaments[0].order_index == 0

    def test_set_stops(self, sample_stops):
        """Test setting color stops."""
        planner = ColorPlanner()

        planner.set_stops(sample_stops)

        assert len(planner.stops) == 3

    def test_set_stops_sorts_by_threshold(self):
        """Test that stops are sorted by threshold."""
        planner = ColorPlanner()

        # Unsorted stops
        stops = [
            {'filament_id': 'c', 'threshold_z_mm': 2.0},
            {'filament_id': 'a', 'threshold_z_mm': 0.5},
            {'filament_id': 'b', 'threshold_z_mm': 1.0},
        ]

        planner.set_stops(stops)

        thresholds = [s.threshold_z_mm for s in planner.stops]
        assert thresholds == [0.5, 1.0, 2.0]

    def test_compute_swaps(self, sample_filaments, sample_stops):
        """Test computing swap entries."""
        planner = ColorPlanner()
        planner.set_filaments(sample_filaments)
        planner.set_stops(sample_stops)

        swaps = planner.compute_swaps(
            layer_height_mm=0.08,
            min_depth_mm=0.5,
            max_depth_mm=2.0
        )

        assert len(swaps) > 0
        assert all(isinstance(s, SwapEntry) for s in swaps)

    def test_compute_swaps_layer_calculation(self):
        """Test correct layer calculation from Z threshold."""
        planner = ColorPlanner()

        stops = [
            {'filament_id': 'a', 'threshold_z_mm': 0.8},  # layer 10
            {'filament_id': 'b', 'threshold_z_mm': 1.6},  # layer 20
        ]
        planner.set_stops(stops)

        swaps = planner.compute_swaps(
            layer_height_mm=0.08,
            min_depth_mm=0.0,
            max_depth_mm=2.0
        )

        assert swaps[0].layer == 10
        assert swaps[1].layer == 20

    def test_get_filament_by_id(self, sample_filaments):
        """Test getting filament by ID."""
        planner = ColorPlanner()
        planner.set_filaments(sample_filaments)

        filament = planner.get_filament_by_id('gray')

        assert filament is not None
        assert filament.name == 'Gray'
        assert filament.td == 1.0

    def test_get_filament_by_id_not_found(self, sample_filaments):
        """Test getting non-existent filament."""
        planner = ColorPlanner()
        planner.set_filaments(sample_filaments)

        filament = planner.get_filament_by_id('nonexistent')

        assert filament is None

    def test_get_layer_filament(self, sample_filaments, sample_stops):
        """Test getting active filament at a layer."""
        planner = ColorPlanner()
        planner.set_filaments(sample_filaments)
        planner.set_stops(sample_stops)
        planner.compute_swaps(
            layer_height_mm=0.08,
            min_depth_mm=0.5,
            max_depth_mm=2.0
        )

        # At layer 0, should be first filament
        filament = planner.get_layer_filament(0)
        assert filament is not None

    def test_export_plan_txt(self, sample_filaments, sample_stops, temp_output_dir):
        """Test exporting plan as text file."""
        planner = ColorPlanner()
        planner.set_filaments(sample_filaments)
        planner.set_stops(sample_stops)
        planner.compute_swaps(
            layer_height_mm=0.08,
            min_depth_mm=0.5,
            max_depth_mm=2.0
        )

        output_path = str(temp_output_dir / "plan.txt")
        print_settings = {
            'width_mm': 100,
            'height_mm': 80,
            'layer_height_mm': 0.08,
            'base_layer_mm': 0.16,
            'has_border': True,
            'border_width_mm': 2,
            'border_depth_mm': 2,
        }
        geometry = {
            'min_depth_mm': 0.5,
            'max_depth_mm': 2.0,
        }

        result = planner.export_plan_txt(print_settings, geometry, output_path)

        assert result == output_path
        assert os.path.exists(output_path)

        with open(output_path, 'r') as f:
            content = f.read()
            assert 'CHEAPFORGE' in content
            assert 'FILAMENTS' in content
            assert 'SWAP PLAN' in content

    def test_export_plan_json(self, sample_filaments, sample_stops, temp_output_dir):
        """Test exporting plan as JSON file."""
        planner = ColorPlanner()
        planner.set_filaments(sample_filaments)
        planner.set_stops(sample_stops)
        planner.compute_swaps(
            layer_height_mm=0.08,
            min_depth_mm=0.5,
            max_depth_mm=2.0
        )

        output_path = str(temp_output_dir / "plan.json")
        print_settings = {'width_mm': 100, 'height_mm': 80}
        geometry = {'min_depth_mm': 0.5, 'max_depth_mm': 2.0}

        result = planner.export_plan_json(print_settings, geometry, output_path)

        assert result == output_path
        assert os.path.exists(output_path)

        with open(output_path, 'r') as f:
            data = json.load(f)
            assert 'version' in data
            assert 'filaments' in data
            assert 'swaps' in data
            assert 'print_settings' in data

    def test_export_plan_json_valid_format(
        self, sample_filaments, sample_stops, temp_output_dir
    ):
        """Test that exported JSON has valid format."""
        planner = ColorPlanner()
        planner.set_filaments(sample_filaments)
        planner.set_stops(sample_stops)
        planner.compute_swaps(
            layer_height_mm=0.08,
            min_depth_mm=0.5,
            max_depth_mm=2.0
        )

        output_path = str(temp_output_dir / "plan.json")
        planner.export_plan_json({}, {}, output_path)

        with open(output_path, 'r') as f:
            data = json.load(f)

            # Check filaments structure
            for f in data['filaments']:
                assert 'id' in f
                assert 'name' in f
                assert 'hex_color' in f
                assert 'td' in f

            # Check swaps structure
            for s in data['swaps']:
                assert 'layer' in s
                assert 'z_mm' in s
                assert 'filament_id' in s
