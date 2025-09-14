import importlib.util
import os
import json
import requests
from typing import Any, List, Optional, Type
from pydantic import BaseModel, Field, create_model, ConfigDict
from langchain.tools import BaseTool
from langchain.callbacks.manager import CallbackManagerForToolRun
from .agent_models import ToolConfig, ToolInputConfig, ToolOutputConfig, FieldConfig, APIConfig, AuthConfig

class DynamicLangChainTool(BaseTool):
    """A LangChain tool that wraps a dynamically loaded function or API call"""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name: str
    description: str
    args_schema: Optional[Type[BaseModel]] = None
    loaded_function: Optional[Any] = None
    api_config: Optional[APIConfig] = None
    
    def __init__(self, tool_config: ToolConfig, builtin_function=None, api_config=None, **kwargs):
        # Create the Pydantic schema for input validation
        args_schema = self._create_input_schema(tool_config.inputs)
        
        # Load the function - either from builtin, file, or create API wrapper
        if api_config is not None:
            loaded_function = self._create_api_function(api_config)
        elif builtin_function is not None:
            loaded_function = builtin_function
        else:
            loaded_function = self._load_function_from_file(
                tool_config.code_path, 
                tool_config.function_name
            )
        
        super().__init__(
            name=tool_config.name.replace(" ", "_").replace("-", "_"),
            description=tool_config.description,
            args_schema=args_schema,
            **kwargs
        )
        
        object.__setattr__(self, 'loaded_function', loaded_function)
        object.__setattr__(self, 'api_config', api_config)
        
    def _load_function_from_file(self, code_path: str, function_name: str) -> Any:
        """Dynamically load a function from a Python file"""
        if not os.path.exists(code_path):
            raise FileNotFoundError(f"Code file not found: {code_path}")
        
        # Create a module spec and load the module
        spec = importlib.util.spec_from_file_location("dynamic_module", code_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load module from {code_path}")
        
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Get the specified function
        if not hasattr(module, function_name):
            raise AttributeError(f"Function '{function_name}' not found in {code_path}")
        
        function = getattr(module, function_name)
        
        # Verify it's callable
        if not callable(function):
            raise TypeError(f"'{function_name}' is not callable")
        
        return function
       
    def _create_api_function(self, api_config: APIConfig):
        """Create a function that makes API calls based on APIConfig"""
        
        def api_function(**kwargs) -> str:
            response = None
            
            try:
                # Prepare the request
                url = api_config.url
                method = api_config.method.upper()
                headers = api_config.headers.copy() if api_config.headers else {}
                params = api_config.queries.copy() if api_config.queries else {}
                
                # Handle authentication
                if api_config.auth and api_config.auth.type == "api-key" and api_config.auth.api_key:
                    auth_in = None
                    if hasattr(api_config.auth, 'in_'):
                        auth_in = api_config.auth.in_
                    
                    if auth_in == "header":
                        headers[api_config.auth.field] = api_config.auth.api_key
                    elif auth_in == "query":
                        params[api_config.auth.field] = api_config.auth.api_key
                        
                # Handle different parameter types from kwargs
                data = None
                json_data = None
                
                # Extract payload and params from kwargs if they exist
                payload = kwargs.get('payload', {})
                extra_params = kwargs.get('params', {})
                
                if method in ["POST", "PUT", "PATCH"]:
                    # For body methods, use payload as JSON body
                    json_data = payload
                    # Add extra params to query string
                    params.update(extra_params)
                else:
                    # For GET and other methods, merge everything into query parameters
                    params.update(payload)
                    params.update(extra_params)
                
                # Make the request
                response = requests.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params if params else None,
                    json=json_data,
                    data=data,
                    timeout=30
                )
                
                # Handle response
                if response.status_code >= 400:
                    error_msg = f"API Error {response.status_code}: {response.text}"
                    return error_msg
                
                try:
                    json_response = response.json()
                    result = json.dumps(json_response, indent=2)
                    return result
                except:
                    # Fall back to text
                    result = response.text
                    return result
                            
            except requests.exceptions.RequestException as e:
                error_msg = f"Request Error: {str(e)}"
                return error_msg
            except Exception as e:
                error_msg = f"Error making API call: {str(e)}"
                return error_msg
            finally:
                print(f"API CALL COMPLETED: {api_config.name}")
                # Only print response if it exists
                if response is not None:
                    print(f"Response: {response}")
                else:
                    print(f"Response: No response received (error occurred)")
        
        return api_function
    
    def _create_input_schema(self, inputs: ToolInputConfig) -> Type[BaseModel]:
        """Create a Pydantic model for input validation based on ToolInputConfig"""
        fields = {}
        
        for field_config in inputs.fields:
            field_type = self._get_python_type(field_config.type)
            field_kwargs = {
                'description': field_config.description
            }
            
            if not field_config.required:
                field_type = Optional[field_type]
                field_kwargs['default'] = field_config.default
            
            fields[field_config.name] = (field_type, Field(**field_kwargs))
        
        model = create_model('ToolInputSchema', **fields)
        model.model_config = ConfigDict(extra='forbid')
        return model
    
    def _get_python_type(self, type_string: str) -> Type:
        """Convert string type to Python type"""
        type_mapping = {
            'str': str,
            'string': str,
            'int': int,
            'integer': int,
            'float': float,
            'bool': bool,
            'boolean': bool,
            'list': list,
            'dict': dict,
            'any': Any
        }
        
        return type_mapping.get(type_string.lower(), str)
    
    def _run(self, run_manager: Optional[CallbackManagerForToolRun] = None, **kwargs) -> str:
        try:
            if self.loaded_function is None:
                return "Error: No function loaded"
                
            result = self.loaded_function(**kwargs)
            
            return str(result)
                
        except Exception as e:
            error_msg = f"Error executing function: {str(e)}"
            print(f"[DEBUG] Tool execution error: {error_msg}")
            return error_msg

def create_langchain_tool(tool_config: ToolConfig, builtin_function=None, api_config=None) -> DynamicLangChainTool:
    """
    Factory function to create a LangChain tool from a ToolConfig
    """
    return DynamicLangChainTool(tool_config, builtin_function=builtin_function, api_config=api_config)

def create_api_tool_from_config(api_config: APIConfig, inputs: List[FieldConfig], outputs: List[FieldConfig]) -> DynamicLangChainTool:
    """
    Helper function to create an API-based tool directly from APIConfig
    """
    tool_config = ToolConfig(
        name=api_config.name,
        description=api_config.description,
        inputs=ToolInputConfig(fields=inputs),
        output=ToolOutputConfig(fields=outputs),
        code_path="__api__",
        function_name=api_config.name.lower().replace(" ", "_")
    )
    
    return create_langchain_tool(tool_config, api_config=api_config)