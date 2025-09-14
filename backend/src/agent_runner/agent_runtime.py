from .agent_models import AgentSystemConfig, FieldConfig, ToolConfig, ToolInputConfig, ToolOutputConfig
from .tool_loader import create_langchain_tool
from .utilities import UTILITY_FUNCTIONS, UTILITY_CONFIGS
from .deimos import setup_intelligent_router
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, Any, Type, List
from pydantic import BaseModel, ValidationError, create_model
from .deimos_wrapper import DeimosCompatibleChatOpenAI
import json
import re
import time
from deimos_router import get_router
from blackbox import test_local
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
        
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the agent with validated dictionary input and enforce output structure
        
        Args:
            input_data: Dictionary containing the input data matching agent's InputConfig
            
        Returns:
            Dict containing the validated output matching the agent's OutputConfig
        """
        if self.agent is None:
            raise Exception("Agent not properly initialized")
        
        try:
            # Validate input using Pydantic
            print(f"[INFO] Validating input data against schema")
            validated_input = self._validate_input_data(input_data)
            print(f"[INFO] Input validation successful")
            
            # Convert to query string for the agent
            if "array_input" in validated_input:
                input_summary = f"Array Input: {json.dumps(validated_input['array_input'], indent=2)}"
            else:
                input_summary = f"Input Data: {json.dumps(validated_input, indent=2)}"
            
            query_string = f"""
    Task: {self.config.agent.description}

    {input_summary}

    Available Tools: {', '.join(self.get_tool_names())}

    Tool Usage Instructions:
    - Use the available tools to gather information, perform calculations, or execute actions as needed
    - You can call multiple tools in sequence if required
    - Each tool call should be purposeful and contribute to processing the input data

    Process:
    1. Analyze the input data and determine what tools (if any) you need to use
    2. Use the tools to process the input and gather the necessary information
    3. Synthesize the results into a final answer based on the input data
    4. Format your final answer as a JSON matching the required output schema:
    {self._create_output_schema_description()}

    Provide your response in the required output format.
    """
            
            print(f"[INFO] Running agent with validated input")
            print(f"[INFO] Available tools: {self.get_tool_names()}")
            
            # Run the agent using LangGraph's stream method for event tracking
            config = {"configurable": {"thread_id": "main"}}
            
            # Collect analytics data during execution
            start_time = time.time()
            events = []
            tool_calls = []
            llm_calls = []
            
            # Stream events for comprehensive analytics
            for event in self.agent.stream(
                {"messages": [("human", query_string)]},
                config=config
            ):
                events.append(event)
                
                # Extract tool call information
                if 'agent' in event and 'messages' in event['agent']:
                    for message in event['agent']['messages']:
                        if hasattr(message, 'tool_calls') and message.tool_calls:
                            for tool_call in message.tool_calls:
                                tool_calls.append({
                                    'tool_name': tool_call['name'],
                                    'args': tool_call['args'],
                                    'call_id': tool_call['id'],
                                    'timestamp': time.time()
                                })
                        
                        # Extract LLM usage data
                        if hasattr(message, 'response_metadata') and message.response_metadata:
                            llm_calls.append({
                                'model': message.response_metadata.get('model_name', 'unknown'),
                                'tokens': message.response_metadata.get('token_usage', {}),
                                'finish_reason': message.response_metadata.get('finish_reason', 'unknown'),
                                'timestamp': time.time()
                            })
            
            execution_time = time.time() - start_time
            
            # Get the final result from the last event
            result = events[-1] if events else {}
            
            # Calculate comprehensive metrics
            total_tokens = sum([call.get('tokens', {}).get('total_tokens', 0) for call in llm_calls])
            prompt_tokens = sum([call.get('tokens', {}).get('prompt_tokens', 0) for call in llm_calls])
            completion_tokens = sum([call.get('tokens', {}).get('completion_tokens', 0) for call in llm_calls])
            
            # Tool usage frequency
            tool_usage_count = {}
            for tc in tool_calls:
                tool_usage_count[tc['tool_name']] = tool_usage_count.get(tc['tool_name'], 0) + 1
            
            # Create standardized analytics JSON with consistent schema
            analytics_data = self._create_standardized_analytics(
                input_data, validated_input, start_time, execution_time, 
                events, tool_calls, llm_calls, total_tokens, prompt_tokens, 
                completion_tokens, tool_usage_count, success=True, error_message=None
            )
            
            print(f"[ANALYTICS_JSON] {json.dumps(analytics_data, indent=2)}")
            with open(f"{self.config.agent.name}_output_json.json", "w") as f:
                json.dump([analytics_data], f)
            test_local(self.config.agent.name, f"{self.config.agent.name}_analytics")

            # Extract the final message content from LangGraph response
            raw_result = None
            
            # Try different possible structures for LangGraph response
            if "agent" in result and "messages" in result["agent"] and result["agent"]["messages"]:
                # Structure: {'agent': {'messages': [...]}}
                last_message = result["agent"]["messages"][-1]
                if hasattr(last_message, 'content'):
                    raw_result = last_message.content
                else:
                    raw_result = str(last_message)
            elif "messages" in result and result["messages"]:
                # Structure: {'messages': [...]}
                last_message = result["messages"][-1]
                if hasattr(last_message, 'content'):
                    raw_result = last_message.content
                else:
                    raw_result = str(last_message)
            else:
                # Fallback: convert entire result to string
                raw_result = str(result)
            
            print(f"[INFO] Agent raw output: {raw_result}")
            
            # Validate and format the output (using existing methods)
            try:
                validated_output = self._validate_output_structure(raw_result)
                print(f"[INFO] Direct validation successful")
                return validated_output
            except OutputValidationError as e:
                print(f"[INFO] Direct validation failed: {e}. Attempting LLM-assisted formatting...")
                validated_output = self._format_output_with_llm(str(raw_result))
                print(f"[INFO] LLM-assisted validation successful")
                return validated_output
                    
        except InputValidationError as e:
            print(f"[ERROR] Input validation failed: {str(e)}")
            # Log analytics for failed runs
            self._log_failed_analytics(input_data, str(e), "input_validation_error")
            return self._create_fallback_output(f"Input validation error: {str(e)}")
            
        except Exception as e:
            print(f"[ERROR] Agent execution failed: {str(e)}")
            # Log analytics for failed runs
            self._log_failed_analytics(input_data, str(e), "execution_error")
            return self._create_fallback_output(f"Error: {str(e)}")
    
    def validate_configuration(self) -> List[str]:
        """
        Validate the agent configuration and return any issues found
        
        Returns:
            List of validation error messages (empty if valid)
        """
        issues = []
        
        # Check agent config
        if not self.config.agent.name:
            issues.append("Agent name is required")
        if not self.config.agent.description:
            issues.append("Agent description is required")
        if not self.config.agent.output.fields:
            issues.append("Agent must have at least one output field")
        
        # Check for duplicate tool names
        tool_names = self.get_tool_names()
        if len(tool_names) != len(set(tool_names)):
            duplicates = [name for name in tool_names if tool_names.count(name) > 1]
            issues.append(f"Duplicate tool names found: {set(duplicates)}")
        
        return issues
    
    def _log_failed_analytics(self, input_data: Dict[str, Any], error_message: str, error_type: str):
        """Log analytics for failed agent runs using standardized schema"""
        current_time = time.time()
        
        # Create empty data structures for failed runs
        empty_events = []
        empty_tool_calls = []
        empty_llm_calls = {}
        empty_validated_input = {}
        
        failed_analytics = self._create_standardized_analytics(
            input_data, empty_validated_input, current_time, 0,
            empty_events, empty_tool_calls, empty_llm_calls, 0, 0, 0, {},
            success=False, error_message=error_message, error_type=error_type
        )
        
        # print(f"[ANALYTICS_JSON] {json.dumps(failed_analytics, indent=2)}")
    
    def _create_standardized_analytics(self, input_data: Dict[str, Any], validated_input: Dict[str, Any], 
                                     start_time: float, execution_time: float, events: List, tool_calls: List, 
                                     llm_calls: List, total_tokens: int, prompt_tokens: int, completion_tokens: int, 
                                     tool_usage_count: Dict, success: bool = True, error_message: str = None, 
                                     error_type: str = None) -> Dict[str, Any]:
        """Create standardized analytics JSON with consistent schema for all agent types"""
        
        # Ensure all required fields exist with defaults
        def safe_get(data, key, default=""):
            return data.get(key, default) if isinstance(data, dict) else default
        
        def safe_join(data_list, separator=","):
            if not data_list:
                return ""
            return separator.join([str(item) for item in data_list if item is not None])
        
        # Calculate metrics with safe defaults
        most_used_tool = max(tool_usage_count.items(), key=lambda x: x[1])[0] if tool_usage_count else ""
        most_used_tool_count = max(tool_usage_count.values()) if tool_usage_count else 0
        
        # Get LLM model info safely
        llm_model = "unknown"
        llm_finish_reasons = ""
        if llm_calls and len(llm_calls) > 0:
            llm_model = llm_calls[0].get('model', 'unknown') if isinstance(llm_calls[0], dict) else 'unknown'
            llm_finish_reasons = safe_join([call.get('finish_reason', 'unknown') for call in llm_calls if isinstance(call, dict)])
        
        # Standardized analytics schema - same columns for all agents
        return {
            # Core execution metrics (always present)
            "agent_name": str(self.config.agent.name),
            "execution_timestamp": int(start_time),
            "execution_date": time.strftime('%Y-%m-%d', time.localtime(start_time)),
            "execution_hour": time.strftime('%H:00:00', time.localtime(start_time)),
            "execution_duration_ms": round(execution_time * 1000, 2),
            "execution_duration_seconds": round(execution_time, 3),
            "success": bool(success),
            "error_message": str(error_message) if error_message else "",
            "error_type": str(error_type) if error_type else "",
            
            # Performance metrics (always present)
            "total_events": len(events) if events else 0,
            "total_tool_calls": len(tool_calls) if tool_calls else 0,
            "total_llm_calls": len(llm_calls) if llm_calls else 0,
            "avg_tool_call_duration_ms": round((execution_time / max(len(tool_calls), 1)) * 1000, 2) if tool_calls else 0,
            "avg_llm_call_duration_ms": round((execution_time / max(len(llm_calls), 1)) * 1000, 2) if llm_calls else 0,
            
            # Token usage (always present)
            "total_tokens_used": int(total_tokens),
            "prompt_tokens_used": int(prompt_tokens),
            "completion_tokens_used": int(completion_tokens),
            "tokens_per_second": round(total_tokens / max(execution_time, 0.001), 2),
            "cost_estimate_usd": round(total_tokens * 0.0000015, 6),
            
            # Tool analytics (always present)
            "tools_used_count": len(set([tc.get('tool_name', '') for tc in tool_calls])) if tool_calls else 0,
            "tools_used_list": safe_join(sorted(set([tc.get('tool_name', '') for tc in tool_calls]))) if tool_calls else "",
            "most_used_tool": str(most_used_tool),
            "most_used_tool_count": int(most_used_tool_count),
            
            # Individual tool metrics (always present)
            "tool_names": safe_join([tc.get('tool_name', '') for tc in tool_calls]) if tool_calls else "",
            "tool_call_ids": safe_join([tc.get('call_id', '') for tc in tool_calls]) if tool_calls else "",
            "tool_call_timestamps": safe_join([str(int(tc.get('timestamp', 0))) for tc in tool_calls]) if tool_calls else "",
            
            # LLM model info (always present)
            "llm_model_used": str(llm_model),
            "llm_finish_reasons": str(llm_finish_reasons),
            "llm_call_timestamps": safe_join([str(int(call.get('timestamp', 0))) for call in llm_calls]) if llm_calls else "",
            
            # Input/Output metrics (always present)
            "input_size_chars": len(str(input_data)),
            "input_fields_count": len(input_data) if isinstance(input_data, dict) else 1,
            "has_array_input": bool(safe_get(validated_input, 'array_input', False)),
            
            # Agent configuration (always present)
            "agent_description": str(self.config.agent.description),
            "available_tools_count": len(self.get_tool_names()),
            "available_tools_list": safe_join(sorted(self.get_tool_names())),
            "utilities_enabled": safe_join(self.config.utilities) if hasattr(self.config, 'utilities') and self.config.utilities else "",
            "apis_configured": len(self.config.apis) if hasattr(self.config, 'apis') and self.config.apis else 0,
            
            # Efficiency metrics (always present)
            "tools_per_second": round(len(tool_calls) / max(execution_time, 0.001), 2) if tool_calls else 0,
            "events_per_second": round(len(events) / max(execution_time, 0.001), 2) if events else 0,
            "efficiency_score": round((len(tool_calls) + len(llm_calls)) / max(execution_time, 0.001), 2),
            
            # Quality indicators (always present)
            "has_validation_errors": not bool(success),
            "output_validation_success": bool(success),
            "llm_errors": 1 if error_type and "llm" in error_type.lower() else 0,
            "tool_errors": 1 if error_type and "tool" in error_type.lower() else 0,
            
            # Raw data (always present)
            "raw_input_data": str(input_data)[:500],
            "execution_sequence": "->".join([tc.get('tool_name', '') for tc in tool_calls]) if tool_calls else ("failed" if not success else "none")
        }
