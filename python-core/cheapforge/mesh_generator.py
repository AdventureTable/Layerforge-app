"""Mesh generation module for Cheapforge."""

import numpy as np
from stl import mesh as stl_mesh
from stl import Mode as StlMode
from typing import Tuple, Optional, List
import io


class MeshGenerator:
    """Generates 3D mesh from heightmap data."""

    def __init__(self):
        self.mesh: Optional[stl_mesh.Mesh] = None

    def create_relief_mesh(
        self,
        heightmap: np.ndarray,
        width_mm: float,
        height_mm: float,
        base_layer_mm: float = 0.16,
        offset_x: float = 0.0,
        offset_y: float = 0.0
    ) -> stl_mesh.Mesh:
        """Create a relief mesh from heightmap.
        
        Creates a solid mesh with:
        - Top surface following the heightmap
        - Bottom surface at z=0
        - Side walls connecting top and bottom
        
        Args:
            heightmap: 2D array of height values in mm
            width_mm: Physical width of the model
            height_mm: Physical height (depth in Y) of the model
            base_layer_mm: Thickness of solid base layer
            offset_x: X offset for positioning (for border support)
            offset_y: Y offset for positioning (for border support)
            
        Returns:
            numpy-stl Mesh object
        """
        # Flip heightmap horizontally to match preview orientation
        # This corrects the mirror effect between preview and exported STL
        heightmap = np.fliplr(heightmap)
        
        h, w = heightmap.shape
        
        # Create coordinate grids with offset
        x = np.linspace(offset_x, offset_x + width_mm, w)
        y = np.linspace(offset_y, offset_y + height_mm, h)
        X, Y = np.meshgrid(x, y)
        
        # Top surface Z values (heightmap + base)
        Z_top = heightmap + base_layer_mm
        
        # Bottom surface at z=0
        Z_bottom = np.zeros_like(Z_top)
        
        # Generate triangles for top surface
        top_triangles = self._generate_surface_triangles(X, Y, Z_top, flip_normals=False)
        
        # Generate triangles for bottom surface (flip normals)
        bottom_triangles = self._generate_surface_triangles(X, Y, Z_bottom, flip_normals=True)
        
        # Generate side walls
        side_triangles = self._generate_side_walls(X, Y, Z_top, Z_bottom)
        
        # Combine all triangles
        all_triangles = top_triangles + bottom_triangles + side_triangles
        
        # Create mesh
        self.mesh = stl_mesh.Mesh(np.zeros(len(all_triangles), dtype=stl_mesh.Mesh.dtype))
        for i, tri in enumerate(all_triangles):
            self.mesh.vectors[i] = tri
        
        return self.mesh

    def _generate_surface_triangles(
        self,
        X: np.ndarray,
        Y: np.ndarray,
        Z: np.ndarray,
        flip_normals: bool = False
    ) -> List[np.ndarray]:
        """Generate triangles for a surface.
        
        Args:
            X, Y, Z: Coordinate grids
            flip_normals: If True, reverse vertex order for opposite normals
            
        Returns:
            List of triangle vertex arrays (3x3)
        """
        triangles = []
        h, w = Z.shape
        
        for i in range(h - 1):
            for j in range(w - 1):
                # Four corners of the quad
                v00 = np.array([X[i, j], Y[i, j], Z[i, j]])
                v10 = np.array([X[i, j+1], Y[i, j+1], Z[i, j+1]])
                v01 = np.array([X[i+1, j], Y[i+1, j], Z[i+1, j]])
                v11 = np.array([X[i+1, j+1], Y[i+1, j+1], Z[i+1, j+1]])
                
                # Two triangles per quad
                if flip_normals:
                    triangles.append(np.array([v00, v01, v10]))
                    triangles.append(np.array([v10, v01, v11]))
                else:
                    triangles.append(np.array([v00, v10, v01]))
                    triangles.append(np.array([v10, v11, v01]))
        
        return triangles

    def _generate_side_walls(
        self,
        X: np.ndarray,
        Y: np.ndarray,
        Z_top: np.ndarray,
        Z_bottom: np.ndarray
    ) -> List[np.ndarray]:
        """Generate triangles for side walls.
        
        Args:
            X, Y: Coordinate grids
            Z_top: Top surface heights
            Z_bottom: Bottom surface heights
            
        Returns:
            List of triangle vertex arrays
        """
        triangles = []
        h, w = Z_top.shape
        
        # Front edge (y = 0)
        for j in range(w - 1):
            v0_top = np.array([X[0, j], Y[0, j], Z_top[0, j]])
            v1_top = np.array([X[0, j+1], Y[0, j+1], Z_top[0, j+1]])
            v0_bot = np.array([X[0, j], Y[0, j], Z_bottom[0, j]])
            v1_bot = np.array([X[0, j+1], Y[0, j+1], Z_bottom[0, j+1]])
            
            triangles.append(np.array([v0_bot, v1_bot, v0_top]))
            triangles.append(np.array([v1_bot, v1_top, v0_top]))
        
        # Back edge (y = max)
        for j in range(w - 1):
            v0_top = np.array([X[h-1, j], Y[h-1, j], Z_top[h-1, j]])
            v1_top = np.array([X[h-1, j+1], Y[h-1, j+1], Z_top[h-1, j+1]])
            v0_bot = np.array([X[h-1, j], Y[h-1, j], Z_bottom[h-1, j]])
            v1_bot = np.array([X[h-1, j+1], Y[h-1, j+1], Z_bottom[h-1, j+1]])
            
            triangles.append(np.array([v0_bot, v0_top, v1_bot]))
            triangles.append(np.array([v1_bot, v0_top, v1_top]))
        
        # Left edge (x = 0)
        for i in range(h - 1):
            v0_top = np.array([X[i, 0], Y[i, 0], Z_top[i, 0]])
            v1_top = np.array([X[i+1, 0], Y[i+1, 0], Z_top[i+1, 0]])
            v0_bot = np.array([X[i, 0], Y[i, 0], Z_bottom[i, 0]])
            v1_bot = np.array([X[i+1, 0], Y[i+1, 0], Z_bottom[i+1, 0]])
            
            triangles.append(np.array([v0_bot, v0_top, v1_bot]))
            triangles.append(np.array([v1_bot, v0_top, v1_top]))
        
        # Right edge (x = max)
        for i in range(h - 1):
            v0_top = np.array([X[i, w-1], Y[i, w-1], Z_top[i, w-1]])
            v1_top = np.array([X[i+1, w-1], Y[i+1, w-1], Z_top[i+1, w-1]])
            v0_bot = np.array([X[i, w-1], Y[i, w-1], Z_bottom[i, w-1]])
            v1_bot = np.array([X[i+1, w-1], Y[i+1, w-1], Z_bottom[i+1, w-1]])
            
            triangles.append(np.array([v0_bot, v1_bot, v0_top]))
            triangles.append(np.array([v1_bot, v1_top, v0_top]))
        
        return triangles

    def add_border(
        self,
        width_mm: float,
        height_mm: float,
        border_width_mm: float,
        border_depth_mm: float,
        base_layer_mm: float = 0.16
    ) -> stl_mesh.Mesh:
        """Add a border/frame around the relief.
        
        Creates four rectangular bars around the perimeter.
        
        Args:
            width_mm: Inner width of the model
            height_mm: Inner height of the model
            border_width_mm: Width of the border frame
            border_depth_mm: Height/depth of the border
            base_layer_mm: Base layer thickness
            
        Returns:
            Mesh of the border (to be combined with relief)
        """
        border_triangles = []
        
        # Border is a rectangular frame
        # Total outer dimensions
        outer_w = width_mm + 2 * border_width_mm
        outer_h = height_mm + 2 * border_width_mm
        z_top = base_layer_mm + border_depth_mm
        z_bot = 0
        
        # Create four border segments as boxes
        segments = [
            # Front (bottom edge in Y)
            (0, 0, outer_w, border_width_mm),
            # Back (top edge in Y)  
            (0, height_mm + border_width_mm, outer_w, border_width_mm),
            # Left
            (0, border_width_mm, border_width_mm, height_mm),
            # Right
            (width_mm + border_width_mm, border_width_mm, border_width_mm, height_mm),
        ]
        
        for x0, y0, w, h in segments:
            box_tris = self._create_box(x0, y0, w, h, z_bot, z_top)
            border_triangles.extend(box_tris)
        
        border_mesh = stl_mesh.Mesh(np.zeros(len(border_triangles), dtype=stl_mesh.Mesh.dtype))
        for i, tri in enumerate(border_triangles):
            border_mesh.vectors[i] = tri
        
        return border_mesh

    def _create_box(
        self,
        x: float,
        y: float,
        width: float,
        depth: float,
        z_min: float,
        z_max: float
    ) -> List[np.ndarray]:
        """Create triangles for a rectangular box.
        
        Args:
            x, y: Corner position
            width: Width in X
            depth: Depth in Y
            z_min, z_max: Height range
            
        Returns:
            List of triangles
        """
        triangles = []
        
        # 8 corners of the box
        corners = np.array([
            [x, y, z_min],           # 0: front-left-bottom
            [x + width, y, z_min],   # 1: front-right-bottom
            [x + width, y + depth, z_min],  # 2: back-right-bottom
            [x, y + depth, z_min],   # 3: back-left-bottom
            [x, y, z_max],           # 4: front-left-top
            [x + width, y, z_max],   # 5: front-right-top
            [x + width, y + depth, z_max],  # 6: back-right-top
            [x, y + depth, z_max],   # 7: back-left-top
        ])
        
        # 12 triangles (2 per face)
        faces = [
            # Bottom (0, 1, 2, 3) - normals down
            (0, 2, 1), (0, 3, 2),
            # Top (4, 5, 6, 7) - normals up
            (4, 5, 6), (4, 6, 7),
            # Front (0, 1, 5, 4) - normals -Y
            (0, 1, 5), (0, 5, 4),
            # Back (2, 3, 7, 6) - normals +Y
            (2, 7, 3), (2, 6, 7),
            # Left (0, 3, 7, 4) - normals -X
            (0, 4, 7), (0, 7, 3),
            # Right (1, 2, 6, 5) - normals +X
            (1, 6, 2), (1, 5, 6),
        ]
        
        for i0, i1, i2 in faces:
            triangles.append(np.array([corners[i0], corners[i1], corners[i2]]))
        
        return triangles

    def combine_meshes(self, *meshes: stl_mesh.Mesh) -> stl_mesh.Mesh:
        """Combine multiple meshes into one.
        
        Args:
            meshes: Variable number of Mesh objects
            
        Returns:
            Combined Mesh object
        """
        total_faces = sum(len(m.vectors) for m in meshes)
        combined = stl_mesh.Mesh(np.zeros(total_faces, dtype=stl_mesh.Mesh.dtype))
        
        idx = 0
        for m in meshes:
            for v in m.vectors:
                combined.vectors[idx] = v
                idx += 1
        
        return combined

    def export_stl(
        self,
        path: str,
        binary: bool = True
    ) -> str:
        """Export mesh to STL file.
        
        Args:
            path: Output file path
            binary: If True, use binary STL format (smaller file)
            
        Returns:
            Path to saved file
        """
        if self.mesh is None:
            raise ValueError("No mesh generated")
        
        if binary:
            self.mesh.save(path)
        else:
            self.mesh.save(path, mode=StlMode.ASCII)
        
        return path

    def get_stats(self) -> dict:
        """Get statistics about the mesh.
        
        Returns:
            Dictionary with vertex count, face count, bounds
        """
        if self.mesh is None:
            return {}
        
        return {
            'face_count': len(self.mesh.vectors),
            'vertex_count': len(self.mesh.vectors) * 3,
            'x_min': float(self.mesh.x.min()),
            'x_max': float(self.mesh.x.max()),
            'y_min': float(self.mesh.y.min()),
            'y_max': float(self.mesh.y.max()),
            'z_min': float(self.mesh.z.min()),
            'z_max': float(self.mesh.z.max()),
        }
