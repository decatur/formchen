from pathlib import Path

from insituwebserver.make import process_dir


def build():
    target_root = Path('./docs')
    spec_mapping = {'gridchen/': 'https://decatur.github.io/grid-chen/gridchen/'}
    process_dir(Path('./').glob('*.*'), target_root, spec_mapping)
    process_dir(Path('./demos').glob('*.*'), target_root, spec_mapping)
    process_dir(Path('./formchen').rglob('*.*'), target_root, spec_mapping)

    target_root = Path('./lib')
    spec_mapping = {'gridchen/', '/gridchen/'}
    process_dir(Path('./formchen').rglob('*.*'), target_root, spec_mapping)


if __name__ == '__main__':
    build()