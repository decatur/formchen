import re
import shutil
from pathlib import Path
from typing import List, Tuple, Generator, Dict


def process_file(source: Path, target: Path, spec_mapping: List[Tuple[str, str]]):
    if not target.parent.is_dir():
        target.parent.mkdir(parents=True)
    if source.suffix in {'.html', '.js'}:
        t = read_file(source, spec_mapping)
        target.write_text(t, encoding='utf8')
    else:
        shutil.copy2(source.as_posix(), target.as_posix())


def read_file(source: Path, spec_mapping: List[Tuple[str, str]]) -> str:
    print('read_file ' + source.as_posix())
    src = source.read_text(encoding='utf8')
    was_patched, src = process_imports(src, spec_mapping)
    # TODO: Cache processed modules
    return src


def process_imports(src: str, imports: Dict[str, str], scopes: dict = dict()) -> Tuple[str, bool]:
    """
    Remaps the imports and exports in the specified Javascript module according the import map.
    This is the Python equivalence to https://github.com/guybedford/es-module-shims for Javascript.

    :param src:
    :param imports: See https://github.com/WICG/import-maps
    :return: 
    """

    # Skip initial comments. Note this always matches.
    m = re.match(r'(\s*(/\*.*?\*/|//[^\r\n]*))*', src, flags=re.DOTALL)
    # print(m.group())
    # index = 0
    # for m in re.finditer(r'(\s*(/\*.*?\*/|//[^\r\n]*))*', src, flags=re.DOTALL):
    #     print(m)
    #     index = m.end()
    #     print(m.group())
    end_of_comments = m.end()
    m = re.search(r'(function|const|let|var)\s', src[end_of_comments:], flags=re.DOTALL)
    if m is None:
        # TODO: Handle empty module
        return (src, False)
    print(m)
    import_section = src[end_of_comments:end_of_comments + m.start()]
    is_import_section = re.match('\s*(import|export)\s', import_section) is not None
    if is_import_section:
        was_patched = False
        for key, value in imports.items():
            import_section, patch_count = re.subn(r'((import|export).*?) (["\'])' + key, r'\1 \3' + value, import_section, flags=re.DOTALL)
            was_patched |= patch_count > 0

        if was_patched:
            return (src[0:end_of_comments] + import_section + src[end_of_comments + m.start():], was_patched)
        else:
            return (src, False)
    else:
        return (src, False)


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
