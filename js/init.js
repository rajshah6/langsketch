// js/init.js - DOMContentLoaded event wiring and initialization
(function (global) {
  const S = global.App.state;

  document.addEventListener('DOMContentLoaded', function() {
    // Window control buttons
    const closeBtn = document.querySelector('.close-button');
    const minimizeBtn = document.querySelector('.minimize-button');
    const maximizeBtn = document.querySelector('.maximize-button');

    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        closeWindow();
        resetHoverState();
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', function() {
        minimizeWindow();
        resetHoverState();
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', function() {
        maximizeWindow();
        resetHoverState();
      });
    }

    // Open folder button
    const openFolderBtn = document.querySelector('.open-folder-button');
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', function() {
        openProjectFolder();
      });
    }

    // Control widgets (undo, forward, settings)
    const undoBtn = document.querySelector('.control-widget[title="Undo"]');
    const forwardBtn = document.querySelector('.control-widget[title="Forward"]');
    const settingsBtn = document.querySelector('.control-widget[title="Settings"]');

    if (undoBtn) {
      undoBtn.addEventListener('click', function() {
        console.log('Undo clicked');
        // Add your undo functionality here
      });
    }

    if (forwardBtn) {
      forwardBtn.addEventListener('click', function() {
        console.log('Forward clicked');
        // Add your forward functionality here
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        console.log('Settings clicked');
        showSettings();
      });
    }

    // Settings modal close button
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener('click', function() {
        hideSettings();
      });
    }

    // LLM Key add button
    const addLLMKeyBtn = document.getElementById('addLLMKeyBtn');
    if (addLLMKeyBtn) {
      addLLMKeyBtn.addEventListener('click', function() {
        showLLMKeyModal();
      });
    }

    // LLM Key modal buttons
    const llmKeyModalCloseBtn = document.getElementById('llmKeyModalCloseBtn');
    const llmKeyModalCancelBtn = document.getElementById('llmKeyModalCancelBtn');
    const llmKeyModalSaveBtn = document.getElementById('llmKeyModalSaveBtn');

    if (llmKeyModalCloseBtn) {
      llmKeyModalCloseBtn.addEventListener('click', function() {
        hideLLMKeyModal();
      });
    }

    if (llmKeyModalCancelBtn) {
      llmKeyModalCancelBtn.addEventListener('click', function() {
        hideLLMKeyModal();
      });
    }

    if (llmKeyModalSaveBtn) {
      llmKeyModalSaveBtn.addEventListener('click', function() {
        saveLLMKey();
      });
    }

    // Functions modal buttons
    const functionsModalCloseBtn = document.getElementById('functionsModalCloseBtn');
    const functionsModalCancelBtn = document.getElementById('functionsModalCancelBtn');
    const functionsModalSaveBtn = document.getElementById('functionsModalSaveBtn');

    if (functionsModalCloseBtn) {
      functionsModalCloseBtn.addEventListener('click', function() {
        hideFunctionsModal();
      });
    }

    if (functionsModalCancelBtn) {
      functionsModalCancelBtn.addEventListener('click', function() {
        hideFunctionsModal();
      });
    }

    if (functionsModalSaveBtn) {
      functionsModalSaveBtn.addEventListener('click', function() {
        addSelectedFunctions();
      });
    }

    // Function search input
    const functionSearch = document.getElementById('functionSearch');
    if (functionSearch) {
      functionSearch.addEventListener('input', function() {
        console.log('Search input changed:', this.value);
        updateFunctionsList(this.value);
      });
    } else {
      console.log('Function search input not found during DOMContentLoaded');
    }

    // Function details modal buttons
    const functionDetailsModalCloseBtn = document.getElementById('functionDetailsModalCloseBtn');
    const functionDetailsModalCloseBtn2 = document.getElementById('functionDetailsModalCloseBtn2');

    if (functionDetailsModalCloseBtn) {
      functionDetailsModalCloseBtn.addEventListener('click', function() {
        hideFunctionDetailsModal();
      });
    }

    if (functionDetailsModalCloseBtn2) {
      functionDetailsModalCloseBtn2.addEventListener('click', function() {
        hideFunctionDetailsModal();
      });
    }

    // Folder navigation buttons
    const goUpBtn = document.getElementById('goUpBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    if (goUpBtn) {
      goUpBtn.addEventListener('click', function() {
        const currentPathDisplay = document.getElementById('currentPath');
        if (currentPathDisplay && currentPathDisplay.textContent !== '/') {
          S.currentPath = require('path').dirname(S.currentPath) || '/';
          loadCurrentDirectory();
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        loadCurrentDirectory();
      });
    }

    // Databricks configure button
    const configureDatabricksBtn = document.getElementById('configureDatabricksBtn');
    if (configureDatabricksBtn) {
      configureDatabricksBtn.addEventListener('click', function() {
        showDatabricksModal();
      });
    }

    // Databricks modal buttons
    const databricksModalCloseBtn = document.getElementById('databricksModalCloseBtn');
    const databricksModalCancelBtn = document.getElementById('databricksModalCancelBtn');
    const databricksModalSaveBtn = document.getElementById('databricksModalSaveBtn');

    if (databricksModalCloseBtn) {
      databricksModalCloseBtn.addEventListener('click', function() {
        hideDatabricksModal();
      });
    }

    if (databricksModalCancelBtn) {
      databricksModalCancelBtn.addEventListener('click', function() {
        hideDatabricksModal();
      });
    }

    if (databricksModalSaveBtn) {
      databricksModalSaveBtn.addEventListener('click', function() {
        saveDatabricksCredentials();
      });
    }

    // Custom modals (if they exist)
    const customConfirmModalCloseBtn = document.getElementById('customConfirmModalCloseBtn');
    const customAlertModalCloseBtn = document.getElementById('customAlertModalCloseBtn');

    if (customConfirmModalCloseBtn) {
      customConfirmModalCloseBtn.addEventListener('click', function() {
        if (typeof hideCustomConfirm === 'function') {
          hideCustomConfirm();
        }
      });
    }

    if (customAlertModalCloseBtn) {
      customAlertModalCloseBtn.addEventListener('click', function() {
        if (typeof hideCustomAlert === 'function') {
          hideCustomAlert();
        }
      });
    }

    // Test JSON modal buttons
    const testJsonModalCloseBtn = document.getElementById('testJsonModalCloseBtn');
    const testJsonModalOkBtn = document.getElementById('testJsonModalOkBtn');
    const generatePreviewBtn = document.getElementById('generatePreviewBtn');

    if (testJsonModalCloseBtn) {
      testJsonModalCloseBtn.addEventListener('click', function() {
        hideTestJsonModal();
      });
    }

    if (testJsonModalOkBtn) {
      testJsonModalOkBtn.addEventListener('click', function() {
        hideTestJsonModal();
      });
    }

    if (generatePreviewBtn) {
      generatePreviewBtn.addEventListener('click', function() {
        generateIntermediatePreview();
      });
    }

    // Project navigation buttons
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Remove active class from all buttons
        navButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        this.classList.add('active');

        // Handle view switching
        const view = this.getAttribute('data-view');
        switchProjectView(view);
      });
    });

    // Initialize custom dropdowns
    if (typeof initCustomDropdown === 'function') {
      initCustomDropdown();
    }

    // Set initial positioning for the footer elements
    adjustLastModifiedWidth('None');
    adjustFolderInfoWidth('0 MB');

    // Set initial state for control widgets (disabled when no project)
    updateControlWidgetsState(false);

    // Set initial state for settings button (disabled when no project)
    updateSettingsButtonState(false);

    // --- Agents Tab: ensure a global instance exists exactly like index-backup.html ---
    try {
      if (!window.agentsTabInstance && typeof window.AgentsTab !== 'undefined') {
        window.agentsTabInstance = new window.AgentsTab();
      }
    } catch (e) {
      console.warn('Failed to instantiate AgentsTab; will retry when switching to Agents view.', e);
    }

    // Show Sketch view by default when opening the application
    // This will be overridden if a project is opened
    console.log('DOM content loaded - initialization complete');
  });

})(window);