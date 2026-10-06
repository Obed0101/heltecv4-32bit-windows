"""Run with: python3 -m unittest discover tests"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "overlay", "esptool"))

from esptool_cli import translate  # noqa: E402


class TranslateTest(unittest.TestCase):
    def test_upload_recipe_of_the_core_becomes_esptool_4_syntax(self):
        args = "--chip esp32s3 --port COM5 --baud 921600 --before default-reset --after hard-reset write-flash -e -z --flash-mode keep --flash-freq keep --flash-size keep 0x0 b.bin 0x10000 a.bin"
        expected = "--chip esp32s3 --port COM5 --baud 921600 --before default_reset --after hard_reset write_flash -e -z --flash_mode keep --flash_freq keep --flash_size keep 0x0 b.bin 0x10000 a.bin"
        self.assertEqual(translate(args.split()), expected.split())

    def test_elf2image_keeps_its_dashed_options(self):
        args = "--chip esp32s3 elf2image --flash-mode dio --flash-freq 80m --flash-size 4MB --elf-sha256-offset 0xb0 -o a.bin a.elf"
        expected = "--chip esp32s3 elf2image --flash_mode dio --flash_freq 80m --flash_size 4MB --elf-sha256-offset 0xb0 -o a.bin a.elf"
        self.assertEqual(translate(args.split()), expected.split())

    def test_pad_to_size_is_renamed_only_for_merge_bin(self):
        merged = translate("--chip esp32s3 merge-bin -o m.bin --pad-to-size 4MB 0x0 b.bin".split())
        self.assertEqual(merged, "--chip esp32s3 merge_bin -o m.bin --fill-flash-size 4MB 0x0 b.bin".split())
        image = translate("--chip esp32s3 elf2image --pad-to-size 4MB a.elf".split())
        self.assertIn("--pad-to-size", image)

    def test_file_names_that_look_like_commands_or_options_are_untouched(self):
        args = ["--chip", "esp32s3", "write-flash", "0x10000", "C:\\my-sketch\\write-flash.bin", "0x8000", "merge-bin"]
        self.assertEqual(translate(args)[3:], args[3:])

    def test_port_value_is_never_taken_as_the_command(self):
        self.assertEqual(translate(["--port", "erase-flash", "erase-flash"]), ["--port", "erase-flash", "erase_flash"])

    def test_equals_form_and_short_after_option(self):
        self.assertEqual(
            translate(["--before=default-reset", "-a", "no-reset", "write-flash", "--flash-mode=dio"]),
            ["--before=default_reset", "-a", "no_reset", "write_flash", "--flash_mode=dio"],
        )

    def test_esptool_4_spelling_passes_through_unchanged(self):
        args = "--chip esp32s3 --before default_reset write_flash --flash_mode keep 0x0 b.bin".split()
        self.assertEqual(translate(args), args)

    def test_no_command_and_unknown_command_are_left_for_esptool_to_report(self):
        self.assertEqual(translate(["--help"]), ["--help"])
        self.assertEqual(translate(["no-such-command", "--flash-mode", "dio"]), ["no-such-command", "--flash-mode", "dio"])


if __name__ == "__main__":
    unittest.main()
