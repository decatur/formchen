import shutil
from pathlib import Path

from whatchamacallit.make import process_dir


def build():
    target_root = Path('./docs')
    if target_root.is_dir():
        shutil.rmtree(target_root)
    target_root.mkdir()
    spec_mapping = {'gridchen/': 'https://decatur.github.io/gridchen/gridchen/'}
    process_dir(Path('./').glob('*.*'), target_root, spec_mapping)
    process_dir(Path('./demos').glob('*.*'), target_root, spec_mapping)
    process_dir(Path('./formchen').rglob('*.*'), target_root, spec_mapping)


if __name__ == '__main__':
    build()
