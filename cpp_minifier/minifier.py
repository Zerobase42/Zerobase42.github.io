import re

db=open("db.txt").read().split()
HARD_TEXT="궭뷁_그누구도모를단어_쉛뤒"

def minify(code):
    code=code.replace(' '*4,HARD_TEXT)

    for a in db:
        code = code.replace(' ' + a + ' ', a)
        code = code.replace(a + ' ', a)
        code = code.replace(' ' + a, a)
    
    code=re.sub(r'//.*?$|/\*[\s\S]*?\*/','',code,flags=re.MULTILINE)
    code=code.replace(HARD_TEXT,' '*4).replace('\n\n','\n')
    code=code.replace("'\\n'","10")
    
    return code