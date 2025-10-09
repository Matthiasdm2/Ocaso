"""
Usage: python scripts/index_seed.py http://localhost:9000 ./seeds.csv
seeds.csv headers: listing_id,image_url,local_path_to_image

If local_path_to_image is empty or missing, the script will try to download the image from image_url.
"""

import sys, csv, requests, os, tempfile

base = sys.argv[1]
csv_path = sys.argv[2]

def load_image_bytes(local_path: str | None, url: str) -> tuple[bytes, str]:
  # Prefer local file if provided and exists
  if local_path and os.path.isfile(local_path):
    with open(local_path, 'rb') as f:
      return f.read(), os.path.basename(local_path)
  # Fallback to download
  resp = requests.get(url, timeout=30)
  resp.raise_for_status()
  # Derive a filename from URL
  name = url.split('/')[-1] or 'image.jpg'
  return resp.content, name

with open(csv_path, newline='', encoding='utf-8') as f:
  reader = csv.DictReader(f)
  for row in reader:
    listing_id = row.get('listing_id', '').strip()
    image_url = row.get('image_url', '').strip()
    path = (row.get('local_path_to_image') or '').strip()
    try:
      content, fname = load_image_bytes(path or None, image_url)
      files = {'file': (fname, content, 'application/octet-stream')}
      data = {'listing_id': listing_id, 'image_url': image_url}
      r = requests.post(f"{base}/index", data=data, files=files, timeout=60)
      print(listing_id, r.status_code, r.text[:200])
    except Exception as e:
      print(listing_id, 'ERROR', str(e))
