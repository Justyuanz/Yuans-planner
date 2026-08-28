import unittest
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from openai_mascot import normalize_reply_from_text


class OpenAIMascotTests(unittest.TestCase):
    def test_normalize_reply_from_text_uses_first_line_as_answer(self) -> None:
        reply = normalize_reply_from_text(
            "Your morning block is too small.\nYou planned about 1h and used about 3h.\nMove the first serious task later."
        )

        self.assertEqual(reply["answer"], "Your morning block is too small.")
        self.assertEqual(
            reply["evidence"],
            [
                "You planned about 1h and used about 3h.",
                "Move the first serious task later.",
            ],
        )

    def test_normalize_reply_from_text_rejects_empty_reply(self) -> None:
        with self.assertRaises(ValueError):
            normalize_reply_from_text("   \n  ")


if __name__ == "__main__":
    unittest.main()
