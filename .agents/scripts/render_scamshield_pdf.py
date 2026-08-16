import fitz
from pathlib import Path
pdf = Path('attached_assets/ScamShield_Fake_Job_Posting_Detection_1786871279318.pdf')
out = Path('.agents/outputs/scamshield_pdf')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(pdf)
print('pages', doc.page_count, 'metadata', doc.metadata)
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    path = out / f'page-{i+1}.png'
    pix.save(path)
    print(path, page.rect)
    print(page.get_text()[:300].replace('\n',' | '))
