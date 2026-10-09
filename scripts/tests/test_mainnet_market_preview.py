"""Mainnet preview regression tests. Network and Stellar commands are stubbed."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]


class MainnetMarketPreviewTests(unittest.TestCase):
    def test_preview_displays_all_markets_and_cancels_before_transactions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            scripts = root / "scripts"
            scripts.mkdir()
            shutil.copy2(ROOT / "scripts/create-mainnet-markets.sh", scripts)
            shutil.copy2(ROOT / "scripts/mainnet-markets.json", scripts)
            (root / "deploy-mainnet-output.json").write_text(
                json.dumps({"contracts": {"market": "FAKE_MARKET"}, "deployer": "FAKE_DEPLOYER"}),
                encoding="utf-8",
            )

            fake_bin = root / "bin"
            fake_bin.mkdir()
            mocks = {
                "curl": "#!/bin/sh\nprintf '%s\\n' '{\"balances\":[{\"asset_type\":\"native\",\"balance\":\"100\"}]}'\n",
                "stellar": "#!/bin/sh\necho 'unexpected stellar invocation' >&2\nexit 99\n",
            }
            for name, body in mocks.items():
                executable = fake_bin / name
                executable.write_text(body, encoding="utf-8")
                executable.chmod(0o755)

            env = os.environ.copy()
            env["PATH"] = f"{fake_bin}{os.pathsep}{env['PATH']}"
            result = subprocess.run(
                ["bash", str(scripts / "create-mainnet-markets.sh")],
                input="cancel\n",
                text=True,
                capture_output=True,
                env=env,
                timeout=15,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(result.stdout.count("Resolves:"), 7)
            self.assertIn("Cancelled.", result.stdout)
            self.assertNotIn("KeyError", result.stderr)


if __name__ == "__main__":
    unittest.main()
