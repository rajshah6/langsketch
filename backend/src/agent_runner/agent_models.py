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

    def generate_router_description(self) -> str:
        """
        Generates a comprehensive description of the agent for LLM routing purposes.
        This description helps an LLM router determine which model is best suited
        for handling tasks related to this agent's capabilities.
        """
        description_parts = []
        
        # Agent overview
        description_parts.append(f"AGENT: {self.agent.name}")
        description_parts.append(f"Purpose: {self.agent.description}")
        description_parts.append("")
        
        # Input/Output capabilities
        description_parts.append("INPUT CAPABILITIES:")
        if self.agent.input.is_array:
            description_parts.append("- Processes arrays/batches of inputs")
        
        for field in self.agent.input.fields:
            req_status = "required" if field.required else "optional"
            default_info = f" (default: {field.default})" if field.default is not None else ""
            description_parts.append(f"- {field.name} ({field.type}, {req_status}): {field.description}{default_info}")
        
        description_parts.append("")
        description_parts.append("OUTPUT CAPABILITIES:")
        if self.agent.output.fields:
            for field in self.agent.output.fields:
                description_parts.append(f"- {field.name} ({field.type}): {field.description}")
        
        # Knowledge base / RAG capabilities
        if self.rag:
            description_parts.append("")
            description_parts.append("KNOWLEDGE BASE ACCESS:")
            description_parts.append(f"- Has access to indexed knowledge: {self.rag.description}")
            description_parts.append(f"- Search index: {self.rag.index_name}")
            description_parts.append(f"- Retrieves top {self.rag.top_k} most relevant chunks of {self.rag.chunk_size} characters")
            description_parts.append("- Can answer questions based on proprietary or specialized knowledge")
        
        # Tool capabilities
        if self.tools:
            description_parts.append("")
            description_parts.append("CUSTOM TOOL CAPABILITIES:")
            for tool in self.tools:
                description_parts.append(f"- {tool.name}: {tool.description}")
                
                # Tool inputs
                if tool.inputs.fields:
                    input_types = [f"{field.name} ({field.type})" for field in tool.inputs.fields]
                    description_parts.append(f"  Inputs: {', '.join(input_types)}")
                
                # Tool outputs
                if tool.output.fields:
                    if tool.output.is_array:
                        description_parts.append("  Returns: Array of results with fields:")
                        for field in tool.output.fields:
                            description_parts.append(f"    - {field.name} ({field.type}): {field.description}")
                    else:
                        output_types = [f"{field.name} ({field.type})" for field in tool.output.fields]
                        description_parts.append(f"  Returns: {', '.join(output_types)}")
        
        # Utility capabilities
        if self.utilities:
            description_parts.append("")
            description_parts.append("BUILT-IN UTILITY CAPABILITIES:")
            
            utility_descriptions = {
                "regex_extract": "Extract patterns from text using regular expressions",
                "calculator": "Perform mathematical calculations and computations", 
                "date_parser": "Parse, format, and manipulate dates and times",
                "string_ops": "Advanced string manipulation and text processing",
                "json_parser": "Parse, validate, and manipulate JSON data structures",
                "unit_converter": "Convert between different units of measurement",
                "text_summary": "Generate summaries and extract key information from text",
                "number_stats": "Calculate statistics and analyze numerical data",
                "list_ops": "Advanced list/array operations and data manipulation",
                "url_parser": "Parse and extract components from URLs"
            }
            
            for utility in self.utilities:
                if utility in utility_descriptions:
                    description_parts.append(f"- {utility}: {utility_descriptions[utility]}")
        
        # API integration capabilities
        if self.apis:
            description_parts.append("")
            description_parts.append("EXTERNAL API INTEGRATIONS:")
            for api in self.apis:
                auth_info = "authenticated" if api.auth.type == "api-key" else "public"
                description_parts.append(f"- {api.name} ({api.method} {auth_info}): {api.description}")
                if api.example and api.example.usage:
                    description_parts.append(f"  Usage: {api.example.usage}")
        
        # Web scraping capabilities  
        if self.scraping:
            description_parts.append("")
            description_parts.append("WEB SCRAPING CAPABILITIES:")
            for scrape in self.scraping:
                description_parts.append(f"- {scrape.name}: {scrape.description}")
                description_parts.append(f"  Source: {scrape.url}")
        
        # Task complexity assessment
        description_parts.append("")
        description_parts.append("TASK COMPLEXITY INDICATORS:")
        complexity_factors = []
        
        if self.rag:
            complexity_factors.append("Knowledge retrieval and synthesis")
        
        if self.tools and len(self.tools) > 0:
            complexity_factors.append(f"Custom tool orchestration ({len(self.tools)} tools)")
        
        if self.apis and len(self.apis) > 0:
            complexity_factors.append(f"External API integration ({len(self.apis)} APIs)")
        
        if self.scraping and len(self.scraping) > 0:
            complexity_factors.append(f"Web data extraction ({len(self.scraping)} sources)")
        
        if self.utilities and len(self.utilities) > 3:
            complexity_factors.append("Multi-utility data processing")
        
        # Assess input/output complexity
        input_field_count = len(self.agent.input.fields)
        output_field_count = len(self.agent.output.fields)
        
        if input_field_count > 3 or output_field_count > 3:
            complexity_factors.append("Complex structured I/O")
        
        if self.agent.input.is_array:
            complexity_factors.append("Batch processing")
        
        for factor in complexity_factors:
            description_parts.append(f"- {factor}")
        
        # Model selection guidance
        description_parts.append("")
        description_parts.append("RECOMMENDED MODEL CHARACTERISTICS:")
        recommendations = []
        
        if self.rag or (self.tools and len(self.tools) > 2) or (self.apis and len(self.apis) > 2):
            recommendations.append("High reasoning capability for complex multi-step workflows")
        
        if self.scraping or (self.apis and any(api.method in ["POST", "PUT", "PATCH"] for api in self.apis)):
            recommendations.append("Strong instruction following for external integrations")
        
        if any(utility in ["calculator", "number_stats", "json_parser"] for utility in self.utilities):
            recommendations.append("Reliable structured data processing")
        
        if self.rag:
            recommendations.append("Good context utilization for knowledge synthesis")
        
        if input_field_count > 5 or output_field_count > 5:
            recommendations.append("High attention to detail for complex I/O structures")
        
        for rec in recommendations:
            description_parts.append(f"- {rec}")
        
        return "\n".join(description_parts)
