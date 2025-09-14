import os
import shutil

def copy_folder(dst: str) -> str:
    """
    Copy the ./agent_runner folder (next to this script) to a destination.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    src = os.path.join(base_dir, "agent_runner")

    if not os.path.exists(src):
        raise FileNotFoundError(f"Source folder not found: {src}")

    # Ensure destination exists
    os.makedirs(dst, exist_ok=True)

    folder_name = os.path.basename(os.path.normpath(src))
    dst_path = os.path.join(dst, folder_name)

    if os.path.exists(dst_path):
        shutil.rmtree(dst_path)

    shutil.copytree(src, dst_path)

    return dst_path
