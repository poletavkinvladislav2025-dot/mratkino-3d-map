"""Render only existing OSM woodland; feather inward, never add vegetation outside it."""
import json
from pathlib import Path
import numpy as np
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from PIL import Image, ImageFilter
root = Path(__file__).resolve().parents[1] / 'public/live'
bounds = json.loads((root/'manifest.json').read_text())['bounds']
features = json.loads((root/'forest.geojson').read_text())['features']
size = 2048
mask = rasterize([(f['geometry'], 255) for f in features], out_shape=(size,size), transform=from_bounds(*bounds,size,size), fill=0, dtype='uint8')
blur = np.array(Image.fromarray(mask).filter(ImageFilter.GaussianBlur(4))).astype(float)
# Edges fade inside the footprint; the original mask clips every outer pixel.
alpha = np.clip((blur-127.5)*2,0,255) * (mask>0) * .62
pixels = np.zeros((size,size,4), dtype=np.uint8)
pixels[:,:,:3] = [61,100,92]
pixels[:,:,3] = alpha.astype('uint8')
Image.fromarray(pixels).save(root/'forest-winter.png',optimize=True)
print('OSM forest display mask:', root/'forest-winter.png')
