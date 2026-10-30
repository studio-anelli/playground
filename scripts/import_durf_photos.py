import io
import os
import time
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

PHOTOS = [
    ("Eq_dtBylgoE", "ryan-joseph"),
    ("3fgC5r65CU0", "jonathan-kemper"),
    ("80n_J7TsQX0", "annie-spratt"),
    ("DZkYOtfxEvU", "redmind-studio"),
    ("Jvg1cfbzaz4", "kate-bezzubets"),
    ("C0eP-46jmFk", "logan-weaver"),
    ("UZUzvJEvKnI", "sten-rademaker"),
    ("1Qk6BsWZaME", "alex-muromtsev"),
    ("7zztVGeYOs0", "patrick-amofah"),
    ("35_nYjsRo5Y", "kate-bezzubets"),
]
target = Path("public/durf-campus/photos")
target.mkdir(parents=True, exist_ok=True)
for index, (photo_id, author) in enumerate(PHOTOS, 1):
    dest = target / f"{index:02d}.webp"
    urls = [
        f"https://unsplash.com/photos/{photo_id}/download?force=true&w=1600",
        f"https://unsplash.com/photos/{photo_id}/download?w=1600",
    ]
    last_error = None
    for attempt, url in enumerate(urls, 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 DURF-Campus-Asset-Importer/1.0","Accept":"image/avif,image/webp,image/jpeg,image/*"})
            with urllib.request.urlopen(request, timeout=35) as response:
                data = response.read()
            with Image.open(io.BytesIO(data)) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                image.save(dest, "WEBP", quality=78, method=6)
            print(f"{index:02d} | {author} | {dest.stat().st_size} bytes")
            last_error = None
            break
        except Exception as e:
            last_error = e
            time.sleep(2)
    if last_error:
        raise RuntimeError(f"Could not import photo {photo_id}: {last_error}")
print("Imported all 10 photographic assets.")
