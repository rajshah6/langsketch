from fastapi import FastAPI
from send_files import copy_folder

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/copy-agent-runner")
def copy_agent_runner(destination: str):
    """
    Endpoint to copy the ./agent_runner folder to a specified destination.
    """
    try:
        dst_path = copy_folder(destination)
        return {"status": "success", "message": f"Folder copied to {dst_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
