// js/state.js - Global state management and compatibility layer
(function (global) {
  const state = {
    // Window state
    isMaximized: false,

    // Drawing and activation modes
    isDrawingMode: false,
    drawingStartItem: null,
    triangleActivationMode: false,
    circleActivationMode: false,

    // Data arrays
    llmKeys: [],
    databricksCredentials: [],
    functions: [],
    agents: [],
    canvasItems: [],
    connections: [],

    // Project and filesystem
    currentProjectPath: null,
    currentPath: '/',

    // Canvas state
    canvasZoom: 1,
    canvasPanX: 0,
    canvasPanY: 0,

    // Canvas interaction state
    isDragging: false,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },

    // Connection-in-progress flags (shared with connections)
    isConnecting: false,
    connectionPreview: null,
    startConnector: null,

    // Canvas dimensions (constants)
    CANVAS_WIDTH: 10000,
    CANVAS_HEIGHT: 10000
  };

  // Initialize App namespace
  global.App = global.App || {};
  global.App.state = state;

  // --- Back-compatibility globals ---
  // Create getters/setters so existing code continues to work
  const alias = (name) => {
    Object.defineProperty(global, name, {
      get() { return state[name]; },
      set(v) { state[name] = v; },
      configurable: true,
      enumerable: true
    });
  };

  // Alias all state variables to window for backwards compatibility
  [
    'isMaximized',
    'isDrawingMode',
    'drawingStartItem',
    'triangleActivationMode',
    'circleActivationMode',
    'llmKeys',
    'databricksCredentials',
    'functions',
    'agents',
    'canvasItems',
    'connections',
    'currentProjectPath',
    'currentPath',
    'canvasZoom',
    'canvasPanX',
    'canvasPanY',
    'isDragging',
    'draggedItem',
    'dragOffset',
    'isConnecting',
    'connectionPreview',
    'startConnector',
    'CANVAS_WIDTH',
    'CANVAS_HEIGHT'
  ].forEach(alias);

})(window);