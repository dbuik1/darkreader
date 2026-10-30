import math, random, io, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.utils import ImageReader

out = os.environ["OUT"]
os.makedirs(f"{out}/assets", exist_ok=True)
random.seed(7)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except OSError:
    font = big = ImageFont.load_default()

def screenshot():
    im = Image.new("RGB", (800, 500), "white")
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 800, 48], fill="#f3f4f6")
    d.text((16, 13), "Settings", fill="#111827", font=big)
    for i, label in enumerate(["Account", "Notifications", "Privacy", "Billing"]):
        y = 80 + i * 90
        d.text((24, y), label, fill="#111827", font=big)
        d.text((24, y + 32), "Change how this section behaves for your workspace.", fill="#4b5563", font=font)
        d.rounded_rectangle([640, y + 4, 770, y + 44], 8, fill="#2563eb")
        d.text((672, y + 14), "Edit", fill="white", font=font)
    return im

def photo():
    w, h = 800, 500
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            t = y / h
            sky = (int(110 + 120 * (1 - t)), int(160 + 70 * (1 - t)), 235)
            ridge = 300 + 40 * math.sin(x / 70) + 25 * math.sin(x / 23)
            if y > ridge:
                g = 90 + int(60 * math.sin(x / 9 + y / 13)) // 3
                px[x, y] = (40 + random.randint(0, 25), g + random.randint(0, 25), 40)
            else:
                px[x, y] = tuple(min(255, c + random.randint(-6, 6)) for c in sky)
    d = ImageDraw.Draw(im)
    d.ellipse([600, 60, 690, 150], fill=(255, 220, 120))
    return im.filter(ImageFilter.GaussianBlur(1))

def icon():
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([20, 20, 108, 108], outline=(20, 20, 20, 255), width=10)
    d.line([88, 88, 120, 120], fill=(20, 20, 20, 255), width=12)
    return im

def diagram():
    im = Image.new("RGB", (800, 360), "white")
    d = ImageDraw.Draw(im)
    boxes = [(40, "Request", "#dbeafe"), (300, "Queue", "#fef3c7"), (560, "Worker", "#dcfce7")]
    for x, label, fill in boxes:
        d.rounded_rectangle([x, 130, x + 200, 230], 12, fill=fill, outline="#111827", width=3)
        d.text((x + 60, 168), label, fill="#111827", font=big)
    for x in (240, 500):
        d.line([x, 180, x + 60, 180], fill="#111827", width=4)
        d.polygon([(x + 60, 172), (x + 60, 188), (x + 72, 180)], fill="#111827")
    return im

imgs = {"screenshot": screenshot(), "photo": photo(), "icon": icon(), "diagram": diagram()}
for name, im in imgs.items():
    im.save(f"{out}/assets/{name}.png")

def chart_png():
    im = Image.new("RGB", (700, 320), "white")
    d = ImageDraw.Draw(im)
    vals = [(5, 8, 3), (7, 6, 4), (9, 7, 6), (6, 9, 8)]
    cols = ["#2563eb", "#dc2626", "#16a34a"]
    d.line([50, 280, 680, 280], fill="#111827", width=2)
    for i, group in enumerate(vals):
        for j, v in enumerate(group):
            x = 80 + i * 150 + j * 40
            d.rectangle([x, 280 - v * 25, x + 32, 280], fill=cols[j])
    return im

def text_pdf(path):
    c = pdfcanvas.Canvas(path, pagesize=A4)
    w, h = A4
    c.setFont("Helvetica-Bold", 20)
    c.drawString(60, h - 80, "Quarterly report")
    c.setFont("Helvetica", 11)
    body = ("Text and line art on this page should turn light-on-dark. The chart keeps its "
            "colours distinguishable and the photo below keeps its true colours.")
    y = h - 115
    for line in [body[:95], body[95:]]:
        c.drawString(60, y, line); y -= 16
    for i, (v, col) in enumerate([(120, (0.15, 0.39, 0.92)), (180, (0.86, 0.15, 0.15)), (90, (0.09, 0.64, 0.29))]):
        c.setFillColorRGB(*col); c.rect(80 + i * 70, h - 360, 50, v, fill=1, stroke=0)
    c.setStrokeColorRGB(0, 0, 0); c.line(60, h - 360, 320, h - 360)
    c.drawImage(ImageReader(imgs["photo"]), 60, h - 700, width=400, height=250)
    c.setFillColorRGB(0, 0, 0)
    c.drawString(60, h - 720, "Photo: should keep natural colours, not look like a negative.")
    c.showPage()
    c.setFont("Helvetica", 11)
    y = h - 80
    for i in range(40):
        c.drawString(60, y, f"Line {i + 1}: search for the word lighthouse to check search works." if i == 20 else f"Line {i + 1}: plain body text.")
        y -= 16
    c.save()

def scanned_pdf(path):
    page = Image.new("RGB", (1240, 1754), (250, 248, 240))
    d = ImageDraw.Draw(page)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 28) if os.path.exists("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf") else font
    for i in range(30):
        d.text((120, 150 + i * 48), f"Scanned line {i + 1}. This page is one image with no text layer.", fill=(30, 30, 30), font=f)
    page = page.rotate(0.6, fillcolor=(250, 248, 240)).filter(ImageFilter.GaussianBlur(0.6))
    c = pdfcanvas.Canvas(path, pagesize=A4)
    c.drawImage(ImageReader(page), 0, 0, width=A4[0], height=A4[1])
    c.save()

os.makedirs(f"{out}/pdf", exist_ok=True)
text_pdf(f"{out}/pdf/text.pdf")
scanned_pdf(f"{out}/pdf/scanned.pdf")
chart_png().save(f"{out}/assets/chart.png")
