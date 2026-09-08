import os
import sys
import json
import hashlib
import zipfile

VERSION = "1.0.0"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_FILENAME = f"safety_model_bundle_v{VERSION}.zip"
REQUIRED = [
    "standalone_inference.py",
    "engine.py",
    "test_models.py",
    "expected_results.json",
    "requirements_standalone.txt",
    "verify_bundle.py",
    "README_MODEL.md"
]

def compute_sha256(filepath):
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def package():
    print(f"Packaging safety_model_bundle v{VERSION}...")
    manifest = {"version": VERSION, "files": {}}
    zip_path = os.path.join(BASE_DIR, ZIP_FILENAME)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname in REQUIRED:
            fpath = os.path.join(BASE_DIR, fname)
            if os.path.isfile(fpath):
                manifest["files"][fname] = compute_sha256(fpath)
                zf.write(fpath, arcname=fname)
                print(f"  ✓ Added: {fname}")
            else:
                print(f"  ⚠️ Warning: {fname} not found!")
        m_path = os.path.join(BASE_DIR, "MANIFEST.json")
        with open(m_path, "w") as f:
            json.dump(manifest, f, indent=2)
        zf.write(m_path, arcname="MANIFEST.json")
    print(f"\n🎉 Package created: {ZIP_FILENAME} ({round(os.path.getsize(zip_path)/(1024*1024), 2)} MB)")

if __name__ == "__main__":
    package()
