#!/usr/bin/env python3
"""
add_license_header_safe.py
Tambahkan header lisensi ke file source tertentu, dengan pengecualian folder umum seperti node_modules/.git
Usage:
  python add_license_header_safe.py /path/to/repo --dry-run --backup --read-gitignore
"""

import os
import sys
import argparse
import fnmatch
import re

# ====== KONFIGURASI HEADER ======
HEADER_TEXT = """Sistem Absensi Proyek
Copyright (c) 2025 Ahmad Fauzan

Licensed for PERSONAL and INTERNAL USE ONLY.
Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.

For commercial licensing requests, please contact: [email@example.com]
"""

# Tanda unik untuk mendeteksi header yang sudah ada
HEADER_MARKER = "Licensed for PERSONAL and INTERNAL USE ONLY."

# Default ekstensi yang aman untuk diproses
DEFAULT_EXTS = (
    '.py', '.sh', '.rb', '.php', '.js', '.ts', '.jsx', '.tsx',
    '.html', '.htm', '.xml', '.css', '.scss', '.less',
    '.java', '.c', '.cpp', '.h', '.hpp', '.go', '.rs',
    '.yml', '.yaml', '.ini', '.cfg', '.ps1'
)

# Direktori yang biasa ingin dikecualikan
DEFAULT_EXCLUDE_DIRS = {
    'node_modules', '.git', '__pycache__', 'venv', '.venv',
    'build', 'dist', 'vendor', '.idea', '.vscode', 'env', 'site-packages'
}

# ====== UTIL ======
def is_binary_file(path, n=1024):
    try:
        with open(path, 'rb') as f:
            chunk = f.read(n)
            if b'\0' in chunk:
                return True
            # heuristic: many non-text bytes
            text_chars = bytearray({7,8,9,10,12,13,27} | set(range(0x20, 0x100)))
            if bool(chunk) and not all(c in text_chars for c in chunk):
                return True
    except Exception:
        return True
    return False

def read_file_text(path):
    # read as text, best-effort (utf-8 with replace)
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()

def write_file_text(path, text, backup=False):
    if backup:
        bak = path + '.bak'
        try:
            if not os.path.exists(bak):
                with open(bak, 'w', encoding='utf-8', errors='replace') as bf:
                    bf.write(read_file_text(path))
        except Exception as e:
            print(f"[WARN] gagal membuat backup untuk {path}: {e}")
    with open(path, 'w', encoding='utf-8', errors='replace') as f:
        f.write(text)

def load_gitignore_patterns(root):
    gitignore = os.path.join(root, '.gitignore')
    patterns = []
    if os.path.isfile(gitignore):
        with open(gitignore, 'r', encoding='utf-8', errors='ignore') as g:
            for line in g:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                # only take directory-like patterns (ending with '/') or simple names
                patterns.append(line)
    return patterns

def matches_gitignore(relpath, patterns):
    # simple matching using fnmatch against path and path components
    for p in patterns:
        # direct fnmatch
        if fnmatch.fnmatch(relpath, p) or fnmatch.fnmatch(os.path.basename(relpath), p):
            return True
        # if pattern ends with '/', check if path startswith that dir
        if p.endswith('/'):
            if relpath.startswith(p.rstrip('/')):
                return True
    return False

# ====== HEADER FORMAT ======
def make_commented_header(ext):
    lines = HEADER_TEXT.strip().splitlines()
    if ext in ('.py', '.sh', '.rb', '.yml', '.yaml', '.ini', '.cfg'):
        return '\n'.join('# ' + line for line in lines)
    if ext == '.ps1':
        return '<#\n' + '\n'.join('  ' + line for line in lines) + '\n#>'
    if ext in ('.html', '.htm', '.xml'):
        return '<!--\n' + '\n'.join('  ' + line for line in lines) + '\n-->'
    # default: C-style block
    return '/*\n' + '\n'.join(' * ' + line for line in lines) + '\n */'

