import json
from pathlib import Path
from pydantic import ValidationError

from .agent_models import AgentSystemConfig
from .agent_runtime import AgentRuntime


def load_json_file(agent_name: str) -> dict:
    """Load a single JSON file from ./agents directory that matches agent_name (without .json)."""
    base_path = Path(__file__).parent.parent / "agents"
    if not base_path.exists():
        raise FileNotFoundError(f"'agents' directory does not exist in {Path.cwd()}")

    file_path = base_path / f"{agent_name}.json"
    if not file_path.exists():
        raise FileNotFoundError(f"No JSON file found at {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in {file_path}: {e}")


def build_agent(agent_name: str) -> AgentRuntime:
    """Build and return an AgentRuntime instance from the config."""
    config = load_json_file(agent_name)
    try:
        validated = AgentSystemConfig(**config)
    except ValidationError as e:
        print("Validation error:", e)
        raise
    return AgentRuntime(validated)
