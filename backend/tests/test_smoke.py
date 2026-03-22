import unittest

from config import _parse_cors_origins


class SmokeTests(unittest.TestCase):
    def test_parse_cors_origins_normalizes_values(self) -> None:
        raw = " http://localhost:3000/ , 'https://example.com' "
        parsed = _parse_cors_origins(raw)
        self.assertEqual(parsed, ["http://localhost:3000", "https://example.com"])


if __name__ == "__main__":
    unittest.main()
