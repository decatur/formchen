import re
import shutil
from pathlib import Path


def process(source: Path, target: Path):
    if source.suffix in {'.html', '.js'}:
        print('>>>>>>>>' + source.as_posix())
        t = source.read_text(encoding='utf8')
        # http://localhost:8000/gridchen/testing/suite.js
        # http://localhost:8080/gridchen/testing/suite.js
        t = re.sub(r'(import .*) ("|\')/gridchen/', r'\1 \2https://decatur.github.io/grid-chen/gridchen/', t)
        target.write_text(t, encoding='utf8')
    else:
        shutil.copy2(p.as_posix(), target_root / elem)


target_root = Path('./site')

for elem in Path('./').glob('*.*'):
    p = Path('./') / elem
    if p.is_file():
        process(p, target_root / elem)


for elem in Path('./formchen').rglob('*.*'):
    p = Path('./') / elem
    if p.is_file():
        target = target_root / elem
        if not target.parent.is_dir():
            target.parent.mkdir(parents=True)
        process(p, target_root / elem)
