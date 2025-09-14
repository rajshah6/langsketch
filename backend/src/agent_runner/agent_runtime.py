from .agent_models import AgentSystemConfig
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
            
    def _setup_tools(self) -> None:
        # TODO
        pass
    
    def _setup_utilities(self) -> None:
        # TODO
        pass
    
    def _setup_apis(self) -> None:
        # TODO
        pass
    
    def _setup_scrapers(self) -> None:
        # TODO
        pass
    
    def _create_agent(self) -> None:
        # TODO
        pass
    
    