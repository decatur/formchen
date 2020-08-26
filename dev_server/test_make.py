import re
import make


def test_read_file():
    spec_map = ('gridchen/', '/root/')
    src = """
    import 'gridchen/foo.js'
    import 'gridchen/bar.js'
    """
    t = re.sub(r'(import.*?) (["\'])' + spec_map[0], r'\1 \2' + spec_map[1], src, flags=re.DOTALL)

    expected = """
    import '/root/foo.js'
    import '/root/bar.js'
    """
    assert t == expected


def test_comment():
    src = """
    /*
    Comment 1
    */
    // Comment 2
    /*
    Comment 3
    */
    import "foo";
    import "bar";
    function foo() {
    }
    """
    m = re.match(r'(\s*(/\*.*?\*/|//[^\r\n]*))*', src, flags=re.DOTALL)
    print(m.group())
    # index = 0
    # for m in re.finditer(r'(\s*(/\*.*?\*/|//[^\r\n]*))*', src, flags=re.DOTALL):
    #     print(m)
    #     index = m.end()
    #     print(m.group())
    end_of_comments = m.end()
    m = re.search(r'(function|const|let|var)\s', src[end_of_comments:], flags=re.DOTALL)
    print(m)
    imports = src[end_of_comments:end_of_comments + m.start()]
    is_import_section = re.match('\s*import\s', imports) is not None
    if is_import_section:
        pass


def test_process_imports():
    imports = {
        "gridchen/": "https://decatur.github.io/grid-chen/gridchen/"
    }

    src = """
/*
Comments...
*/

import 'gridchen/foo.js'
import * from 'gridchen/foo.js'
export * from 'gridchen/foo.js'

function foo() {}
    """
    expected = """
/*
Comments...
*/

import 'https://decatur.github.io/grid-chen/gridchen/foo.js'
import * from 'https://decatur.github.io/grid-chen/gridchen/foo.js'
export * from 'https://decatur.github.io/grid-chen/gridchen/foo.js'

function foo() {}
    """
    mapped, was_mapped = make.process_imports(src, imports)
    print(mapped)
    assert mapped == expected


test_process_imports()
