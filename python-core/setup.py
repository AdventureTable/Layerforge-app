"""Setup script for Layerforge Python core."""

from setuptools import setup, find_packages

setup(
    name="layerforge",
    version="0.1.0",
    description="Image processing and STL generation for 3D printing",
    author="Layerforge Team",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "numpy>=1.24.0",
        "Pillow>=10.0.0",
        "numpy-stl>=3.0.0",
        "scipy>=1.11.0",
    ],
    extras_require={
        "dev": [
            "pyinstaller>=6.0.0",
            "pytest>=7.0.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "layerforge-core=layerforge.cli:main",
        ]
    },
)
