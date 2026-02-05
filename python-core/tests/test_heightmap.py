"""Tests for HeightMapGenerator module."""

import pytest
import numpy as np
import base64

from layerforge.heightmap import HeightMapGenerator


class TestHeightMapGenerator:
    """Tests for HeightMapGenerator class."""

    def test_generate_maps_values_correctly(self, sample_grayscale_array):
        """Test that generate maps [0,1] to [min_depth, max_depth]."""
        generator = HeightMapGenerator()
        min_depth = 0.5
        max_depth = 2.0

        result = generator.generate(sample_grayscale_array, min_depth, max_depth)

        assert result.shape == sample_grayscale_array.shape
        assert result.min() >= min_depth - 0.001
        assert result.max() <= max_depth + 0.001
        assert generator.min_depth == min_depth
        assert generator.max_depth == max_depth

    def test_generate_linear_mapping(self):
        """Test linear mapping from luminance to depth."""
        generator = HeightMapGenerator()

        # Simple test array
        img = np.array([[0.0, 0.5], [0.5, 1.0]], dtype=np.float32)

        result = generator.generate(img, min_depth_mm=1.0, max_depth_mm=3.0)

        # 0.0 -> 1.0, 0.5 -> 2.0, 1.0 -> 3.0
        expected = np.array([[1.0, 2.0], [2.0, 3.0]], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected)

    def test_apply_detail_controls_no_change(self, sample_heightmap):
        """Test that detail_size=1.0 returns unchanged heightmap."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap
        generator.min_depth = 0.5
        generator.max_depth = 2.0

        result = generator.apply_detail_controls(sample_heightmap, detail_size=1.0)

        np.testing.assert_array_equal(result, sample_heightmap)

    def test_apply_detail_controls_blur(self, sample_heightmap):
        """Test that detail_size < 1.0 applies blur."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap
        generator.min_depth = 0.5
        generator.max_depth = 2.0

        result = generator.apply_detail_controls(sample_heightmap, detail_size=0.5)

        # Blurred result should have lower variance
        assert np.std(result) <= np.std(sample_heightmap)

    def test_apply_detail_controls_sharpen(self, sample_heightmap):
        """Test that detail_size > 1.0 applies sharpening."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap
        generator.min_depth = 0.5
        generator.max_depth = 2.0

        result = generator.apply_detail_controls(sample_heightmap, detail_size=1.5)

        # Result should still be within bounds
        assert result.min() >= 0.5 - 0.001
        assert result.max() <= 2.0 + 0.001

    def test_to_base64_and_from_base64_reversible(self, sample_heightmap):
        """Test that base64 encoding/decoding is reversible."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap

        # Encode
        b64 = generator.to_base64()
        assert isinstance(b64, str)

        # Decode
        height, width = sample_heightmap.shape
        restored = HeightMapGenerator.from_base64(b64, width, height)

        np.testing.assert_array_almost_equal(
            restored.heightmap, sample_heightmap, decimal=5
        )

    def test_to_base64_raises_without_heightmap(self):
        """Test that to_base64 raises error without heightmap."""
        generator = HeightMapGenerator()

        with pytest.raises(ValueError, match="No heightmap generated"):
            generator.to_base64()

    def test_get_dimensions(self, sample_heightmap):
        """Test getting heightmap dimensions."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap

        width, height = generator.get_dimensions()

        assert width == 8
        assert height == 8

    def test_get_dimensions_no_heightmap(self):
        """Test dimensions with no heightmap."""
        generator = HeightMapGenerator()

        width, height = generator.get_dimensions()

        assert width == 0
        assert height == 0

    def test_get_stats(self, sample_heightmap):
        """Test getting heightmap statistics."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap

        stats = generator.get_stats()

        assert 'min_mm' in stats
        assert 'max_mm' in stats
        assert 'mean_mm' in stats
        assert 'std_mm' in stats
        assert stats['min_mm'] == pytest.approx(sample_heightmap.min())
        assert stats['max_mm'] == pytest.approx(sample_heightmap.max())

    def test_get_stats_empty(self):
        """Test stats with no heightmap."""
        generator = HeightMapGenerator()

        stats = generator.get_stats()

        assert stats == {}

    def test_sample_at_corners(self, sample_heightmap):
        """Test sampling at corner positions."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap

        # Top-left corner
        assert generator.sample_at(0.0, 0.0) == pytest.approx(
            sample_heightmap[0, 0]
        )

        # Bottom-right corner
        assert generator.sample_at(1.0, 1.0) == pytest.approx(
            sample_heightmap[-1, -1]
        )

    def test_sample_at_center(self, sample_heightmap):
        """Test sampling at center with interpolation."""
        generator = HeightMapGenerator()
        generator.heightmap = sample_heightmap

        center_value = generator.sample_at(0.5, 0.5)

        # Should be interpolated value
        assert isinstance(center_value, float)
        assert sample_heightmap.min() <= center_value <= sample_heightmap.max()

    def test_sample_at_no_heightmap(self):
        """Test sampling with no heightmap returns 0."""
        generator = HeightMapGenerator()

        result = generator.sample_at(0.5, 0.5)

        assert result == 0.0
