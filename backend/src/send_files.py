import os
import shutil

def copy_folder(dst: str) -> str:
    """
    Copy the ./agent_runner folder (next to this script) to a destination,
    and also copy requirements.txt to the parent of that folder.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    src = os.path.join(base_dir, "agent_runner")
    requirements_src = os.path.join(base_dir, "requirements.txt")

    if not os.path.exists(src):
        raise FileNotFoundError(f"Source folder not found: {src}")

    # Ensure destination exists
    os.makedirs(dst, exist_ok=True)

    folder_name = os.path.basename(os.path.normpath(src))
    dst_path = os.path.join(dst, folder_name)

    # Remove existing agent_runner if present
    if os.path.exists(dst_path):
        shutil.rmtree(dst_path)

    shutil.copytree(src, dst_path)

    # Copy requirements.txt one level above agent_runner
    if os.path.exists(requirements_src):
        requirements_dst = os.path.join(dst, "requirements.txt")
        shutil.copy(requirements_src, requirements_dst)

    return dst_path
