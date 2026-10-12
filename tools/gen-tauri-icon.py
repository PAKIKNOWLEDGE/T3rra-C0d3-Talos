"""Generate Talos vector master and Windows icon sizes; no reference artwork copied."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons"
HEXES = [(256, 167), (172, 312), (340, 312)]
POINTS = [(0, -86), (75, -43), (75, 43), (0, 86), (-75, 43), (-75, -43)]

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    polygons = [" ".join(f"{cx+x},{cy+y}" for x,y in POINTS) for cx,cy in HEXES]
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="100" fill="#f4eb16"/>'
    svg += ''.join(f'<polygon points="{points}" fill="#262724"/>' for points in polygons) + '</svg>\n'
    (OUT / "talos.svg").write_text(svg, encoding="utf-8")
    scale = 4
    image = Image.new("RGBA", (512*scale, 512*scale), (0,0,0,0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0,0,512*scale-1,512*scale-1), radius=100*scale, fill="#f4eb16")
    for cx,cy in HEXES:
        draw.polygon([((cx+x)*scale,(cy+y)*scale) for x,y in POINTS], fill="#262724")
    image = image.resize((512,512),Image.Resampling.LANCZOS)
    image.save(OUT / "icon.png")
    for name,size in [("32x32.png",32),("128x128.png",128),("128x128@2x.png",256)]:
        image.resize((size,size),Image.Resampling.LANCZOS).save(OUT / name)
    image.save(OUT / "icon.ico", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
    print(OUT / "icon.png")

if __name__ == "__main__":
    main()
