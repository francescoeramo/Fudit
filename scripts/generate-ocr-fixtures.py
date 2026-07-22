from pathlib import Path
import json
import random

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "output" / "pdf" / "ocr-fixtures"
RECEIPT_DIR = ROOT / "tests" / "fixtures" / "ocr" / "receipts"
PDF_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

DIETS = {
    "dieta-settimanale-pulita": [
        "Lunedì pranzo: pasta integrale 80 g, pomodori 150 g",
        "Lunedì cena: petto di pollo 180 g, zucchine 200 g",
        "Martedì pranzo: riso basmati 90 g, ceci 120 g",
        "Martedì cena: salmone 160 g, broccoli 220 g",
    ],
    "dieta-multicolonna": [
        "Mercoledì colazione: yogurt greco 170 g, avena 40 g",
        "Mercoledì pranzo: pasta integrale 85 g, lenticchie 100 g",
        "Giovedì cena: uova 2 pz, spinaci 180 g",
        "Venerdì pranzo: riso basmati 90 g, tonno 120 g",
    ],
}


def make_text_pdf(name: str, lines: list[str], columns: bool = False) -> None:
    path = PDF_DIR / f"{name}.pdf"
    page_size = landscape(A4) if columns else A4
    c = canvas.Canvas(str(path), pagesize=page_size)
    width, height = page_size
    c.setTitle("Piano alimentare settimanale")
    c.setFont("Courier-Bold", 18)
    c.drawString(48, height - 58, "Piano alimentare settimanale")
    c.setFont("Courier", 9)
    c.drawString(48, height - 76, "Fixture sintetica Fudit - dati non clinici")
    c.line(48, height - 86, width - 48, height - 86)
    c.setFont("Courier", 9 if columns else 10)
    if columns:
        mid = len(lines) // 2
        for column, subset in enumerate((lines[:mid], lines[mid:])):
            x = 48 + column * (width / 2)
            y = height - 120
            for line in subset:
                c.drawString(x, y, line)
                y -= 34
    else:
        y = height - 120
        for line in lines:
            c.drawString(58, y, line)
            y -= 38
    c.setFont("Courier-Oblique", 8)
    c.drawString(48, 40, "Documento generato esclusivamente per test OCR")
    c.save()
    (PDF_DIR / f"{name}.expected.json").write_text(
        json.dumps({"meals": lines, "expected_count": len(lines)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def receipt_image(lines: list[str], variant: str) -> Image.Image:
    random.seed(42)
    width, height = 720, 980
    paper = Image.new("RGB", (width, height), (247, 244, 232))
    draw = ImageDraw.Draw(paper)
    font_candidates = [
        Path("/usr/share/fonts/google-noto-vf/NotoSansMono[wght].ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
    ]
    font_path = next((path for path in font_candidates if path.exists()), None)

    def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        try:
            return ImageFont.truetype(
                str(font_path) if font_path else "DejaVuSansMono.ttf", size
            )
        except OSError:
            return ImageFont.load_default(size=size)

    font = load_font(25)
    small = load_font(21)
    bold = load_font(28)
    draw.text((210, 35), "SUPERMERCATO FUDIT", font=bold, fill=(25, 25, 25))
    draw.text((170, 78), "Documento commerciale di prova", font=small, fill=(45, 45, 45))
    draw.line((55, 120, width - 55, 120), fill=(60, 60, 60), width=2)
    y = 155
    for line in lines:
        draw.text((65, y), line, font=font, fill=(28, 28, 28))
        y += 54
    draw.line((55, y + 4, width - 55, y + 4), fill=(60, 60, 60), width=2)
    total = sum(float(line.rsplit(" ", 1)[1].replace(",", ".")) for line in lines)
    draw.text((65, y + 35), f"TOTALE EUR                 {total:5.2f}".replace(".", ","), font=bold, fill=(20, 20, 20))
    draw.text((65, y + 95), "22/07/2026  18:42", font=small, fill=(45, 45, 45))
    draw.text((65, y + 135), "GRAZIE E ARRIVEDERCI", font=small, fill=(45, 45, 45))
    if variant == "tilted":
        paper = paper.rotate(2.4, expand=True, fillcolor=(225, 220, 205)).resize((720, 980))
        paper = paper.filter(ImageFilter.GaussianBlur(0.45))
    elif variant == "low-contrast":
        paper = ImageEnhance.Contrast(paper).enhance(0.52)
        noise = Image.effect_noise(paper.size, 8).convert("RGB")
        paper = Image.blend(paper, noise, 0.08)
    return paper


RECEIPTS = {
    "scontrino-pulito": [
        "PASTA INTEGRALE 500G        1,29",
        "YOGURT GRECO                1,79",
        "PETTO POLLO                 4,59",
        "ZUCCHINE                    1,49",
    ],
    "scontrino-inclinato": [
        "RISO BASMATI 500G           2,19",
        "CECI BARATTOLO              0,89",
        "SALMONE 400G                6,49",
        "BROCCOLI                    1,69",
    ],
    "scontrino-basso-contrasto": [
        "UOVA BIO 6PZ                2,69",
        "AVENA 500G                  1,39",
        "TONNO NATURALE              2,39",
        "UOVA BIO 6PZ                2,69",
    ],
}


for name, lines in DIETS.items():
    make_text_pdf(name, lines, columns=name.endswith("multicolonna"))

for name, lines in RECEIPTS.items():
    variant = "clean"
    if "inclinato" in name:
        variant = "tilted"
    if "contrasto" in name:
        variant = "low-contrast"
    receipt_image(lines, variant).save(RECEIPT_DIR / f"{name}.png", optimize=True)
    rows = [
        {"name": line[:-5].strip(), "price": float(line[-4:].replace(",", "."))}
        for line in lines
    ]
    (RECEIPT_DIR / f"{name}.expected.json").write_text(
        json.dumps({"rows": rows, "expected_count": len(rows)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

(ROOT / "tests" / "fixtures" / "ocr" / "README.md").write_text(
    """# Corpus OCR Fudit

Fixture sintetiche e riproducibili per misurare import dieta e scontrini.

- `output/pdf/ocr-fixtures`: due diete PDF con testo selezionabile e layout differenti.
- `receipts`: tre scontrini PNG (pulito, inclinato, basso contrasto) con ground truth JSON.
- Rigenerazione: `python3 -m pip install -r scripts/requirements-ocr.txt`, poi `npm run fixtures:ocr`.
- Misurazione parser: `npm run test:ocr`.

I documenti contengono esclusivamente dati inventati e non sono indicazioni cliniche o fiscali.
""",
    encoding="utf-8",
)
