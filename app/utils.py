"""Utility helpers."""


def parse_hex_color(s):
    """Return valid #RRGGBB or None."""
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    if len(s) == 7 and s[0] == "#":
        try:
            int(s[1:], 16)
            return s
        except ValueError:
            pass
    return None
