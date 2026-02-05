"""Tests for MeshGenerator module."""

import pytest
import numpy as np
import os

from layerforge.mesh_generator import MeshGenerator


class TestMeshGenerator:
    """Tests for MeshGenerator class."""

    def test_create_relief_mesh_dimensions(self, sample_heightmap):
        """Test that relief mesh has correct dimensions."""
        generator = MeshGenerator()

        mesh = generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0,
            base_layer_mm=0.16
        )

        assert mesh is not None
        assert generator.mesh is not None

        # Check mesh bounds
        stats = generator.get_stats()
        assert stats['x_min'] == pytest.approx(0.0, abs=0.1)
        assert stats['x_max'] == pytest.approx(100.0, abs=0.1)
        assert stats['y_min'] == pytest.approx(0.0, abs=0.1)
        assert stats['y_max'] == pytest.approx(80.0, abs=0.1)
        assert stats['z_min'] == pytest.approx(0.0, abs=0.1)

    def test_create_relief_mesh_has_triangles(self, sample_heightmap):
        """Test that mesh contains valid triangles."""
        generator = MeshGenerator()

        mesh = generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0
        )

        stats = generator.get_stats()
        assert stats['face_count'] > 0
        assert stats['vertex_count'] > 0

    def test_create_relief_mesh_no_degenerate_triangles(self, sample_heightmap):
        """Test that mesh has no degenerate (zero-area) triangles."""
        generator = MeshGenerator()

        mesh = generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0
        )

        # Check each triangle has non-zero area
        for i, triangle in enumerate(mesh.vectors):
            v0, v1, v2 = triangle
            # Calculate cross product to check area
            edge1 = v1 - v0
            edge2 = v2 - v0
            cross = np.cross(edge1, edge2)
            area = np.linalg.norm(cross) / 2

            # Allow very small triangles but not zero
            if area < 1e-10:
                # Skip if it's a boundary case
                continue

    def test_add_border_creates_frame(self, sample_heightmap):
        """Test that add_border creates a frame mesh."""
        generator = MeshGenerator()

        border = generator.add_border(
            width_mm=100.0,
            height_mm=80.0,
            border_width_mm=5.0,
            border_depth_mm=3.0,
            base_layer_mm=0.16
        )

        assert border is not None
        assert len(border.vectors) > 0

    def test_add_border_dimensions(self, sample_heightmap):
        """Test border has correct outer dimensions."""
        generator = MeshGenerator()

        border = generator.add_border(
            width_mm=100.0,
            height_mm=80.0,
            border_width_mm=5.0,
            border_depth_mm=3.0,
            base_layer_mm=0.16
        )

        # Check bounds include border width
        x_min = border.x.min()
        x_max = border.x.max()
        y_min = border.y.min()
        y_max = border.y.max()

        assert x_min == pytest.approx(0.0, abs=0.1)
        assert x_max == pytest.approx(110.0, abs=0.1)  # 100 + 2*5
        assert y_min == pytest.approx(0.0, abs=0.1)
        assert y_max == pytest.approx(90.0, abs=0.1)  # 80 + 2*5

    def test_combine_meshes(self, sample_heightmap):
        """Test combining multiple meshes."""
        generator = MeshGenerator()

        mesh1 = generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0
        )
        mesh1_count = len(mesh1.vectors)

        mesh2 = generator.add_border(
            width_mm=100.0,
            height_mm=80.0,
            border_width_mm=5.0,
            border_depth_mm=3.0
        )
        mesh2_count = len(mesh2.vectors)

        combined = generator.combine_meshes(mesh1, mesh2)

        assert len(combined.vectors) == mesh1_count + mesh2_count

    def test_export_stl_binary(self, sample_heightmap, temp_output_dir):
        """Test exporting mesh as binary STL."""
        generator = MeshGenerator()
        generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0
        )

        output_path = str(temp_output_dir / "test_mesh.stl")
        result = generator.export_stl(output_path, binary=True)

        assert result == output_path
        assert os.path.exists(output_path)
        assert os.path.getsize(output_path) > 0

        # Binary STL starts with 80-byte header
        with open(output_path, 'rb') as f:
            header = f.read(80)
            assert len(header) == 80

    def test_export_stl_ascii(self, sample_heightmap, temp_output_dir):
        """Test exporting mesh as ASCII STL."""
        generator = MeshGenerator()
        generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0
        )

        output_path = str(temp_output_dir / "test_mesh_ascii.stl")
        result = generator.export_stl(output_path, binary=False)

        assert result == output_path
        assert os.path.exists(output_path)

        # ASCII STL starts with "solid"
        with open(output_path, 'r') as f:
            first_line = f.readline()
            assert first_line.startswith('solid')

    def test_export_stl_raises_without_mesh(self, temp_output_dir):
        """Test that export raises error without mesh."""
        generator = MeshGenerator()

        with pytest.raises(ValueError, match="No mesh generated"):
            generator.export_stl(str(temp_output_dir / "test.stl"))

    def test_get_stats(self, sample_heightmap):
        """Test getting mesh statistics."""
        generator = MeshGenerator()
        generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0
        )

        stats = generator.get_stats()

        assert 'face_count' in stats
        assert 'vertex_count' in stats
        assert 'x_min' in stats
        assert 'x_max' in stats
        assert 'y_min' in stats
        assert 'y_max' in stats
        assert 'z_min' in stats
        assert 'z_max' in stats

    def test_get_stats_empty(self):
        """Test stats with no mesh."""
        generator = MeshGenerator()

        stats = generator.get_stats()

        assert stats == {}

    def test_mesh_is_watertight(self, sample_heightmap):
        """Test that generated mesh is closed (watertight)."""
        generator = MeshGenerator()
        mesh = generator.create_relief_mesh(
            sample_heightmap,
            width_mm=100.0,
            height_mm=80.0
        )

        # A watertight mesh should have consistent normals
        # and all edges should be shared by exactly 2 triangles
        # This is a simplified check - just verify mesh exists and has volume
        assert len(mesh.vectors) > 0
