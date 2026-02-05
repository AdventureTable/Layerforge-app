"""Image processing module for Layerforge."""

import numpy as np
from PIL import Image, ImageFilter
from typing import Tuple, Optional
import base64
import io


class ImageProcessor:
    """Handles image loading and processing for heightmap generation."""

    def __init__(self):
        self.original_image: Optional[np.ndarray] = None
        self.processed_image: Optional[np.ndarray] = None

    def load_image(self, path: str) -> np.ndarray:
        """Load an image from file path.
        
        Args:
            path: Path to the image file (PNG, JPG, WEBP)
            
        Returns:
            NumPy array of the image (RGB or RGBA)
        """
        img = Image.open(path)
        # Convert to RGB if necessary
        if img.mode == 'RGBA':
            # Composite on white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        self.original_image = np.array(img, dtype=np.float32) / 255.0
        return self.original_image

    def load_image_from_base64(self, data: str) -> np.ndarray:
        """Load an image from base64 data.
        
        Args:
            data: Base64 encoded image data (with or without data URL prefix)
            
        Returns:
            NumPy array of the image
        """
        # Remove data URL prefix if present
        if ',' in data:
            data = data.split(',')[1]
        
        img_bytes = base64.b64decode(data)
        img = Image.open(io.BytesIO(img_bytes))
        
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        self.original_image = np.array(img, dtype=np.float32) / 255.0
        return self.original_image

    def to_luminance(self, img: Optional[np.ndarray] = None) -> np.ndarray:
        """Convert RGB image to luminance (grayscale).
        
        Uses standard luminance weights: 0.299*R + 0.587*G + 0.114*B
        
        Args:
            img: Input RGB image array, or None to use stored original
            
        Returns:
            2D NumPy array of luminance values [0, 1]
        """
        if img is None:
            img = self.original_image
        if img is None:
            raise ValueError("No image loaded")
        
        # Apply luminance weights
        luminance = (
            0.299 * img[:, :, 0] + 
            0.587 * img[:, :, 1] + 
            0.114 * img[:, :, 2]
        )
        return luminance

    def apply_curve(
        self,
        img: np.ndarray,
        gamma: float = 1.0,
        contrast: float = 1.0,
        offset: float = 0.0
    ) -> np.ndarray:
        """Apply brightness curve to image.
        
        Args:
            img: Input grayscale image [0, 1]
            gamma: Gamma correction (>1 darkens midtones, <1 lightens)
            contrast: Contrast multiplier
            offset: Brightness offset
            
        Returns:
            Adjusted image array [0, 1]
        """
        # Apply gamma
        result = np.power(np.clip(img, 0, 1), gamma)
        
        # Apply contrast around midpoint
        result = (result - 0.5) * contrast + 0.5
        
        # Apply offset
        result = result + offset
        
        # Clamp to valid range
        return np.clip(result, 0, 1)

    def smooth(self, img: np.ndarray, sigma: float) -> np.ndarray:
        """Apply Gaussian smoothing using PIL.
        
        Args:
            img: Input image array
            sigma: Smoothing kernel size (standard deviation)
            
        Returns:
            Smoothed image array
        """
        if sigma <= 0:
            return img
        
        # Convert to PIL Image, apply blur, convert back
        img_uint8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
        pil_img = Image.fromarray(img_uint8, mode='L')
        
        # PIL's GaussianBlur radius is approximately sigma
        radius = max(1, int(sigma))
        pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=radius))
        
        return np.array(pil_img, dtype=np.float32) / 255.0

    def remove_spikes(self, img: np.ndarray, level: str) -> np.ndarray:
        """Remove spikes/noise using median filter with PIL.
        
        Args:
            img: Input image array
            level: 'none', 'light', 'medium', or 'strong'
            
        Returns:
            Filtered image array
        """
        kernel_sizes = {
            'none': 0,
            'light': 3,
            'medium': 5,
            'strong': 7
        }
        
        size = kernel_sizes.get(level, 0)
        if size <= 0:
            return img
        
        # Convert to PIL Image, apply median filter, convert back
        img_uint8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
        pil_img = Image.fromarray(img_uint8, mode='L')
        
        # Apply median filter (PIL's MedianFilter uses size parameter)
        pil_img = pil_img.filter(ImageFilter.MedianFilter(size=size))
        
        return np.array(pil_img, dtype=np.float32) / 255.0

    def process(
        self,
        gamma: float = 1.0,
        contrast: float = 1.0,
        offset: float = 0.0,
        smoothing: float = 0.0,
        spike_removal: str = 'none',
        invert: bool = False
    ) -> np.ndarray:
        """Run full processing pipeline.
        
        Args:
            gamma: Gamma correction value
            contrast: Contrast multiplier
            offset: Brightness offset
            smoothing: Gaussian smoothing sigma
            spike_removal: Spike removal level
            invert: Whether to invert the result
            
        Returns:
            Processed grayscale image [0, 1]
        """
        if self.original_image is None:
            raise ValueError("No image loaded")
        
        # Convert to luminance
        result = self.to_luminance()
        
        # Apply curve
        result = self.apply_curve(result, gamma, contrast, offset)
        
        # Remove spikes
        result = self.remove_spikes(result, spike_removal)
        
        # Apply smoothing
        result = self.smooth(result, smoothing)
        
        # Invert if requested
        if invert:
            result = 1.0 - result
        
        self.processed_image = result
        return result

    def get_dimensions(self) -> Tuple[int, int]:
        """Get dimensions of loaded image.
        
        Returns:
            Tuple of (width, height)
        """
        if self.original_image is None:
            return (0, 0)
        return (self.original_image.shape[1], self.original_image.shape[0])

    def export_processed_base64(self) -> str:
        """Export processed image as base64 PNG.
        
        Returns:
            Base64 encoded PNG data
        """
        if self.processed_image is None:
            raise ValueError("No processed image")
        
        # Convert to 8-bit
        img_uint8 = (self.processed_image * 255).astype(np.uint8)
        img = Image.fromarray(img_uint8, mode='L')
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
