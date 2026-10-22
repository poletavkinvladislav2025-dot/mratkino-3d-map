"""Run Blender with a bounded CPU budget and preserve its exit code."""
import subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
subprocess.run(['blender','-b','--threads','4','--python',str(root/'scripts/build_scene.py'),'--','--root',str(root),'--resolution','1200'],cwd=root,check=True)
