import io
import json
import sys

ROOT = 'F:/创想/game-creator'
changed = []


def edit(path, old, new):
    p = f'{ROOT}/{path}'
    s = io.open(p, encoding='utf-8').read()
    if new in s:
        return
    if old not in s:
        print(f'MISSING anchor in {path}: {old[:80]!r}')
        sys.exit(1)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s.replace(old, new, 1))
    changed.append(path)


pub = io.open(f'{ROOT}/.keys/cobble.key.pub', encoding='utf-8').read().strip()

# ── tauri config: updater plugin + signed artifacts ─────────────
p = f'{ROOT}/apps/desktop/src-tauri/tauri.conf.json'
conf = json.load(io.open(p, encoding='utf-8'))
conf['bundle']['createUpdaterArtifacts'] = True
conf['plugins'] = {
    'updater': {
        'pubkey': pub,
        'endpoints': ['https://ongikan.github.io/cobble/updater.json'],
    }
}
io.open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(conf, ensure_ascii=False, indent=2) + '\n')
changed.append('apps/desktop/src-tauri/tauri.conf.json')

# ── Rust deps + plugin registration ────────────────────────────
edit('apps/desktop/src-tauri/Cargo.toml',
     "[dependencies]\ntauri = { version = \"2\", features = [] }",
     "[dependencies]\ntauri = { version = \"2\", features = [] }\ntauri-plugin-updater = \"2\"\ntauri-plugin-process = \"2\"")

edit('apps/desktop/src-tauri/src/main.rs',
     "fn main() {\n    tauri::Builder::default()\n        .invoke_handler(tauri::generate_handler![",
     "fn main() {\n    tauri::Builder::default()\n        .plugin(tauri_plugin_updater::Builder::new().build())\n        .plugin(tauri_plugin_process::init())\n        .invoke_handler(tauri::generate_handler![")

# ── capabilities（插件权限） ────────────────────────────────────
caps = {
    "$schema": "../gen/schemas/desktop-schema.json",
    "identifier": "default",
    "description": "Cobble Studio default capabilities",
    "windows": ["main"],
    "permissions": ["core:default", "updater:default", "process:default"],
}
io.open(f'{ROOT}/apps/desktop/src-tauri/capabilities/default.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(caps, ensure_ascii=False, indent=2) + '\n')
changed.append('apps/desktop/src-tauri/capabilities/default.json')

# ── gitignore .keys ────────────────────────────────────────────
edit('.gitignore', 'dist-release/\n', 'dist-release/\n.keys/\n')

# ── editor deps ────────────────────────────────────────────────
p = f'{ROOT}/apps/editor/package.json'
pkg = json.load(io.open(p, encoding='utf-8'))
pkg['dependencies']['@tauri-apps/plugin-process'] = '^2'
pkg['dependencies']['@tauri-apps/plugin-updater'] = '^2'
io.open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')
changed.append('apps/editor/package.json')

print('updater infra patched:', len(changed))
