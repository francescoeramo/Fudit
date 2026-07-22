# Corpus OCR Fudit

Fixture sintetiche e riproducibili per misurare import dieta e scontrini.

- `output/pdf/ocr-fixtures`: due diete PDF con testo selezionabile e layout differenti.
- `receipts`: tre scontrini PNG (pulito, inclinato, basso contrasto) con ground truth JSON.
- Rigenerazione: `python3 -m pip install -r scripts/requirements-ocr.txt`, poi `npm run fixtures:ocr`.
- Misurazione parser: `npm run test:ocr`.

I documenti contengono esclusivamente dati inventati e non sono indicazioni cliniche o fiscali.
