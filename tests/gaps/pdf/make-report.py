# Builds report.pdf: twelve pages with a two-level contents list, a chart and a photo,
# for checking the viewer's thumbnails, contents and find.
import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

here = os.path.dirname(os.path.abspath(__file__))
photo = os.path.join(here, '..', 'assets', 'photo.png')
c = canvas.Canvas(os.path.join(here, 'report.pdf'), pagesize=A4)
c.setTitle('Annual report 2025')
c.setAuthor('Nocturne test pages')
w, h = A4
sections = {1: ('Summary', None), 3: ('Results', None), 4: ('Sales by region', 'Results'), 7: ('Customer growth', 'Results'), 9: ('Costs', None), 11: ('Outlook', None)}
for n in range(1, 13):
    if n in sections:
        title, parent = sections[n]
        key = f's{n}'
        c.bookmarkPage(key)
        c.addOutlineEntry(title, key, level=1 if parent else 0)
        c.setFont('Helvetica-Bold', 26)
        c.drawString(60, h - 90, title)
    c.setFont('Helvetica', 12)
    for i in range(18):
        c.drawString(60, h - 140 - i * 18, f'Page {n}, line {i + 1}: revenue and costs for the year, set out by quarter.')
    if n % 3 == 0:
        for i, (col, bh) in enumerate([((0.25, 0.4, 0.9), 120), ((0.95, 0.4, 0.35), 180), ((0.2, 0.6, 0.3), 90)]):
            c.setFillColorRGB(*col)
            c.rect(80 + i * 70, 200, 50, bh, fill=1, stroke=0)
        c.setFillColorRGB(0, 0, 0)
    if n % 4 == 1:
        c.drawImage(photo, 300, 120, width=220, height=150)
    c.drawString(w / 2 - 10, 40, str(n))
    c.showPage()
c.save()
