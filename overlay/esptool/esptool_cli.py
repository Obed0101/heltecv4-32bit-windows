"""Run esptool 4.8.1 with the command line that the Heltec core writes for esptool 5.

The core's platform.txt uses the esptool 5 spelling (write-flash, --flash-mode,
default-reset). esptool 5 needs Python 3.10, which does not run on Windows 7, so
this package ships esptool 4.8.1 on Python 3.8 and translates the spelling here.
"""

import os
import sys

COMMANDS = {
    "write-flash": "write_flash",
    "erase-flash": "erase_flash",
    "erase-region": "erase_region",
    "read-flash": "read_flash",
    "verify-flash": "verify_flash",
    "merge-bin": "merge_bin",
    "image-info": "image_info",
    "flash-id": "flash_id",
    "chip-id": "chip_id",
    "read-mac": "read_mac",
    "load-ram": "load_ram",
    "dump-mem": "dump_mem",
    "read-mem": "read_mem",
    "write-mem": "write_mem",
    "make-image": "make_image",
    "read-flash-status": "read_flash_status",
    "write-flash-status": "write_flash_status",
    "read-flash-sfdp": "read_flash_sfdp",
    "get-security-info": "get_security_info",
}
LEGACY_COMMANDS = set(COMMANDS.values()) | {"elf2image", "run", "version"}

OPTIONS = {
    "--flash-mode": "--flash_mode",
    "--flash-freq": "--flash_freq",
    "--flash-size": "--flash_size",
    "--use-segments": "--use_segments",
}
OPTIONS_BY_COMMAND = {"merge_bin": {"--pad-to-size": "--fill-flash-size"}}

# Global options whose value is a keyword that esptool 5 spells with dashes.
KEYWORD_OPTIONS = ("--before", "--after", "-a")
# Global options that consume the next argument, so it is never the command.
GLOBAL_VALUE_OPTIONS = KEYWORD_OPTIONS + (
    "--chip",
    "-c",
    "--port",
    "-p",
    "--baud",
    "-b",
    "--port-filter",
    "--stub-version",
    "--override-vddsdio",
    "--connect-attempts",
    "--spi-connection",
)


def _split(arg):
    name, sep, value = arg.partition("=")
    return name, sep, value


def _translate_global(args):
    """Translate everything before the command and return (translated, command index)."""
    out = []
    index = 0
    while index < len(args):
        arg = args[index]
        name, sep, value = _split(arg)
        if name in KEYWORD_OPTIONS and sep:
            out.append(name + sep + value.replace("-", "_"))
        elif arg in KEYWORD_OPTIONS and index + 1 < len(args):
            out.extend([arg, args[index + 1].replace("-", "_")])
            index += 1
        elif arg in GLOBAL_VALUE_OPTIONS and index + 1 < len(args):
            out.extend([arg, args[index + 1]])
            index += 1
        elif not arg.startswith("-"):
            return out, index
        else:
            out.append(arg)
        index += 1
    return out, index


def translate(args):
    """Return the esptool 4.8.1 arguments equivalent to esptool 5 `args`."""
    out, command_index = _translate_global(args)
    if command_index >= len(args):
        return out
    command = COMMANDS.get(args[command_index], args[command_index])
    out.append(command)
    if command not in LEGACY_COMMANDS:
        return out + args[command_index + 1 :]
    options = dict(OPTIONS)
    options.update(OPTIONS_BY_COMMAND.get(command, {}))
    for arg in args[command_index + 1 :]:
        name, sep, value = _split(arg)
        out.append(options[name] + sep + value if name in options else arg)
    return out


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(here, "Lib", "site-packages"))
    import esptool

    sys.argv[1:] = translate(sys.argv[1:])
    esptool._main()


if __name__ == "__main__":
    main()
