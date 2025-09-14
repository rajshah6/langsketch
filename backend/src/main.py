from .send_files import copy_folder
from databricks.vector_search.index import VectorSearchIndex
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from langchain.text_splitter import RecursiveCharacterTextSplitter
from PyPDF2 import PdfReader
import json
from pathlib import Path
import uuid

current_dir = Path(__file__).resolve().parent

config_path = current_dir / ".langsketch-credentials.json"

# Load the JSON
with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

WORKSPACE_URL = None
PERSONAL_TOKEN = None

databricks_creds = config.get("databricksCredentials", [])
if databricks_creds:
    creds = databricks_creds[0] 
    WORKSPACE_URL = creds.get("workspaceUrl")
    PERSONAL_TOKEN = creds.get("personalToken")

if WORKSPACE_URL and PERSONAL_TOKEN:
    client = VectorSearchIndex(
        workspace_url=WORKSPACE_URL,
        personal_access_token=PERSONAL_TOKEN
    )
else:
    raise ValueError("Databricks credentials not found in JSON.")


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
    
@app.post("/upload-docs")
async def upload_and_chunk(file: UploadFile = File(...)):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""],
    )
    content = ""

    # Handle PDF files
    if file.filename.endswith(".pdf"):
        pdf_reader = PdfReader(file.file)
        for page in pdf_reader.pages:
            content += page.extract_text() or ""

    # Handle Markdown or plain text files
    elif file.filename.endswith(".md") or file.content_type.startswith("text/"):
        content = (await file.read()).decode("utf-8")

    else:
        return JSONResponse(
            status_code=400,
            content={"error": "Unsupported file type"}
        )

    # Split into chunks
    chunks = splitter.split_text(content)

    # Prepare upsert payload
    docs = []
    for chunk in chunks:
        docs.append({
            "id": str(uuid.uuid4()),   # unique id for each chunk
            "text": chunk              
        })

    client.upsert(docs)

    return {"status": "success", "chunks_upserted": len(docs)}
