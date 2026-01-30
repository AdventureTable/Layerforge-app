"""Color planning module for Cheapforge."""

import json
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict


@dataclass
class Filament:
    """Represents a filament with color and transmission properties."""
    id: str
    name: str
    hex_color: str
    td: float  # Transmission depth
    enabled: bool
    order_index: int


@dataclass
class ColorStop:
    """Represents a color threshold in the height range."""
    filament_id: str
    threshold_z_mm: float


@dataclass
class SwapEntry:
    """Represents a filament swap at a specific layer."""
    layer: int
    z_mm: float
    filament_id: str


class ColorPlanner:
    """Plans filament swaps based on color stops and layer height."""

    def __init__(self):
        self.filaments: List[Filament] = []
        self.stops: List[ColorStop] = []
        self.swaps: List[SwapEntry] = []

    def set_filaments(self, filaments: List[Dict]) -> None:
        """Set available filaments.
        
        Args:
            filaments: List of filament dictionaries
        """
        self.filaments = [
            Filament(
                id=f.get('id', f.get('filament_id', '')),
                name=f.get('name', ''),
                hex_color=f.get('hex_color', f.get('hexColor', '#FFFFFF')),
                td=f.get('td', 1.0),
                enabled=f.get('enabled', True),
                order_index=f.get('order_index', f.get('orderIndex', 0))
            )
            for f in filaments
        ]

    def set_stops(self, stops: List[Dict]) -> None:
        """Set color stops.
        
        Args:
            stops: List of color stop dictionaries
        """
        self.stops = [
            ColorStop(
                filament_id=s.get('filament_id', s.get('filamentId', '')),
                threshold_z_mm=s.get('threshold_z_mm', s.get('thresholdZMm', 0))
            )
            for s in stops
        ]
        # Sort by threshold
        self.stops.sort(key=lambda s: s.threshold_z_mm)

    def compute_swaps(
        self,
        layer_height_mm: float,
        min_depth_mm: float,
        max_depth_mm: float
    ) -> List[SwapEntry]:
        """Compute filament swap points based on stops and layer height.
        
        Args:
            layer_height_mm: Height of each print layer
            min_depth_mm: Minimum model depth
            max_depth_mm: Maximum model depth
            
        Returns:
            List of SwapEntry objects
        """
        self.swaps = []
        
        if not self.stops:
            return self.swaps
        
        # Sort stops by threshold
        sorted_stops = sorted(self.stops, key=lambda s: s.threshold_z_mm)
        
        # Convert each stop's Z threshold to a layer number
        last_layer = -1
        for stop in sorted_stops:
            layer = int(stop.threshold_z_mm / layer_height_mm)
            
            # Only add if this is a new layer (avoid duplicates)
            if layer > last_layer:
                swap = SwapEntry(
                    layer=layer,
                    z_mm=round(layer * layer_height_mm, 3),
                    filament_id=stop.filament_id
                )
                self.swaps.append(swap)
                last_layer = layer
        
        return self.swaps

    def get_filament_by_id(self, filament_id: str) -> Optional[Filament]:
        """Get filament by ID.
        
        Args:
            filament_id: Filament identifier
            
        Returns:
            Filament object or None
        """
        for f in self.filaments:
            if f.id == filament_id:
                return f
        return None

    def export_plan_txt(
        self,
        print_settings: Dict,
        geometry_settings: Dict,
        output_path: str
    ) -> str:
        """Export swap plan as human-readable text.
        
        Args:
            print_settings: Print settings dictionary
            geometry_settings: Model geometry settings dictionary
            output_path: Output file path
            
        Returns:
            Path to saved file
        """
        lines = [
            "=" * 40,
            "CHEAPFORGE PRINT PLAN",
            "=" * 40,
            "",
            "MODEL SETTINGS",
            "-" * 20,
            f"Dimensions: {print_settings.get('width_mm', 100)} x {print_settings.get('height_mm', 100)} mm",
            f"Min Depth: {geometry_settings.get('min_depth_mm', 0.48)} mm",
            f"Max Depth: {geometry_settings.get('max_depth_mm', 2.24)} mm",
            f"Layer Height: {print_settings.get('layer_height_mm', 0.08)} mm",
            f"Base Layer: {print_settings.get('base_layer_mm', 0.16)} mm",
            "",
        ]
        
        if print_settings.get('has_border', False):
            lines.extend([
                "BORDER",
                "-" * 20,
                f"Width: {print_settings.get('border_width_mm', 2)} mm",
                f"Depth: {print_settings.get('border_depth_mm', 2)} mm",
                "",
            ])
        
        lines.extend([
            "FILAMENTS",
            "-" * 20,
        ])
        
        enabled_filaments = [f for f in self.filaments if f.enabled]
        for i, f in enumerate(enabled_filaments, 1):
            lines.append(f"{i}. {f.name} ({f.hex_color}, Td={f.td})")
        
        lines.extend([
            "",
            "SWAP PLAN",
            "-" * 20,
        ])
        
        if self.swaps:
            # First filament starts at layer 0
            first_filament = self.get_filament_by_id(self.swaps[0].filament_id)
            first_name = first_filament.name if first_filament else self.swaps[0].filament_id
            lines.append(f"Start: {first_name}")
            lines.append("")
            
            for swap in self.swaps[1:]:
                filament = self.get_filament_by_id(swap.filament_id)
                name = filament.name if filament else swap.filament_id
                lines.append(f"Layer {swap.layer} ({swap.z_mm} mm): Switch to {name}")
        else:
            lines.append("No swaps defined")
        
        lines.extend([
            "",
            "=" * 40,
            "Generated by Cheapforge",
            "=" * 40,
        ])
        
        content = "\n".join(lines)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path

    def export_plan_json(
        self,
        print_settings: Dict,
        geometry_settings: Dict,
        output_path: str
    ) -> str:
        """Export swap plan as JSON.
        
        Args:
            print_settings: Print settings dictionary
            geometry_settings: Model geometry settings dictionary
            output_path: Output file path
            
        Returns:
            Path to saved file
        """
        data = {
            "version": "1.0",
            "generator": "Cheapforge",
            "print_settings": print_settings,
            "geometry_settings": geometry_settings,
            "filaments": [asdict(f) for f in self.filaments],
            "color_stops": [asdict(s) for s in self.stops],
            "swaps": [asdict(s) for s in self.swaps],
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        return output_path

    def get_layer_filament(self, layer: int) -> Optional[Filament]:
        """Get the active filament at a specific layer.
        
        Args:
            layer: Layer number
            
        Returns:
            Active Filament at that layer, or None
        """
        if not self.swaps:
            return None
        
        active_filament_id = self.swaps[0].filament_id
        
        for swap in self.swaps:
            if swap.layer > layer:
                break
            active_filament_id = swap.filament_id
        
        return self.get_filament_by_id(active_filament_id)