def insert_header_into_content(content, header_commented, ext):
    # preserve shebang for scripts
    if content.startswith('#!'):
        first_nl = content.find('\n')
        if first_nl == -1:
            return content + '\n' + header_commented + '\n'
        return content[:first_nl+1] + header_commented + '\n\n' + content[first_nl+1:]

    # PHP: insert after opening <?php tag to avoid sending output
    if ext == '.php':
        m = re.match(r'^\s*<\?php\b', content)
        if m:
            end = m.end()
            # if there's a newline right after tag, insert after it; else add newline
            if end < len(content) and content[end] == '\n':
                insert_pos = end + 1
            else:
                insert_pos = end
            return content[:insert_pos] + header_commented + '\n\n' + content[insert_pos:]
    # HTML/XML: insert after XML declaration or DOCTYPE if present
    if ext in ('.html', '.htm', '.xml'):
        stripped = content.lstrip()
        leading_ws_len = len(content) - len(stripped)
        if stripped.lower().startswith('<?xml'):
            idx = stripped.find('?>')
            if idx != -1:
                pos = leading_ws_len + idx + 2
                if pos < len(content) and content[pos] == '\n':
                    pos += 1
                return content[:pos] + header_commented + '\n\n' + content[pos:]
        if stripped.lower().startswith('<!doctype'):
            idx = stripped.find('>')
            if idx != -1:
                pos = leading_ws_len + idx + 1
                if pos < len(content) and content[pos] == '\n':
                    pos += 1
                return content[:pos] + header_commented + '\n\n' + content[pos:]
    # default: put on top
    return header_commented + '\n\n' + content

# ====== MAIN PROCESS ======
def process_directory(target, exts, exclude_dirs, dry_run=False, backup=False, read_gitignore=False):
    gitignore_patterns = load_gitignore_patterns(target) if read_gitignore else []
    modified = []
    skipped = []

    for root, dirs, files in os.walk(target):
        # modify dirs in-place to skip traversal into excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not matches_gitignore(os.path.relpath(os.path.join(root, d), target), gitignore_patterns)]
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in exts:
                continue
            relpath = os.path.relpath(os.path.join(root, fname), target)
            # skip if matches gitignore patterns for files
            if gitignore_patterns and matches_gitignore(relpath, gitignore_patterns):
                skipped.append((relpath, 'gitignore'))
                continue
            fpath = os.path.join(root, fname)
            if is_binary_file(fpath):
                skipped.append((relpath, 'binary'))
                continue
            try:
                content = read_file_text(fpath)
            except Exception as e:
                skipped.append((relpath, f'read-error:{e}'))
                continue
            # check existing marker near top
            head_sample = content[:4000]
            if HEADER_MARKER in head_sample:
                skipped.append((relpath, 'already-has-header'))
                continue
            # create commented header
            header_commented = make_commented_header(ext)
            new_content = insert_header_into_content(content, header_commented, ext)
            if new_content == content:
                skipped.append((relpath, 'no-change'))
                continue
            if dry_run:
                modified.append(relpath)
            else:
                try:
                    write_file_text(fpath, new_content, backup=backup)
                    modified.append(relpath)
                except Exception as e:
                    skipped.append((relpath, f'write-error:{e}'))

    return modified, skipped

def main():
    parser = argparse.ArgumentParser(description="Add license header to source files (safe mode).")
    parser.add_argument('target', help='Path to project folder')
    parser.add_argument('--exts', help='Comma-separated extensions to process (e.g. .py,.js)', default=','.join(DEFAULT_EXTS))
    parser.add_argument('--exclude-dirs', help='Comma-separated dir names to exclude', default=','.join(DEFAULT_EXCLUDE_DIRS))
    parser.add_argument('--dry-run', action='store_true', help='Show files that would be modified without changing them')
    parser.add_argument('--backup', action='store_true', help='Create .bak backup for modified files')
    parser.add_argument('--read-gitignore', action='store_true', help='Respect .gitignore (simple matching)')
    args = parser.parse_args()

    target = os.path.abspath(args.target)
    if not os.path.isdir(target):
        print(f"Folder tidak ditemukan: {target}")
        sys.exit(1)

    exts = tuple(e.strip().lower() if e.strip().startswith('.') else f".{e.strip().lower()}" for e in args.exts.split(',') if e.strip())
    exclude_dirs = set(d.strip() for d in args.exclude_dirs.split(',') if d.strip())

    print(f"Target: {target}")
    print(f"Extensions: {exts}")
    print(f"Exclude dirs: {exclude_dirs}")
    print(f"Read .gitignore: {args.read_gitignore}")
    print(f"Dry run: {args.dry_run}")
    print(f"Backup: {args.backup}")
    print("---- scanning ...")

    modified, skipped = process_directory(target, exts, exclude_dirs, dry_run=args.dry_run, backup=args.backup, read_gitignore=args.read_gitignore)

    print("\n=== Summary ===")
    print(f"Files to be modified / modified: {len(modified)}")
    for m in modified[:200]:
        print("  *", m)
    if skipped:
        print(f"\nFiles skipped: {len(skipped)} (reason shown for first 200)")
        for s, reason in skipped[:200]:
            print("  -", s, "->", reason)
    print("\nSelesai.")
    if args.dry_run and modified:
        print("\nCatatan: jalankan tanpa --dry-run untuk menerapkan perubahan.")

if __name__ == "__main__":
    main()
