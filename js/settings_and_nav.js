// js/settings_and_nav.js - Settings and navigation functions
(function (global) {
  const S = global.App.state;

  function updateControlWidgetsState(hasProject) {
    const undoBtn = document.querySelector('.control-widget[title="Undo"]');
    const forwardBtn = document.querySelector(
      '.control-widget[title="Forward"]'
    );

    if (undoBtn && forwardBtn) {
      if (hasProject) {
        // Enable undo and forward buttons when project is opened
        undoBtn.classList.remove("disabled");
        forwardBtn.classList.remove("disabled");
      } else {
        // Disable undo and forward buttons when no project
        undoBtn.classList.add("disabled");
        forwardBtn.classList.add("disabled");
      }
    }
  }

  function updateSettingsButtonState(hasProject) {
    const settingsBtn = document.querySelector(
      '.control-widget[title="Settings"]'
    );

    if (settingsBtn) {
      if (hasProject) {
        // Enable settings button when project is opened
        settingsBtn.classList.remove("disabled");
      } else {
        // Disable settings button when no project
        settingsBtn.classList.add("disabled");
      }
    }
  }

  function resetProjectState() {
    // Disable control widgets and settings button
    updateControlWidgetsState(false);
    updateSettingsButtonState(false);

    // Hide project navigation header
    const projectNavHeader = document.getElementById("projectNavHeader");
    if (projectNavHeader) {
      projectNavHeader.style.display = "none";
    }

    // Show the open folder section
    const openFolderSection = document.querySelector(".open-folder-section");
    if (openFolderSection) {
      openFolderSection.style.display = "flex";
    }

    // Reset main content to show open folder content
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="open-folder-section">
          <button class="open-folder-button">Open a folder to start graphically orchestrating an agentic system!</button>
          <div class="open-folder-text">
            Select a project folder to begin managing your LLM keys, Databricks credentials, and other project settings.
          </div>
        </div>
      `;
      mainContent.style.backgroundColor = "white";
      mainContent.classList.remove("has-project");
    }

    // Clear arrays in shared state (preserves old behavior but centralized)
    S.llmKeys = [];
    S.databricksCredentials = [];
    S.functions = [];
    S.agents = [];

    // Update UI to reflect empty state
    updateLLMKeysList();
    updateLLMKeysSubtitle();
    updateDatabricksCredentialsList();
    updateDatabricksSubtitle();
    updateFunctionsList();
    updateAgentsList();

    // Reset folder display
    const folderDisplay = document.querySelector(".current-folder-display");
    if (folderDisplay) {
      folderDisplay.textContent = "No project selected";
      folderDisplay.classList.add("no-project");
    }

    // Clear global project path
    S.currentProjectPath = null;

    // Clear all connection lines and canvas items
    clearAllConnectionLines();
    S.canvasItems = [];

    // Reset footer info
    updateLastModified(null);
    updateFolderSize(0);

    console.log("Project state reset - cleared project path");
  }

  function updateNavigationState(activeView) {
    // Update the navigation header to show which view is active
    const navButtons = document.querySelectorAll(".nav-button");
    navButtons.forEach((button) => {
      button.classList.remove("active");
      if (button.getAttribute("data-view") === activeView) {
        button.classList.add("active");
      }
    });
  }

  function showSettings() {
    const mainContent = document.getElementById("mainContent");
    const settingsContent = document.getElementById("settingsContent");
    const projectNavHeader = document.getElementById("projectNavHeader");

    if (mainContent && settingsContent) {
      mainContent.style.display = "none";
      settingsContent.style.display = "flex";

      // Hide the project navigation header when settings are open
      if (projectNavHeader) {
        projectNavHeader.style.display = "none";
      }
    }
  }

  function hideSettings() {
    const mainContent = document.getElementById("mainContent");
    const settingsContent = document.getElementById("settingsContent");
    const projectNavHeader = document.getElementById("projectNavHeader");

    if (mainContent && settingsContent) {
      mainContent.style.display = "flex";
      settingsContent.style.display = "none";

      // Show the project navigation header again when settings are closed
      if (projectNavHeader) {
        projectNavHeader.style.display = "flex";
      }
    }
  }

  function switchProjectView(view) {
    // Clear all connection lines when switching views
    clearAllConnectionLines();

    // Update navigation state
    updateNavigationState(view);

    const mainContent = document.querySelector(".main-content");
    if (!mainContent) return;

    switch (view) {
      case "sketch":
        mainContent.innerHTML = `
          <div class="sketch-container">
            <div class="sketch-toolbar">
              <div class="connect-button">
                <img src="public/line.png" alt="Draw" class="connect-icon">
                <span class="connect-text">Draw</span>
              </div>
              <div class="functions-section">
                <div class="functions-header">
                  <span class="functions-title">Functions</span>
                  <div class="functions-controls">
                    <input type="text" class="function-search" placeholder="Search for function" id="functionSearch">
                    <button class="manage-button" id="manageFunctionsBtn">Manage</button>
                  </div>
                </div>
                <div class="functions-list" id="functionsList">
                </div>
              </div>
              <div class="agents-section">
                <div class="agents-header">
                  <div class="agents-subtitle">Agents</div>
                  <button class="agents-edit-btn">Edit</button>
                </div>
                <div class="agents-list" id="agentsList">
                  <!-- Agents will be populated here -->
                </div>
              </div>
              <div class="import-button">
                <div class="upload-icon">↓</div>
                <span class="import-text">Import</span>
              </div>
              <div class="compile-button">
                <div class="checkmark-icon">✓</div>
                <span class="compile-text">Compile</span>
              </div>
              <div class="test-button">
                <span class="test-text">TEST</span>
              </div>
            </div>
            <div class="sketch-canvas">
              <div class="canvas-container">
                <div class="canvas-grid">
                  <!-- Grid paper background for sketching and connecting -->
                  <div class="canvas-tools">
                    <div class="canvas-tools-left">
                      <input type="text" class="sketch-name-input" placeholder="Enter sketch name">
                    </div>
                    <div class="canvas-tools-right">
                      <button class="start-btn">Start</button>
                      <button class="stop-btn">End</button>
                      <button class="zoom-btn zoom-out" title="Zoom Out">-</button>
                      <button class="zoom-btn zoom-in" title="Zoom In">+</button>
                      <button class="fullscreen-btn">
                        <img src="public/fullscreen.png" alt="Fullscreen" class="fullscreen-icon">
                      </button>
                    </div>
                  </div>

                  <div class="canvas-content">
                    <!-- Canvas items and connections will be added here -->
                  </div>

                  <!-- Trash can positioned in canvas container to stay in viewport (not affected by zoom/pan) -->
                  <div class="trash-can-btn" title="Drop items here to delete">
                    <img src="public/trash.png" alt="Drop to delete" class="trash-icon">
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        // Add event listener for Manage button
        const manageBtn = document.getElementById("manageFunctionsBtn");
        if (manageBtn) {
          manageBtn.addEventListener("click", function () {
            showFunctionsModal();
          });
        }

        // Add event listener for function search
        const functionSearch = document.getElementById("functionSearch");
        if (functionSearch) {
          functionSearch.addEventListener("input", function () {
            console.log("Search input changed:", this.value);
            updateFunctionsList(this.value);
          });
        }

        // Compile button functionality
        const compileBtn = document.querySelector(".compile-button");
        if (compileBtn) {
          compileBtn.addEventListener("click", async function () {
            console.log("🔘 Compile button clicked!");
            await handleCompile();
          });
        }

        // Add event listener for intermediate button
        const testBtn = document.querySelector(".test-button");
        if (testBtn) {
          testBtn.addEventListener("click", function () {
            console.log("🔬 Intermediate button clicked!");
            showTestJsonModal();
          });
        }

        // Add event listener for agents edit button
        const agentsEditBtn = document.querySelector(".agents-edit-btn");
        if (agentsEditBtn) {
          agentsEditBtn.addEventListener("click", function () {
            console.log("Agents Edit button clicked!");
            updateNavigationState("agents");
            switchProjectView("agents");
          });
        }

        // Update functions and agents lists
        updateFunctionsList();
        updateAgentsList();

        // Initialize canvas functionality
        setTimeout(() => {
          // Double-check that all connection lines are cleared after view switch
          clearAllConnectionLines();
          initializeCanvas();
        }, 100);

        // Add start/stop button functionality
        const startBtn = document.querySelector(".start-btn");
        const stopBtn = document.querySelector(".stop-btn");

        if (startBtn && stopBtn) {
          startBtn.addEventListener("click", () => {
            // Toggle start button on/off
            if (startBtn.classList.contains("active")) {
              // If already active, deactivate it
              console.log(
                "Start button clicked again - triangle activation mode disabled"
              );
              startBtn.classList.remove("active");
              S.triangleActivationMode = false;

              // Clear only activated triangles when deactivating
              const activatedTriangles = document.querySelectorAll(
                ".left-connector.activated"
              );
              activatedTriangles.forEach((triangle) => {
                triangle.classList.remove("activated");
              });
            } else {
              // If not active, activate it
              console.log(
                "Start button clicked - triangle activation mode enabled"
              );

              // Clear only existing activated triangles first (not circles)
              const activatedTriangles = document.querySelectorAll(
                ".left-connector.activated"
              );
              activatedTriangles.forEach((triangle) => {
                triangle.classList.remove("activated");
              });

              startBtn.classList.add("active");
              stopBtn.classList.remove("active");
              S.triangleActivationMode = true;

              // Turn off drawing mode when start button is activated
              if (S.isDrawingMode) {
                if (global.turnOffDrawingMode) {
                  global.turnOffDrawingMode();
                }
              }

              // Turn off circle activation mode when start button is activated
              if (S.circleActivationMode) {
                console.log(
                  "Turning off circle activation mode when start button is activated"
                );

                // Clear activated circles
                const activatedCircles = document.querySelectorAll(
                  ".right-connector.activated"
                );
                activatedCircles.forEach((circle) => {
                  circle.classList.remove("activated");
                });

                S.circleActivationMode = false;
              }
            }
          });

          stopBtn.addEventListener("click", () => {
            // Toggle stop button on/off
            if (stopBtn.classList.contains("active")) {
              // If already active, deactivate it
              console.log(
                "Stop button clicked again - circle activation mode disabled"
              );
              stopBtn.classList.remove("active");
              S.circleActivationMode = false;

              // Clear only activated circles when deactivating
              const activatedCircles = document.querySelectorAll(
                ".right-connector.activated"
              );
              activatedCircles.forEach((circle) => {
                circle.classList.remove("activated");
              });
            } else {
              // If not active, activate it
              console.log(
                "Stop button clicked - circle activation mode enabled"
              );

              // Clear only existing activated circles first (not triangles)
              const activatedCircles = document.querySelectorAll(
                ".right-connector.activated"
              );
              activatedCircles.forEach((circle) => {
                circle.classList.remove("activated");
              });

              stopBtn.classList.add("active");
              startBtn.classList.remove("active");
              S.circleActivationMode = true;

              // Turn off drawing mode when stop button is activated
              if (S.isDrawingMode) {
                if (global.turnOffDrawingMode) {
                  global.turnOffDrawingMode();
                }
              }

              // Turn off triangle activation mode when stop button is activated
              if (S.triangleActivationMode) {
                console.log(
                  "Turning off triangle activation mode when stop button is activated"
                );

                // Clear activated triangles
                const activatedTriangles = document.querySelectorAll(
                  ".left-connector.activated"
                );
                activatedTriangles.forEach((triangle) => {
                  triangle.classList.remove("activated");
                });

                S.triangleActivationMode = false;
              }
            }
          });
        }
        break;

      case "agents":
        mainContent.innerHTML = `
          <div id="agentsTabContainer">
            <!-- Agents tab content will be loaded here -->
          </div>
        `;

        // Initialize agents view using component
        setTimeout(() => {
          const instance = window.agentsTabInstance;
          if (instance) {
            const container = document.getElementById("agentsTabContainer");
            container.innerHTML = instance.render();
            instance.setupEventListeners();
            instance.loadAgents();
          } else {
            // Fallback to inline content if component not loaded
            mainContent.innerHTML = `
              <div class="agents-view">
                <div class="agents-header-section">
                  <h1 class="agents-main-title">My Agents</h1>
                  <div class="agents-controls">
                    <input type="text" class="agents-search-input" placeholder="Search agents by name..." id="agentsSearchInput">

                  </div>
                </div>
                <div class="agents-listing-section" id="agentsListingSection">
                  <!-- Agents will be populated here -->
                </div>
              </div>
            `;
          }
        }, 100);

        // Ensure connection lines are cleared when switching to agents view
        setTimeout(() => clearAllConnectionLines(), 100);
        break;

      case "databricks":
        mainContent.innerHTML = `
          <div id="databricksTabContainer">
            <!-- Databricks tab content will be loaded here -->
          </div>
        `;

        // Initialize databricks view using component
        setTimeout(() => {
          const container = document.getElementById("databricksTabContainer");
          if (container && window.DatabricksTab) {
            const databricksInstance = new window.DatabricksTab();
            container.innerHTML = databricksInstance.render();
            databricksInstance.setupEventListeners();
            databricksInstance.loadData();
          } else {
            // Fallback to inline content if component not loaded
            mainContent.innerHTML = `
              <div class="databricks-view">
                <div class="databricks-header-section">
                  <h1 class="databricks-main-title">Databricks Analytics</h1>
                  <div class="databricks-controls">
                    <div class="table-selector">
                      <label for="table-select">Select Table:</label>
                      <select id="table-select" class="table-dropdown">
                        <option value="">Loading tables...</option>
                      </select>
                    </div>
                    <button id="refresh-data" class="btn btn-primary">
                      <i class="fas fa-sync-alt btn-icon"></i>
                      Refresh Data
                    </button>
                    <button id="export-data" class="btn btn-secondary">
                      <i class="fas fa-download btn-icon"></i>
                      Export Report
                    </button>
                    <button id="open-databricks" class="btn btn-secondary">
                      <i class="fas fa-external-link-alt btn-icon"></i>
                      Open Databricks
                    </button>
                  </div>
                </div>
                <div class="databricks-content">
                  <p>Loading Databricks data...</p>
                </div>
              </div>
            `;
          }
        }, 100);

        // Ensure connection lines are cleared when switching to databricks view
        setTimeout(() => clearAllConnectionLines(), 100);
        break;
    }
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.settingsAndNav = {
    updateControlWidgetsState,
    updateSettingsButtonState,
    resetProjectState,
    updateNavigationState,
    showSettings,
    hideSettings,
    switchProjectView,
  };

  // Back-compat exports for global access
  global.updateControlWidgetsState = updateControlWidgetsState;
  global.updateSettingsButtonState = updateSettingsButtonState;
  global.resetProjectState = resetProjectState;
  global.updateNavigationState = updateNavigationState;
  global.showSettings = showSettings;
  global.hideSettings = hideSettings;
  global.switchProjectView = switchProjectView;
})(window);
