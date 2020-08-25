import re
import shutil
from pathlib import Path
from typing import List, Tuple


def process_file(source: Path, target: Path):
    spec_mapping = [('gridchen/', 'https://decatur.github.io/grid-chen/gridchen/')]
    if source.suffix in {'.html', '.js'}:
        t = read_file(source, spec_mapping)
        target.write_text(t, encoding='utf8')
    else:
        shutil.copy2(source.as_posix(), target.as_posix())


def read_file(source: Path, spec_mapping: List[Tuple[str, str]]) -> str:
    print('>>>>>>>>' + source.as_posix())
    t = source.read_text(encoding='utf8')
    for spec_map in spec_mapping:
        t = re.sub(r'(import[^"\']*) (["\'])' + spec_map[0], r'\1 \2' + spec_map[1], t, flags=re.DOTALL)
    return t


def build():

    for elem in Path('./').glob('*.*'):
        p = Path('./') / elem
        if p.is_file():
            process_file(p, target_root / elem)

    for elem in Path('./formchen').rglob('*.*'):
        p = Path('./') / elem
        if p.is_file():
            target = target_root / elem
            if not target.parent.is_dir():
                target.parent.mkdir(parents=True)
            process_file(p, target_root / elem)


if __name__ == '__main__':
    target_root = Path('./docs')
    build()
