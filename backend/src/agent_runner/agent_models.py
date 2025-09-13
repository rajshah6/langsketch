from typing import List, Dict, Optional, Literal, Any
from pydantic import BaseModel, Field, field_validator

class FieldConfig(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True  
    default: Optional[Any] = None 

class InputConfig(BaseModel):
    is_array: bool = False
    fields: List[FieldConfig]

class OutputConfig(BaseModel):
    fields: List[FieldConfig]

class AgentConfig(BaseModel):
    name: str
    description: str
    color: Optional[str] = None
    input: InputConfig
    output: OutputConfig

class RAGConfig(BaseModel):
    provider: Literal["databricks"] = "databricks"
    index_name: str
    description: str
    embedding_model: Literal["databricks-bge-small"] = "databricks-bge-small"
    embedding_endpoint: str = "databricks-bge-small"
    chunk_size: Literal[500] = 500
    top_k: Literal[5] = 5

class ToolInputConfig(BaseModel):
    fields: List[FieldConfig]

class ToolOutputConfig(BaseModel):
    is_array: bool = False
    fields: List[FieldConfig]

class ToolConfig(BaseModel):
    name: str
    description: str
    inputs: ToolInputConfig
    output: ToolOutputConfig
    code_path: str
    function_name: str

class AuthConfig(BaseModel):
    type: Literal["api-key", "none"]
    in_: Optional[Literal["header", "query"]] = Field(None, alias="in")
    field: str
    api_key: Optional[str] = None
    
    @field_validator('api_key')
    @classmethod
    def validate_api_key_based_on_type(cls, v, info):
        if hasattr(info, 'data') and info.data:
            auth_type = info.data.get('type')
            if auth_type == "api-key" and not v:
                raise ValueError("api_key is required when type is 'api-key'")
            elif auth_type == "none" and v:
                raise ValueError("api_key should not be provided when type is 'none'")
        return v

class APIExampleConfig(BaseModel):
    """Handles the example usage field in APIs"""
    usage: Optional[str] = None

class APIConfig(BaseModel):
    name: str
    url: str
    method: Literal["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    headers: Optional[Dict[str, str]] = None
    queries: Optional[Dict[str, str]] = None
    auth: AuthConfig
    description: str
    example: Optional[APIExampleConfig] = None

class ScrapingConfig(BaseModel):
    name: str
    url: str
    description: str

class AgentSystemConfig(BaseModel):
    """Complete agent system configuration"""
    agent: AgentConfig
    rag: Optional[RAGConfig] = None 
    tools: List[ToolConfig] = None
    utilities: List[Literal[
        "regex_extract", "calculator", "date_parser", "string_ops",
        "json_parser", "unit_converter", "text_summary", "number_stats",
        "list_ops", "url_parser"
    ]]
    apis: List[APIConfig]
    scraping: List[ScrapingConfig]

    class Config:
        populate_by_name = True
        validate_assignment = True
