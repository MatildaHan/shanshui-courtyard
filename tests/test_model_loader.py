"""Run the native streaming/decompression regression checks with bundled Node."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ModelLoaderTests(unittest.TestCase):
    def test_streaming_and_failures(self):
        result = subprocess.run(['node', '--test', str(ROOT / 'tests/model-loader.test.mjs')],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
