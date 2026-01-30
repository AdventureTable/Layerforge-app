"""Heightmap generation module for Cheapforge."""

import numpy as np
from PIL import Image, ImageFilter
from typing import Tuple, Optional
import base64
import struct


class HeightMapGenerator:
    """Generates heightmap data from processed images."""

    def __init__(self):
        self.heightmap: Optional[np.ndarray] = None
        self.min_depth: float = 0.0
        self.max_depth: float = 1.0

    def generate(
        self,
        processed_image: np.ndarray,
        min_depth_mm: float,
        max_depth_mm: float
    ) -> np.ndarray:
        """Generate heightmap from processed grayscale image.
        
        Maps image luminance [0, 1] to depth [min_depth, max_depth].
        Darker areas = lower depth, lighter areas = higher depth.
        
        Args:
            processed_image: Grayscale image array [0, 1]
            min_depth_mm: Minimum depth in mm
            max_depth_mm: Maximum depth in mm
            
        Returns:
            Heightmap array with values in mm
        """
        self.min_depth = min_depth_mm
        self.max_depth = max_depth_mm
        
        depth_range = max_depth_mm - min_depth_mm
        
        # Map: bright (1) = max depth (more material), dark (0) = min depth (less material)
        self.heightmap = min_depth_mm + processed_image * depth_range
        
        return self.heightmap

    def _gaussian_blur(self, data: np.ndarray, sigma: float) -> np.ndarray:
        """Apply Gaussian blur using PIL.
        
        Args:
            data: Input 2D array
            sigma: Blur radius
            
        Returns:
            Blurred array
        """
        if sigma <= 0:
            return data
        
        # Normalize to 0-255 range for PIL
        min_val, max_val = np.min(data), np.max(data)
        if max_val - min_val < 1e-6:
            return data
        
        normalized = ((data - min_val) / (max_val - min_val) * 255).astype(np.uint8)
        pil_img = Image.fromarray(normalized, mode='L')
        
        radius = max(1, int(sigma))
        pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=radius))
        
        # Convert back to original range
        result = np.array(pil_img, dtype=np.float32) / 255.0
        return result * (max_val - min_val) + min_val

    def apply_detail_controls(
        self,
        heightmap: np.ndarray,
        detail_size: float = 1.0
    ) -> np.ndarray:
        """Apply detail size control to heightmap.
        
        detail_size controls frequency response:
        - < 1: more blur, less fine detail
        - = 1: no change
        - > 1: enhanced edges/detail (via unsharp mask)
        
        Args:
            heightmap: Input heightmap array
            detail_size: Detail control factor
            
        Returns:
            Modified heightmap
        """
        if detail_size == 1.0:
            return heightmap
        
        if detail_size < 1.0:
            # Apply blur proportional to how much below 1
            sigma = (1.0 - detail_size) * 3.0
            return self._gaussian_blur(heightmap, sigma)
        else:
            # Apply unsharp mask for detail enhancement
            amount = (detail_size - 1.0) * 0.5
            blurred = self._gaussian_blur(heightmap, 1.0)
            sharpened = heightmap + amount * (heightmap - blurred)
            return np.clip(sharpened, self.min_depth, self.max_depth)

    def get_dimensions(self) -> Tuple[int, int]:
        """Get dimensions of heightmap.
        
        Returns:
            Tuple of (width, height)
        """
        if self.heightmap is None:
            return (0, 0)
        return (self.heightmap.shape[1], self.heightmap.shape[0])

    def get_stats(self) -> dict:
        """Get statistics about the heightmap.
        
        Returns:
            Dictionary with min, max, mean, std values
        """
        if self.heightmap is None:
            return {}
        
        return {
            'min_mm': float(np.min(self.heightmap)),
            'max_mm': float(np.max(self.heightmap)),
            'mean_mm': float(np.mean(self.heightmap)),
            'std_mm': float(np.std(self.heightmap)),
        }

    def to_base64(self) -> str:
        """Export heightmap as base64 encoded float32 array.
        
        Returns:
            Base64 encoded binary data (float32, row-major)
        """
        if self.heightmap is None:
            raise ValueError("No heightmap generated")
        
        # Convert to float32 and flatten
        data = self.heightmap.astype(np.float32).tobytes()
        return base64.b64encode(data).decode('utf-8')

    @classmethod
    def from_base64(
        cls,
        data: str,
        width: int,
        height: int
    ) -> 'HeightMapGenerator':
        """Create HeightMapGenerator from base64 encoded data.
        
        Args:
            data: Base64 encoded float32 array
            width: Image width
            height: Image height
            
        Returns:
            HeightMapGenerator instance with loaded heightmap
        """
        instance = cls()
        
        raw_bytes = base64.b64decode(data)
        heightmap = np.frombuffer(raw_bytes, dtype=np.float32)
        instance.heightmap = heightmap.reshape((height, width))
        instance.min_depth = float(np.min(instance.heightmap))
        instance.max_depth = float(np.max(instance.heightmap))
        
        return instance

    def sample_at(self, x: float, y: float) -> float:
        """Sample heightmap value at normalized coordinates.
        
        Uses bilinear interpolation.
        
        Args:
            x: Normalized x coordinate [0, 1]
            y: Normalized y coordinate [0, 1]
            
        Returns:
            Height value in mm
        """
        if self.heightmap is None:
            return 0.0
        
        h, w = self.heightmap.shape
        
        # Convert to pixel coordinates
        px = x * (w - 1)
        py = y * (h - 1)
        
        # Bilinear interpolation
        x0 = int(px)
        y0 = int(py)
        x1 = min(x0 + 1, w - 1)
        y1 = min(y0 + 1, h - 1)
        
        fx = px - x0
        fy = py - y0
        
        v00 = self.heightmap[y0, x0]
        v10 = self.heightmap[y0, x1]
        v01 = self.heightmap[y1, x0]
        v11 = self.heightmap[y1, x1]
        
        v0 = v00 * (1 - fx) + v10 * fx
        v1 = v01 * (1 - fx) + v11 * fx
        
        return float(v0 * (1 - fy) + v1 * fy)
