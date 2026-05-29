import re

db = open('db.txt').read().splitlines()

HARD_TEXT = "궭뷁쉛뤒"

def minify(code):

    code = code.replace(' ' * 4, HARD_TEXT)

    for a in db:
        code = code.replace(' ' + a + ' ', a)
        code = code.replace(a + ' ', a)
        code = code.replace(' ' + a, a)

    code = re.sub(
        r'//.*?$|/\*[\s\S]*?\*/',
        '',
        code,
        flags=re.MULTILINE
    )

    code = re.sub(r'\n\s*\n', '\n', code)

    code = code.replace(HARD_TEXT, ' ' * 4)

    return code