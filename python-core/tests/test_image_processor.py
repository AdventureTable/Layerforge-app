"""Tests for ImageProcessor module."""

import pytest
import numpy as np
from PIL import Image
import io
import base64

from layerforge.image_processor import ImageProcessor


class TestImageProcessor:
    """Tests for ImageProcessor class."""

    def test_load_image_from_path(self, sample_image_path):
        """Test loading image from file path."""
        processor = ImageProcessor()
        result = processor.load_image(sample_image_path)

        assert result is not None
        assert isinstance(result, np.ndarray)
        assert result.shape == (8, 8, 3)
        assert result.dtype == np.float32
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_load_image_from_base64(self, sample_image_base64):
        """Test loading image from base64 string."""
        processor = ImageProcessor()
        result = processor.load_image_from_base64(sample_image_base64)

        assert result is not None
        assert isinstance(result, np.ndarray)
        assert result.shape == (8, 8, 3)

    def test_to_luminance(self, sample_rgb_array):
        """Test RGB to luminance conversion."""
        processor = ImageProcessor()
        processor.original_image = sample_rgb_array

        luminance = processor.to_luminance()

        assert luminance.shape == (8, 8)
        assert luminance.dtype == np.float32
        # For a grayscale source, luminance should match
        # (since R=G=B, weights sum to 1)
        np.testing.assert_array_almost_equal(
            luminance, sample_rgb_array[:, :, 0], decimal=5
        )

    def test_to_luminance_raises_without_image(self):
        """Test that to_luminance raises error without loaded image."""
        processor = ImageProcessor()

        with pytest.raises(ValueError, match="No image loaded"):
            processor.to_luminance()

    def test_apply_curve_gamma(self, sample_grayscale_array):
        """Test gamma correction."""
        processor = ImageProcessor()

        # Gamma > 1 should darken midtones
        darkened = processor.apply_curve(sample_grayscale_array, gamma=2.0)
        assert np.all(darkened <= sample_grayscale_array + 0.001)

        # Gamma < 1 should lighten midtones
        lightened = processor.apply_curve(sample_grayscale_array, gamma=0.5)
        assert np.all(lightened >= sample_grayscale_array - 0.001)

    def test_apply_curve_contrast(self, sample_grayscale_array):
        """Test contrast adjustment."""
        processor = ImageProcessor()

        # High contrast should push values away from 0.5
        high_contrast = processor.apply_curve(
            sample_grayscale_array, contrast=2.0
        )
        # Result should be clamped to [0, 1]
        assert high_contrast.min() >= 0.0
        assert high_contrast.max() <= 1.0

    def test_apply_curve_offset(self, sample_grayscale_array):
        """Test brightness offset."""
        processor = ImageProcessor()

        # Positive offset should increase brightness
        brighter = processor.apply_curve(sample_grayscale_array, offset=0.2)
        assert np.mean(brighter) > np.mean(sample_grayscale_array)

        # Negative offset should decrease brightness
        darker = processor.apply_curve(sample_grayscale_array, offset=-0.2)
        assert np.mean(darker) < np.mean(sample_grayscale_array)

    def test_smooth(self, sample_grayscale_array):
        """Test Gaussian smoothing."""
        processor = ImageProcessor()

        smoothed = processor.smooth(sample_grayscale_array, sigma=1.0)

        assert smoothed.shape == sample_grayscale_array.shape
        # Smoothing should reduce variance
        assert np.std(smoothed) <= np.std(sample_grayscale_array)

    def test_smooth_zero_sigma(self, sample_grayscale_array):
        """Test that zero sigma returns unchanged image."""
        processor = ImageProcessor()

        result = processor.smooth(sample_grayscale_array, sigma=0)

        np.testing.assert_array_equal(result, sample_grayscale_array)

    def test_remove_spikes_none(self, sample_grayscale_array):
        """Test that 'none' level returns unchanged image."""
        processor = ImageProcessor()

        result = processor.remove_spikes(sample_grayscale_array, 'none')

        np.testing.assert_array_equal(result, sample_grayscale_array)

    def test_remove_spikes_levels(self, sample_grayscale_array):
        """Test different spike removal levels."""
        processor = ImageProcessor()

        for level in ['light', 'medium', 'strong']:
            result = processor.remove_spikes(sample_grayscale_array, level)
            assert result.shape == sample_grayscale_array.shape

    def test_process_full_pipeline(self, sample_image_path):
        """Test complete processing pipeline."""
        processor = ImageProcessor()
        processor.load_image(sample_image_path)

        result = processor.process(
            gamma=1.2,
            contrast=1.1,
            offset=0.0,
            smoothing=0.5,
            spike_removal='light',
            invert=False
        )

        assert result.shape == (8, 8)
        assert result.min() >= 0.0
        assert result.max() <= 1.0
        assert processor.processed_image is not None

    def test_process_invert(self, sample_image_path):
        """Test invert option in processing."""
        processor = ImageProcessor()
        processor.load_image(sample_image_path)

        normal = processor.process(invert=False)
        inverted = processor.process(invert=True)

        # Inverted should be roughly 1 - normal
        np.testing.assert_array_almost_equal(
            inverted, 1.0 - normal, decimal=5
        )

    def test_get_dimensions(self, sample_image_path):
        """Test getting image dimensions."""
        processor = ImageProcessor()
        processor.load_image(sample_image_path)

        width, height = processor.get_dimensions()

        assert width == 8
        assert height == 8

    def test_get_dimensions_no_image(self):
        """Test dimensions with no image loaded."""
        processor = ImageProcessor()

        width, height = processor.get_dimensions()

        assert width == 0
        assert height == 0

    def test_export_processed_base64(self, sample_image_path):
        """Test exporting processed image as base64."""
        processor = ImageProcessor()
        processor.load_image(sample_image_path)
        processor.process()

        b64 = processor.export_processed_base64()

        assert isinstance(b64, str)
        # Should be valid base64
        decoded = base64.b64decode(b64)
        assert len(decoded) > 0

    def test_rgba_image_handling(self, tmp_path):
        """Test handling of RGBA images with transparency."""
        # Create RGBA image with transparency
        img = Image.new('RGBA', (8, 8), (255, 0, 0, 128))
        path = tmp_path / "rgba_test.png"
        img.save(path)

        processor = ImageProcessor()
        result = processor.load_image(str(path))

        # Should be converted to RGB
        assert result.shape == (8, 8, 3)
