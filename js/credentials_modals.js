// js/credentials_modals.js - LLM keys and Databricks credentials UI + dropdown
(function (global) {
  const S = global.App.state;

  // Use shared state instead of local variables
  // Access via S.llmKeys and S.databricksCredentials

  // LLM Key Modal Functions
  function showLLMKeyModal() {
    const modal = document.getElementById('llmKeyModal');
    if (modal) {
      modal.style.display = 'flex';
      // Reset form
      document.getElementById('providerSelect').value = '';
      document.getElementById('selectSelected').textContent = 'Select a provider';
      document.getElementById('apiKeyInput').value = '';
      // Reset custom dropdown
      resetCustomDropdown();
      // Re-initialize dropdown to ensure it works
      setTimeout(() => {
        initCustomDropdown();
        console.log('Modal opened, dropdown re-initialized');
      }, 100);
    }
  }

  function hideLLMKeyModal() {
    const modal = document.getElementById('llmKeyModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function saveLLMKey() {
    const provider = document.getElementById('providerSelect').value;
    const apiKey = document.getElementById('apiKeyInput').value;

    if (!provider || !apiKey) {
      alert('Please select a provider and enter an API key');
      return;
    }

    // Check if provider already exists
    if (S.llmKeys.some(key => key.provider === provider)) {
      alert('A key for this provider already exists. Please remove the existing key first or choose a different provider.');
      return;
    }

    // Add the new LLM key
    const newKey = {
      id: Date.now(),
      provider: provider,
      apiKey: apiKey
    };

    S.llmKeys.push(newKey);
    updateLLMKeysList();
    hideLLMKeyModal();

    // Update subtitle
    updateLLMKeysSubtitle();

    // Save credentials to project file
    saveCredentialsToProject();
  }

  // Custom dropdown functionality
  function initCustomDropdown() {
    const customSelect = document.getElementById('customSelect');
    const selectSelected = document.getElementById('selectSelected');
    const selectItems = document.getElementById('selectItems');
    const hiddenInput = document.getElementById('providerSelect');

    console.log('Initializing custom dropdown:', {
      customSelect: !!customSelect,
      selectSelected: !!selectSelected,
      selectItems: !!selectItems,
      hiddenInput: !!hiddenInput,
      optionsCount: selectItems ? selectItems.querySelectorAll('.select-option').length : 0
    });

    if (customSelect && selectSelected && selectItems && hiddenInput) {
      // Toggle dropdown
      selectSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Dropdown clicked, toggling visibility');
        console.log('Options found:', selectItems.querySelectorAll('.select-option').length);
        console.log('Options HTML:', selectItems.innerHTML);

        // Remove hide class to show dropdown
        selectItems.classList.remove('select-hide');
        selectSelected.classList.add('select-arrow-active');

        // Reset display styles when opening
        selectItems.style.display = 'block';
        selectItems.style.visibility = 'visible';

        console.log('Dropdown visible:', !selectItems.classList.contains('select-hide'));
        console.log('Dropdown classes:', selectItems.className);

        // Debug positioning
        const rect = selectItems.getBoundingClientRect();
        const parentRect = customSelect.getBoundingClientRect();
        console.log('Dropdown position:', {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: window.getComputedStyle(selectItems).zIndex,
          display: window.getComputedStyle(selectItems).display,
          parentTop: parentRect.top,
          parentHeight: parentRect.height,
          windowHeight: window.innerHeight,
          isVisible: rect.top > 0 && rect.top < window.innerHeight
        });

        // Additional debugging
        console.log('Computed styles:', {
          position: window.getComputedStyle(selectItems).position,
          visibility: window.getComputedStyle(selectItems).visibility,
          opacity: window.getComputedStyle(selectItems).opacity,
          transform: window.getComputedStyle(selectItems).transform,
          clip: window.getComputedStyle(selectItems).clip,
          clipPath: window.getComputedStyle(selectItems).clipPath
        });

        // Force visibility with inline styles - try fixed positioning
        selectItems.style.display = 'block';
        selectItems.style.visibility = 'visible';
        selectItems.style.opacity = '1';
        selectItems.style.position = 'fixed';

        // Position relative to the select element
        const selectRect = selectSelected.getBoundingClientRect();
        selectItems.style.top = (selectRect.bottom + 5) + 'px';
        selectItems.style.left = selectRect.left + 'px';
        selectItems.style.width = selectRect.width + 'px';
        selectItems.style.right = 'auto';

        selectItems.style.zIndex = '10000000';
        selectItems.style.backgroundColor = 'white';
        selectItems.style.border = '2px solid #007bff';
        selectItems.style.minHeight = '50px';
        selectItems.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        selectItems.style.borderRadius = '8px';

        // Additional debugging - check if element is actually visible
        setTimeout(() => {
          const finalRect = selectItems.getBoundingClientRect();
          console.log('Final dropdown position after styling:');
          console.log('  top:', finalRect.top);
          console.log('  left:', finalRect.left);
          console.log('  width:', finalRect.width);
          console.log('  height:', finalRect.height);
          console.log('  isInViewport:', finalRect.top >= 0 && finalRect.left >= 0 &&
                         finalRect.bottom <= window.innerHeight &&
                         finalRect.right <= window.innerWidth);
          console.log('  window dimensions:', window.innerWidth, 'x', window.innerHeight);
        }, 100);
      });

      // Handle option selection
      const options = selectItems.querySelectorAll('.select-option');
      console.log('Found options:', options.length);
      options.forEach(option => {
        option.addEventListener('click', function(e) {
          e.stopPropagation();
          console.log('Option clicked:', this.getAttribute('data-value'));

          // Check if option is disabled
          if (this.classList.contains('disabled')) {
            return;
          }

          const value = this.getAttribute('data-value');
          const text = this.querySelector('span').textContent;
          const logo = this.querySelector('img').outerHTML;

          console.log('Selected:', { value, text, logo });
          hiddenInput.value = value;
          selectSelected.innerHTML = logo + ' <span>' + text + '</span>';

          // Close dropdown immediately after selection
          selectItems.classList.add('select-hide');
          selectSelected.classList.remove('select-arrow-active');

          // Force close with inline styles as backup
          selectItems.style.display = 'none';
          selectItems.style.visibility = 'hidden';
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!customSelect.contains(e.target)) {
          selectItems.classList.add('select-hide');
          selectSelected.classList.remove('select-arrow-active');
        }
      });
    }
  }

  function resetCustomDropdown() {
    const selectItems = document.getElementById('selectItems');
    const selectSelected = document.getElementById('selectSelected');
    if (selectItems && selectSelected) {
      selectItems.classList.add('select-hide');
      selectSelected.classList.remove('select-arrow-active');
    }
  }

  function updateLLMKeysList() {
    const listContainer = document.getElementById('llmKeysList');
    if (!listContainer) return;

    if (S.llmKeys.length === 0) {
      listContainer.style.display = 'none';
      return;
    }

    listContainer.style.display = 'block';
    listContainer.innerHTML = '';

    S.llmKeys.forEach(key => {
      const keyItem = document.createElement('div');
      keyItem.className = 'llm-key-item';

      const providerIcon = getProviderIcon(key.provider);
      const providerName = getProviderName(key.provider);
      const apiKeyPreview = formatApiKeyPreview(key.apiKey);

      keyItem.innerHTML = `
        <div class="llm-key-info">
          <span class="llm-key-provider">${providerIcon} ${providerName}</span>
        </div>
        <span class="api-key-preview">${apiKeyPreview}</span>
        <div class="llm-key-actions">
          <button class="btn btn-small btn-danger" onclick="deleteLLMKey(${key.id})">Delete</button>
        </div>
      `;

      listContainer.appendChild(keyItem);
    });

    // Update dropdown options to disable already selected providers
    updateDropdownOptions();
  }

  function deleteLLMKey(id) {
    S.llmKeys = S.llmKeys.filter(key => key.id !== id);
    updateLLMKeysList();
    updateLLMKeysSubtitle();
    updateDropdownOptions(); // Re-enable the option in dropdown

    // Save credentials to project file
    saveCredentialsToProject();
  }

  function updateDropdownOptions() {
    const options = document.querySelectorAll('.select-option');
    options.forEach(option => {
      const value = option.getAttribute('data-value');
      const isUsed = S.llmKeys.some(key => key.provider === value);

      if (isUsed) {
        option.classList.add('disabled');
        option.style.opacity = '0.5';
        option.style.cursor = 'not-allowed';
      } else {
        option.classList.remove('disabled');
        option.style.opacity = '1';
        option.style.cursor = 'pointer';
        // Ensure the option is fully visible and clickable
        option.style.pointerEvents = 'auto';
      }
    });
  }

  function updateLLMKeysSubtitle() {
    const subtitle = document.querySelector('.settings-item:first-child .settings-item-subtitle');
    if (subtitle) {
      if (S.llmKeys.length === 0) {
        subtitle.textContent = 'No LLM Keys added.';
      } else {
        subtitle.textContent = '';
      }
    }
  }

  function getProviderIcon(provider) {
    const icons = {
      'martian': '<img src="public/martian_logo.png" alt="Martian" style="width: 20px; height: 20px; object-fit: contain;">'
    };
    return icons[provider] || '🔑';
  }

  function getProviderName(provider) {
    const names = {
      'martian': 'Martian'
    };
    return names[provider] || provider;
  }

  function formatApiKeyPreview(apiKey) {
    if (!apiKey || apiKey.length < 4) {
      return '****';
    }

    const firstFour = apiKey.substring(0, 4);
    const stars = '****';
    const preview = firstFour + stars;

    // Always add ellipsis to indicate the key is truncated
    return preview + '...';
  }

  // Databricks Credentials Functions
  function showDatabricksModal() {
    const modal = document.getElementById('databricksModal');
    if (modal) {
      modal.style.display = 'flex';
      // Reset form
      document.getElementById('workspaceUrlInput').value = '';
      document.getElementById('databricksTokenInput').value = '';
    }
  }

  function hideDatabricksModal() {
    const modal = document.getElementById('databricksModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function saveDatabricksCredentials() {
    const workspaceUrl = document.getElementById('workspaceUrlInput').value;
    const personalToken = document.getElementById('databricksTokenInput').value;

    if (!workspaceUrl || !personalToken) {
      alert('Please enter both Workspace URL and Personal Access Token');
      return;
    }

    // Add the new Databricks credentials
    const newCredential = {
      id: Date.now(),
      workspaceUrl: workspaceUrl,
      personalToken: personalToken
    };

    S.databricksCredentials.push(newCredential);
    updateDatabricksCredentialsList();
    hideDatabricksModal();

    // Update subtitle
    updateDatabricksSubtitle();

    // Save credentials to project file
    saveCredentialsToProject();
  }

  function updateDatabricksCredentialsList() {
    const listContainer = document.getElementById('databricksCredentialsList');
    if (!listContainer) return;

    if (S.databricksCredentials.length === 0) {
      listContainer.style.display = 'none';
      return;
    }

    listContainer.style.display = 'block';
    listContainer.innerHTML = '';

    S.databricksCredentials.forEach(credential => {
      const credentialItem = document.createElement('div');
      credentialItem.className = 'databricks-credential-item';

      const workspaceUrlPreview = formatWorkspaceUrlPreview(credential.workspaceUrl);
      const tokenPreview = formatDatabricksTokenPreview(credential.personalToken);

      credentialItem.innerHTML = `
        <div class="databricks-credential-info">
          <span class="databricks-credential-provider"><img src="public/databricks_logo.png" alt="Databricks" class="provider-logo"> Databricks</span>
        </div>
        <span class="databricks-credential-preview">${workspaceUrlPreview}  &nbsp;  ${tokenPreview}</span>
        <div class="databricks-credential-actions">
          <button class="btn btn-small btn-danger" onclick="deleteDatabricksCredential(${credential.id})">Delete</button>
        </div>
      `;

      listContainer.appendChild(credentialItem);
    });
  }

  function deleteDatabricksCredential(id) {
    S.databricksCredentials = S.databricksCredentials.filter(credential => credential.id !== id);
    updateDatabricksCredentialsList();
    updateDatabricksSubtitle();

    // Save credentials to project file
    saveCredentialsToProject();
  }

  function updateDatabricksSubtitle() {
    const subtitle = document.querySelector('.settings-item:last-child .settings-item-subtitle');
    if (subtitle) {
      if (S.databricksCredentials.length === 0) {
        subtitle.textContent = 'No Databricks Credentials added.';
      } else {
        subtitle.textContent = '';
      }
    }
  }

  function formatWorkspaceUrlPreview(url) {
    if (!url || url.length <= 30) {
      return url;
    }
    return url.substring(0, 30) + '...';
  }

  function formatDatabricksTokenPreview(token) {
    if (!token || token.length < 4) {
      return '****';
    }

    const firstFour = token.substring(0, 4);
    const stars = '****';
    const preview = firstFour + stars;

    // Limit to 8 characters total, add ellipsis if longer
    if (preview.length > 8) {
      return preview.substring(0, 8) + '...';
    }

    return preview + '...';
  }

  function getApiKey() {
    try {
      // Try to read from .langsketch-credentials.json file
      const fs = require('fs');
      const path = require('path');

      if (S.currentProjectPath) {
        const credentialsPath = path.join(S.currentProjectPath, '.langsketch-credentials.json');
        if (fs.existsSync(credentialsPath)) {
          const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
          const credentials = JSON.parse(credentialsData);

          // Look for Martian API key in the credentials
          if (credentials.llmKeys && credentials.llmKeys.martian) {
            return credentials.llmKeys.martian;
          }
        }
      }

      // Fallback to localStorage or default
      return localStorage.getItem('apiKey') || 'your-api-key-here';
    } catch (error) {
      console.warn('Could not read credentials file:', error);
      return localStorage.getItem('apiKey') || 'your-api-key-here';
    }
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.credentialsModals = {
    // LLM Key Modal Functions
    showLLMKeyModal,
    hideLLMKeyModal,
    saveLLMKey,
    initCustomDropdown,
    resetCustomDropdown,
    updateLLMKeysList,
    deleteLLMKey,
    updateDropdownOptions,
    updateLLMKeysSubtitle,
    getProviderIcon,
    getProviderName,
    formatApiKeyPreview,
    getApiKey,

    // Databricks Functions
    showDatabricksModal,
    hideDatabricksModal,
    saveDatabricksCredentials,
    updateDatabricksCredentialsList,
    deleteDatabricksCredential,
    updateDatabricksSubtitle,
    formatWorkspaceUrlPreview,
    formatDatabricksTokenPreview,

    // Variables access (proxy to shared state)
    getLLMKeys: () => S.llmKeys,
    setLLMKeys: (keys) => { S.llmKeys = keys; },
    getDatabricksCredentials: () => S.databricksCredentials,
    setDatabricksCredentials: (credentials) => { S.databricksCredentials = credentials; }
  };

  // Back-compat exports for global access
  global.showLLMKeyModal = showLLMKeyModal;
  global.hideLLMKeyModal = hideLLMKeyModal;
  global.saveLLMKey = saveLLMKey;
  global.initCustomDropdown = initCustomDropdown;
  global.resetCustomDropdown = resetCustomDropdown;
  global.updateLLMKeysList = updateLLMKeysList;
  global.deleteLLMKey = deleteLLMKey;
  global.updateDropdownOptions = updateDropdownOptions;
  global.updateLLMKeysSubtitle = updateLLMKeysSubtitle;
  global.getProviderIcon = getProviderIcon;
  global.getProviderName = getProviderName;
  global.formatApiKeyPreview = formatApiKeyPreview;
  global.getApiKey = getApiKey;
  global.showDatabricksModal = showDatabricksModal;
  global.hideDatabricksModal = hideDatabricksModal;
  global.saveDatabricksCredentials = saveDatabricksCredentials;
  global.updateDatabricksCredentialsList = updateDatabricksCredentialsList;
  global.deleteDatabricksCredential = deleteDatabricksCredential;
  global.updateDatabricksSubtitle = updateDatabricksSubtitle;
  global.formatWorkspaceUrlPreview = formatWorkspaceUrlPreview;
  global.formatDatabricksTokenPreview = formatDatabricksTokenPreview;

})(window);