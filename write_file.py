import sys
file_path = sys.argv[1]
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(sys.stdin.read())
