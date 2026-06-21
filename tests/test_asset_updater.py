import unittest
from pathlib import Path

from scripts.asset_updater import aggregate_lines, classify_status, load_config, validate_assets_config


class AssetUpdaterTests(unittest.TestCase):
    def test_classification_threshold(self):
        self.assertEqual(classify_status(0.10, 0.15), "neutral")
        self.assertEqual(classify_status(0.16, 0.15), "up")
        self.assertEqual(classify_status(-0.20, 0.15), "down")
        self.assertEqual(classify_status(None, 0.15), "neutral")

    def test_aggregate_shape(self):
        payload = aggregate_lines(
            [
                {"status": "up", "line_memberships": ["blue", "green"]},
                {"status": "down", "line_memberships": ["blue", "red"]},
                {"status": "neutral", "line_memberships": ["red"]},
            ]
        )
        self.assertIn("line_values", payload)
        self.assertIn("line_status_counts", payload)
        self.assertEqual(set(payload["line_values"].keys()), {"blue", "red", "green", "gray"})
        self.assertEqual(payload["line_values"]["gray"], 1)

    def test_config_integrity(self):
        config_path = Path(__file__).resolve().parents[1] / "config" / "assets.json"
        config = load_config(config_path)
        errors = validate_assets_config(config)
        self.assertEqual(errors, [], msg=f"Config errors: {errors}")


if __name__ == "__main__":
    unittest.main()
