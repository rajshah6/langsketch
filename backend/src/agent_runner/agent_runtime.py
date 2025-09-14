from .agent_models import AgentSystemConfig, FieldConfig, ToolConfig, ToolInputConfig, ToolOutputConfig
from .tool_loader import create_langchain_tool
from .utilities import UTILITY_FUNCTIONS, UTILITY_CONFIGS
from .deimos import setup_intelligent_router
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, Any, Type
from pydantic import BaseModel, ValidationError, create_model
from .deimos_wrapper import DeimosCompatibleChatOpenAI
import json
import re
from deimos_router import get_router
import os
from dotenv import load_dotenv

load_dotenv()
router_name = setup_intelligent_router()

class OutputValidationError(Exception):
    """Custom exception for output validation failures"""
    pass

class InputValidationError(Exception):
    """Custom exception for input validation failures"""
    pass


class AgentRuntime:
    """This class defines a runnable agent"""
    def __init__(self, config: AgentSystemConfig):
        self.config = config
        self.tools = []
        self.vector_store = None
        self.builtin_tools = {}
        
        # Initialize all components
        self._setup_llm()
        self._setup_rag()
        self._setup_tools()
        self._setup_utilities()
        self._setup_apis()
        self._setup_scrapers()
        self._create_agent()
    
    def _setup_llm(self) -> None:
        router = get_router(router_name)
        
        if router is None:
            raise ValueError(f"Router {router_name} not found. Available routers: {list(get_router.__globals__['_router_registry'].keys())}")
        
        # Prepare comprehensive description of the agent system for optimal routing
        request_data = {
            'messages': AgentSystemConfig.generate_router_description(self.config)
        }
        
        selected_model = router.select_model(request_data)
        print(selected_model)

        self.llm = DeimosCompatibleChatOpenAI(
            model=selected_model,
            api_key=os.getenv("DEIMOS_API_KEY"),
            base_url=os.getenv("DEIMOS_API_URL"),
        )

    def _setup_rag(self) -> None:
        # TODO
        pass
            
    def _setup_apis(self) -> None:
        """Setup API integration tools"""
        if not hasattr(self.config, 'apis') or self.config.apis is None:
            return
            
        for api in self.config.apis:
            # Validate API config
            if not api.name or not api.url or not api.method:
                print(f"Error: Incomplete API configuration for {api.name}")
                continue
            
            input_fields = []
            
            if api.method.upper() in ["POST", "PUT", "PATCH"]:
                # For body methods, accept a generic payload
                input_fields.append(
                    FieldConfig(
                        name="payload",
                        type="dict",
                        description="JSON payload for the API request",
                        required=False
                    )
                )
            
            # Always allow query parameters
            input_fields.append(
                FieldConfig(
                    name="params",
                    type="dict", 
                    description="Query parameters for the API call",
                    required=False
                )
            )
            
            api_tool_config = ToolConfig(
                name=api.name,
                description=api.description,
                inputs=ToolInputConfig(fields=input_fields),
                output=ToolOutputConfig(
                    is_array=False,
                    fields=[
                        FieldConfig(
                            name="response",
                            type="str",
                            description="Response from the API call",
                            required=True
                        )
                    ]
                ),
                code_path="__api__",
                function_name=api.name.lower().replace(" ", "_").replace("-", "_")
            )
            
            # Add to tools list for processing in _setup_tools
            if not hasattr(self.config, 'tools') or self.config.tools is None:
                self.config.tools = []
            self.config.tools.append(api_tool_config)
                
    def _setup_tools(self) -> None:
        """Setup all tools (both builtin and user-provided)"""
        if not hasattr(self.config, 'tools') or self.config.tools is None:
            return
            
        for tool_cfg in self.config.tools:
            try:
                if tool_cfg.code_path == "__builtin__":
                    # Handle builtin tools
                    if tool_cfg.function_name in self.builtin_tools:
                        builtin_function = self.builtin_tools[tool_cfg.function_name]
                        langchain_tool = create_langchain_tool(tool_cfg, builtin_function=builtin_function)
                        self.tools.append(langchain_tool)
                        print(f"Successfully loaded builtin tool: {tool_cfg.name}")
                    else:
                        print(f"Error: Builtin function '{tool_cfg.function_name}' not found in builtin_tools")
                        continue
                elif tool_cfg.code_path == "__api__":
                    # Handle API tools - look for matching API config
                    api_config = self._find_api_config(tool_cfg.name)
                    if api_config:
                        langchain_tool = create_langchain_tool(tool_cfg, api_config=api_config)
                        self.tools.append(langchain_tool)
                        print(f"Successfully loaded API tool: {tool_cfg.name}")
                    else:
                        print(f"Error: API config for '{tool_cfg.name}' not found")
                        continue
                else:
                    # Handle regular tools loaded from files
                    langchain_tool = create_langchain_tool(tool_cfg)
                    self.tools.append(langchain_tool)
                    print(f"Successfully loaded tool: {tool_cfg.name}")
                    
            except Exception as e:
                print(f"Error loading tool {tool_cfg.name}: {str(e)}")
                continue
    
    def _setup_utilities(self) -> None:
        """Setup builtin utility tools""" 
        # Only register utilities that are specified in the config
        if hasattr(self.config, 'utilities') and self.config.utilities:
            registered_functions = {}
            registered_configs = []
            
            for utility_name in self.config.utilities:
                if utility_name in UTILITY_FUNCTIONS:
                    registered_functions[utility_name] = UTILITY_FUNCTIONS[utility_name]
                    # Find the corresponding config
                    for config in UTILITY_CONFIGS:
                        if config.function_name == utility_name:
                            registered_configs.append(config)
                            break
                else:
                    print(f"[WARNING] Utility '{utility_name}' not found in available utilities")
            
            # Register only the selected builtin functions
            self.builtin_tools.update(registered_functions)
            
            # Add selected builtin tool configs to the agent config
            if not hasattr(self.config, 'tools') or self.config.tools is None:
                self.config.tools = []
            self.config.tools.extend(registered_configs)
            
            print(f"[INFO] Registered {len(registered_functions)} selected utility tools: {list(registered_functions.keys())}")
        else:
            print("[INFO] No utilities specified in config")
    
    def _setup_scrapers(self) -> None:
        # TODO
        pass

    def _create_agent(self) -> None:
        """Create and configure the agent with all loaded tools using LangGraph"""
        try:
            # Initialize memory checkpoint for multi-turn conversations
            memory = MemorySaver()

            # Create the agent using LangGraph's create_react_agent
            self.agent = create_react_agent(
                model=self.llm,
                tools=self.tools,
                checkpointer=memory,
                interrupt_before=None,  #
                interrupt_after=None,
            )

            print(f"[INFO] Agent successfully created with {len(self.tools)} tools: {self.get_tool_names()}")

        except Exception as e:
            print(f"[ERROR] Failed to create agent: {str(e)}")
            self.agent = None
    
    def _validate_output_structure(self, output: Any) -> Dict[str, Any]:
        """Validate and transform agent output to match OutputConfig"""
        expected_output = self.config.agent.output
        
        # If the output is a string, try to parse it as JSON first
        if isinstance(output, str):
            try:
                # Clean the string by stripping whitespace and newlines
                cleaned_output = output.strip().strip('\n\r\t')
                parsed_output = json.loads(cleaned_output)
                output = parsed_output
            except json.JSONDecodeError:
                pass
        
        # Create the validated output dictionary
        validated_output = {}
        
        for field in expected_output.fields:
            field_name = field.name
            field_type = field.type.lower()
            field_required = getattr(field, 'required', True)
            
            # Try to extract the field value from output
            field_value = None
            
            if isinstance(output, dict):
                field_value = output.get(field_name)
            elif isinstance(output, str):
                # For string outputs, try to extract structured data
                field_value = self._extract_field_from_string(output, field_name, field_type)
            
            # Handle missing required fields
            if field_value is None and field_required:
                if isinstance(output, str):
                    # For required fields missing from string output, use the whole string
                    field_value = output
                else:
                    raise OutputValidationError(f"Required field '{field_name}' is missing from agent output")
            
            # Type validation and conversion
            if field_value is not None:
                field_value = self._convert_field_type(field_value, field_type, field_name)
            
            validated_output[field_name] = field_value
        
        return validated_output
    
    def _extract_field_from_string(self, text: str, field_name: str, field_type: str) -> Any:
        """Extract field value from string output using patterns"""
        
        # Try JSON-like extraction first
        json_pattern = rf'["\']?{re.escape(field_name)}["\']?\s*:\s*([^,\n\}}]+)'
        match = re.search(json_pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip().strip('"\'')
            # Clean up any remaining whitespace and newlines
            value = value.strip().strip('\n\r\t')
            return value
        
        # Try key-value pair extraction
        kv_pattern = rf'{re.escape(field_name)}\s*[=:]\s*([^\n,]+)'
        match = re.search(kv_pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip().strip('"\'')
            # Clean up any remaining whitespace and newlines
            value = value.strip().strip('\n\r\t')
            return value
        
        # For specific field types, try specialized extraction
        if field_type in ['number', 'integer', 'float']:
            # Extract first number found
            number_match = re.search(r'-?\d+\.?\d*', text)
            if number_match:
                return number_match.group()
        
        elif field_type == 'boolean':
            # Look for boolean indicators
            if re.search(r'\b(true|yes|1)\b', text, re.IGNORECASE):
                return True
            elif re.search(r'\b(false|no|0)\b', text, re.IGNORECASE):
                return False
        
        return None
    
    def _convert_field_type(self, value: Any, field_type: str, field_name: str) -> Any:
        """Convert field value to expected type"""
        
        if field_type in ['string', 'str']:
            return str(value)
        
        elif field_type in ['integer', 'int']:
            try:
                # Clean the value by stripping whitespace and newlines
                cleaned_value = str(value).strip().strip('\n\r\t')
                return int(float(cleaned_value))  # Handle "123.0" -> 123
            except (ValueError, TypeError):
                raise OutputValidationError(f"Cannot convert '{value}' to integer for field '{field_name}'")
        
        elif field_type in ['float', 'number']:
            try:
                # Clean the value by stripping whitespace and newlines
                cleaned_value = str(value).strip().strip('\n\r\t')
                return float(cleaned_value)
            except (ValueError, TypeError):
                raise OutputValidationError(f"Cannot convert '{value}' to float for field '{field_name}'")
        
        elif field_type in ['boolean', 'bool']:
            if isinstance(value, bool):
                return value
            elif isinstance(value, str):
                lower_val = value.lower().strip()
                if lower_val in ['true', 'yes', '1', 'on']:
                    return True
                elif lower_val in ['false', 'no', '0', 'off']:
                    return False
                else:
                    raise OutputValidationError(f"Cannot convert '{value}' to boolean for field '{field_name}'")
            elif isinstance(value, (int, float)):
                return bool(value)
            else:
                raise OutputValidationError(f"Cannot convert '{value}' to boolean for field '{field_name}'")
        
        elif field_type in ['list', 'array']:
            if isinstance(value, list):
                return value
            elif isinstance(value, str):
                try:
                    # Try to parse as JSON array
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return parsed
                except json.JSONDecodeError:
                    # Split by common delimiters
                    return [item.strip() for item in re.split(r'[,;\n]', value) if item.strip()]
            else:
                return [value] 
        
        elif field_type in ['dict', 'object']:
            if isinstance(value, dict):
                return value
            elif isinstance(value, str):
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    # Return as single key-value pair
                    return {"value": value}
            else:
                return {"value": value}
        
        else:
            # Default: return as string
            return str(value)
    
    def _format_output_with_llm(self, raw_output: str, max_retries: int = 2) -> Dict[str, Any]:
        """Use LLM to format output according to OutputConfig schema"""
        
        # Create schema description
        schema_description = self._create_output_schema_description()
        
        format_prompt = f"""
        You are a data formatter. Your task is to transform the following agent output into a structured JSON format that exactly matches the required schema.

        REQUIRED OUTPUT SCHEMA:
        {schema_description}

        AGENT OUTPUT TO FORMAT:
        {raw_output}

        Instructions:
        1. Extract the relevant information from the agent output
        2. Format it as a JSON object that exactly matches the schema
        3. Ensure all required fields are present
        4. Convert field types as needed (string, int, float, bool, list, dict)
        5. If a required field cannot be determined from the output, use a reasonable default or the raw output
        6. Return ONLY the JSON object, no additional text

        JSON OUTPUT:"""

        for attempt in range(max_retries + 1):
            try:
                # Updated to use invoke instead of predict
                response = self.llm.invoke(format_prompt)
                
                formatted_text = response.content.strip()
                
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', formatted_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    formatted_output = json.loads(json_str)

                    return self._validate_output_structure(formatted_output)
                else:
                    if attempt == max_retries:
                        raise OutputValidationError("LLM failed to generate valid JSON format")
                    continue
                    
            except (json.JSONDecodeError, OutputValidationError) as e:
                if attempt == max_retries:
                    # Last attempt failed, return basic structure
                    print(f"Warning: Output formatting failed after {max_retries + 1} attempts: {e}")
                    return self._create_fallback_output(raw_output)
                continue
        
        return self._create_fallback_output(raw_output)
    
    def _create_output_schema_description(self) -> str:
        """Create a human-readable description of the output schema"""
        schema_parts = []
        
        for field in self.config.agent.output.fields:
            required_text = " (required)" if getattr(field, 'required', True) else " (optional)"
            schema_parts.append(f"- {field.name}: {field.type}{required_text} - {field.description}")
        
        return "\n".join(schema_parts)
    
    def _create_fallback_output(self, raw_output: str) -> Dict[str, Any]:
        """Create a fallback output structure when validation fails"""
        fallback = {}
        
        for field in self.config.agent.output.fields:
            field_name = field.name
            field_type = field.type.lower()
            
            if field_type in ['string', 'str']:
                fallback[field_name] = raw_output
            elif field_type in ['integer', 'int']:
                fallback[field_name] = 0
            elif field_type in ['float', 'number']:
                fallback[field_name] = 0.0
            elif field_type in ['boolean', 'bool']:
                fallback[field_name] = False
            elif field_type in ['list', 'array']:
                fallback[field_name] = [raw_output] if raw_output else []
            elif field_type in ['dict', 'object']:
                fallback[field_name] = {"raw_output": raw_output}
            else:
                fallback[field_name] = raw_output
        
        return fallback
    
    def get_tool_names(self) -> list[str]:
        """Get list of all loaded tool names for debugging"""
        return [tool.name for tool in self.tools]
    
    def get_builtin_tool_names(self) -> list[str]:
        """Get list of all builtin tool names for debugging"""
        return list(self.builtin_tools.keys())
    
    def get_api_tool_names(self) -> list[str]:
        """Get list of all API tool names for debugging"""
        if not hasattr(self.config, 'apis') or self.config.apis is None:
            return []
        return [api.name for api in self.config.apis]
    
    
    def _create_input_model(self) -> Type[BaseModel]:
        """
        Create a dynamic Pydantic model from the agent's input configuration
        """
        input_config = self.config.agent.input
        fields = {}
        
        for field in input_config.fields:
            field_name = field.name
            field_type = field.type.lower()
            field_required = getattr(field, 'required', True)
            field_default = getattr(field, 'default', None)
            
            # Map string types to Python types
            type_mapping = {
                'string': str, 'str': str,
                'integer': int, 'int': int,
                'float': float, 'number': float,
                'boolean': bool, 'bool': bool,
                'list': list, 'array': list,
                'dict': dict, 'object': dict,
            }
            
            python_type = type_mapping.get(field_type, str)
            
            # Handle optional fields and defaults
            if not field_required or field_default is not None:
                if field_default is not None:
                    fields[field_name] = (python_type, field_default)
                else:
                    fields[field_name] = (python_type, None)
            else:
                fields[field_name] = (python_type, ...)  
        
        # Create the dynamic model
        InputModel = create_model('InputModel', **fields)
        return InputModel

    def _validate_input_data(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate input data using Pydantic model
        """
        try:
            InputModel = self._create_input_model()
            
            # Handle array inputs
            validated_input = InputModel(**input_data)
            return validated_input.model_dump()
                
        except ValidationError as e:
            # Convert Pydantic errors to readable format
            error_msgs = []
            for error in e.errors():
                field = error['loc'][0] if error['loc'] else 'unknown'
                msg = error['msg']
                error_msgs.append(f"Field '{field}': {msg}")
            
            raise InputValidationError("; ".join(error_msgs))
