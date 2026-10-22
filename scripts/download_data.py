"""Obtain OSM evidence, then a real Copernicus GLO-30 crop; never synthesize elevations."""
import argparse, hashlib, json, math
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
API = 'https://overpass-api.de/api/interpreter'
S3 = 'https://copernicus-dem-30m.s3.amazonaws.com'

def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2))

def query(q):
    r = requests.get(API, params={'data': q}, headers={'User-Agent': 'MratkinoResearch/0.1 (open geographic prototype)'}, timeout=(15,65))
    r.raise_for_status()
    result = r.json()
    if result.get('remark'):
        raise RuntimeError('Overpass incomplete response: ' + result['remark'])
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--geotiff', type=Path, help='Use a legally obtained local DEM instead of S3')
    parser.add_argument('--vertical-reference', help='Required for a manual DEM, e.g. EGM2008 orthometric metres')
    parser.add_argument('--osm', type=Path, help='Use a local Overpass JSON export (out geom)')
    parser.add_argument('--center', nargs=2, type=float, metavar=('LON','LAT'), help='Verified center, required for offline OSM without summit node')
    args = parser.parse_args()
    if args.geotiff and not args.vertical_reference:
        parser.error('--geotiff requires --vertical-reference after checking that elevations are metres')
    if args.geotiff and args.geotiff.resolve() == (ROOT/'data/dem/mratkino.tif').resolve():
        parser.error('Keep the original manual DEM separate from data/dem/mratkino.tif')
    raw = json.loads(args.osm.read_text()) if args.osm else query('[out:json][timeout:60];nwr["name"~"Мраткино|Mratkino",i](53.85,58.2,54.15,58.65);out center;')
    peaks = [e for e in raw['elements'] if e.get('tags', {}).get('natural') == 'peak']
    if args.center:
        lon, lat = args.center
        locator = {'source': 'user supplied verified coordinate', 'lon': lon, 'lat': lat}
    elif len(peaks) == 1:
        locator = peaks[0]
        lon, lat = locator['lon'], locator['lat']
    else:
        save(ROOT/'data/raw/location-candidates.json', raw)
        raise RuntimeError('No unique summit. Inspect candidates and pass verified --center LON LAT; do not guess.')
    if not (58.2 < lon < 58.65 and 53.85 < lat < 54.15):
        raise ValueError('Center is outside the Mratkino / Beloretsk search area')
    # Six kilometres square around the verified summit.
    dy, dx = 3000/111320, 3000/(111320*math.cos(math.radians(lat)))
    bounds = [lon-dx, lat-dy, lon+dx, lat+dy]
    west,south,east,north = bounds
    # Reprojected rectangular UTM bounds extend beyond WGS84 corners. Retain a real-data margin.
    dem_bounds=[west-.003,south-.003,east+.003,north+.003]
    save(ROOT/'data/raw/location.json', {'locator':locator, 'center':[lon,lat], 'bounds':bounds, 'retrieved_at':datetime.now(timezone.utc).isoformat(), 'osm_license':'ODbL 1.0', 'osm_endpoint':API})
    if not args.osm:
        # Keep independent datasets independent; partial OSM failures must not block actual DEM.
        elements={}; failures=[]
        selectors = {
            'ski': '[~"^(piste:type|aerialway)$"~"."]',
            'forest': '["landuse"="forest"]',
            'wood': '["natural"="wood"]',
            'buildings': '["building"]',
            'amenities': '["amenity"]',
            'tourism': '["tourism"]',
            'roads': '["highway"]',
        }
        for layer, selector in selectors.items():
            try:
                response=query(f'[out:json][timeout:45];nwr{selector}({south},{west},{north},{east});out geom;')
                save(ROOT/f'data/raw/osm-{layer}.json', response)
                for e in response['elements']: elements[(e['type'],e['id'])]=e
                print(f'OSM {layer}: {len(response["elements"])} elements', flush=True)
            except (requests.RequestException, ValueError, RuntimeError) as error:
                failures.append({'layer':layer,'error':str(error)})
                print(f'OSM {layer}: {error}, recorded in provenance', flush=True)
        raw={'elements':list(elements.values()), 'incomplete_requests':failures}
    save(ROOT/'data/raw/osm.json', raw)
    if args.geotiff:
        source = str(args.geotiff.resolve())
    else:
        # Rasterio reads only intersecting COG blocks, not a whole 1-degree tile.
        source = None
    import rasterio
    from rasterio.merge import merge
    from rasterio.warp import transform_bounds
    opened = []
    (ROOT/'data/dem').mkdir(parents=True,exist_ok=True)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
        try:
            if source:
                opened.append(rasterio.open(source))
                native_bounds = transform_bounds('EPSG:4326', opened[0].crs, *dem_bounds, densify_pts=21)
                sources = [source]
            else:
                sources=[]
                for y in range(math.floor(dem_bounds[1]), math.floor(dem_bounds[3])+1):
                    for x in range(math.floor(dem_bounds[0]), math.floor(dem_bounds[2])+1):
                        stem=f'Copernicus_DSM_COG_10_N{y:02d}_00_E{x:03d}_00_DEM'
                        url=f'{S3}/{stem}/{stem}.tif'
                        sources.append(url)
                        try:
                            opened.append(rasterio.open(url))
                        except rasterio.errors.RasterioIOError:
                            # Some GDAL wheels cannot use the injected proxy CA. Keep TLS verification
                            # enabled and use requests' supported environment CA binding instead.
                            cached=ROOT/f'data/dem/{stem}.tif'
                            sidecar=cached.with_suffix('.sha256')
                            valid=cached.exists() and sidecar.exists() and hashlib.sha256(cached.read_bytes()).hexdigest()==sidecar.read_text().strip()
                            if not valid:
                                print(f'Fetching verified HTTPS tile {stem} (COG reader fallback)',flush=True)
                                response=requests.get(url,stream=True,timeout=(15,120));response.raise_for_status()
                                if response.status_code!=200: raise RuntimeError('Incomplete tile response')
                                temporary=cached.with_suffix('.part')
                                with temporary.open('wb') as output:
                                    for chunk in response.iter_content(1024*1024): output.write(chunk)
                                temporary.replace(cached)
                                sidecar.write_text(hashlib.sha256(cached.read_bytes()).hexdigest())
                            opened.append(rasterio.open(cached))
                native_bounds=dem_bounds
            image, affine = merge(opened, bounds=native_bounds)
            profile=opened[0].profile.copy()
            profile.update(driver='GTiff', height=image.shape[1], width=image.shape[2], transform=affine, compress='deflate')
            target=ROOT/'data/dem/mratkino.tif'
            with rasterio.open(target,'w',**profile) as dst: dst.write(image)
            save(ROOT/'data/dem/source.json', {'sources':sources,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'retrieved_at':datetime.now(timezone.utc).isoformat(), 'source_type':'user GeoTIFF' if source else 'Copernicus DEM GLO-30 DSM', 'license':'Verify local DEM license' if source else 'Copernicus DEM License (free use; attribution required)', 'vertical_reference':args.vertical_reference if source else 'EGM2008 orthometric heights, metres', 'notice':'Copernicus DSM measures surface incl. vegetation/buildings, not bare-earth survey.'})
        finally:
            for ds in opened: ds.close()
    print('Downloaded real inputs. Next: python scripts/prepare_terrain.py')

if __name__ == '__main__': main()
