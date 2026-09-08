import os
import sys
import json
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(BASE_DIR, "MANIFEST.json")

def compute_sha256(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def verify_manifest(manifest_file: str = MANIFEST_PATH) -> bool:
    print("=======================================================")
    print("      DISTRIBUTION BUNDLE INTEGRITY CHECK              ")
    print("=======================================================")
    if not os.path.isfile(manifest_file):
        sys.stderr.write(f"[ERROR] MANIFEST.json not found in: {manifest_file}\n")
        return False
    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    print(f"Package Version: {manifest.get('version', '1.0.0')}")
    print("-------------------------------------------------------")
    files = manifest.get("files", {})
    all_valid = True
    for rel_path, expected_hash in files.items():
        full_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.isfile(full_path):
            print(f"  ❌ MISSING: {rel_path}")
            all_valid = False
            continue
        actual_hash = compute_sha256(full_path)
        if actual_hash == expected_hash:
            print(f"  ✅ VERIFIED: {rel_path}")
        else:
            print(f"  ❌ CHECKSUM MISMATCH: {rel_path}")
            all_valid = False
    print("-------------------------------------------------------")
    if all_valid:
        print("🎉 ALL FILES VERIFIED! Bundle integrity confirmed.")
    else:
        print("⚠️ INTEGRITY CHECK FAILED. Files modified or missing.")
    print("=======================================================\n")
    return all_valid

if __name__ == "__main__":
    success = verify_manifest()
    sys.exit(0 if success else 1)
