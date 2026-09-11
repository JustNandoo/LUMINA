"""Utilitas untuk mengeksekusi sel notebook Jupyter secara headless."""

import os
import sys
import json
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr
from IPython.core.interactiveshell import InteractiveShell

if len(sys.argv) > 1:
    notebook_path = os.path.abspath(sys.argv[1])
else:
    notebook_path = os.path.join(os.path.dirname(__file__), "..", "notebooks", "MAPID_Lumina_Spatial_XGBoost_Production.ipynb")

with open(notebook_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

print(f"[INFO] Mengeksekusi {len(nb['cells'])} sel pada {os.path.basename(notebook_path)}...")

shell = InteractiveShell.instance()

execution_count = 1
for i, cell in enumerate(nb["cells"]):
    if cell["cell_type"] == "code":
        code = "".join(cell["source"])
        
        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        cell_outputs = []
        
        with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
            res = shell.run_cell(code)
        
        out_txt = stdout_buf.getvalue()
        err_txt = stderr_buf.getvalue()
        
        if out_txt:
            cell_outputs.append({
                "output_type": "stream",
                "name": "stdout",
                "text": [line + "\n" for line in out_txt.splitlines()]
            })
        if err_txt:
            cell_outputs.append({
                "output_type": "stream",
                "name": "stderr",
                "text": [line + "\n" for line in err_txt.splitlines()]
            })
        if not res.success and res.error_in_exec:
            e = res.error_in_exec
            err_msg = traceback.format_exc()
            print(f"[ERROR pada Sel {i}]: {e}")
            cell_outputs.append({
                "output_type": "error",
                "ename": type(e).__name__,
                "evalue": str(e),
                "traceback": [line + "\n" for line in err_msg.splitlines()]
            })
            
        cell["execution_count"] = execution_count
        cell["outputs"] = cell_outputs
        execution_count += 1

with open(notebook_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2)

print("[INFO] Seluruh sel notebook selesai dieksekusi dengan aman.")
