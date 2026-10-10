"""Build a deterministic Chrome Store ZIP using Python's standard library."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
manifest = json.loads((DIST / "manifest.json").read_text())
version = json.loads((ROOT / "package.json").read_text())["version"]
if manifest["version"] != version:
    raise RuntimeError("Package and manifest versions differ")
files = sorted(path.name for path in DIST.iterdir() if path.is_file())
declared = list(manifest["icons"].values())
for script in manifest["content_scripts"]:
    declared += script["js"] + script["css"]
for name in declared:
    if name not in files:
        raise RuntimeError(f"Missing manifest file: {name}")
if set(files) & {"background.js", "bridge.js"}:
    raise RuntimeError("Obsolete permission/proxy code in build")
archive = ROOT / "extension.zip"
with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as package:
    for name in files:
        info = ZipInfo(name, (2000, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        package.writestr(info, (DIST / name).read_bytes(), compresslevel=9)
with ZipFile(archive) as package:
    if package.testzip() is not None:
        raise RuntimeError("Package CRC verification failed")
    for name in files:
        if package.read(name) != (DIST / name).read_bytes():
            raise RuntimeError(f"Archive bytes differ: {name}")
content = archive.read_bytes()
print(json.dumps({"version": version, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(), "files": files}))
