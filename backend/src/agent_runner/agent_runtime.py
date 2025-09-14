from .agent_models import AgentSystemConfig, FieldConfig, ToolConfig, ToolInputConfig, ToolOutputConfig
from .tool_loader import create_langchain_tool
from .utilities import UTILITY_FUNCTIONS, UTILITY_CONFIGS
from .deimos import setup_intelligent_router
from langchain_openai import ChatOpenAI
from deimos_router import get_router
import os
from dotenv import load_dotenv

load_dotenv()
router_name = setup_intelligent_router()

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

        self.llm = ChatOpenAI(
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
        # TODO
        pass
    
    