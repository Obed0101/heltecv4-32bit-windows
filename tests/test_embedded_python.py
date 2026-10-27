"""Run with: python3 -m unittest discover tests"""

import json
import os
import re
import unittest

REPO = os.path.join(os.path.dirname(__file__), "..")


def pinned_python_version():
    with open(os.path.join(REPO, "config", "sources.json"), encoding="utf-8") as handle:
        url = json.load(handle)["esptool"]["python"]["url"]
    major, minor, patch = re.search(r"python-(\d+)\.(\d+)\.(\d+)-embed-win32\.zip$", url).groups()
    return int(major), int(minor), int(patch)


class EmbeddedPythonTest(unittest.TestCase):
    def test_python_loads_extension_modules_on_windows_7_without_kb2533623(self):
        # Python 3.8+ passes LOAD_LIBRARY_SEARCH_* flags to LoadLibraryExW for every .pyd;
        # Windows 7 without KB2533623 rejects them and `import _ctypes` fails.
        self.assertLess(pinned_python_version()[:2], (3, 8))

    def test_pth_file_matches_the_pinned_python(self):
        major, minor, _ = pinned_python_version()
        pth = os.path.join(REPO, "overlay", "esptool", "python{}{}._pth".format(major, minor))
        with open(pth, encoding="utf-8") as handle:
            self.assertEqual(handle.readline().strip(), "python{}{}.zip".format(major, minor))


if __name__ == "__main__":
    unittest.main()
