import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.asset_updater import run_update


def main() -> int:
    result = run_update(REPO_ROOT)
    print(
        "Updated assets",
        f"count={result['assets_count']}",
        f"updated_at={result['updated_at']}",
        sep=" | ",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
