import re
import shutil
from pathlib import Path
from typing import List, Tuple, Generator


def process_file(source: Path, target: Path, spec_mapping: List[Tuple[str, str]]):
    if not target.parent.is_dir():
        target.parent.mkdir(parents=True)
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


def process_dir(source: Generator[Path, None, None], target_root: Path, spec_mapping: List[Tuple[str, str]]):
    for elem in source:
        if elem.is_file():
            process_file(elem, target_root / elem, spec_mapping)


def process_dir_recursive(source: Path, target_root: Path, spec_mapping: List[Tuple[str, str]]):
    for elem in source.rglob('*.*'):
        p = Path('./') / elem
        if p.is_file():
            process_file(p, target_root / elem, spec_mapping)


def build():
    target_root = Path('./docs')
    spec_mapping = [('gridchen/', 'https://decatur.github.io/grid-chen/gridchen/')]
    process_dir(Path('./').glob('*.*'), target_root, spec_mapping)
    process_dir(Path('./demos').glob('*.*'), target_root, spec_mapping)
    process_dir(Path('./formchen').rglob('*.*'), target_root, spec_mapping)

    target_root = Path('./lib')
    spec_mapping = [('gridchen/', '/gridchen/')]
    process_dir(Path('./formchen').rglob('*.*'), target_root, spec_mapping)


if __name__ == '__main__':
    build()
