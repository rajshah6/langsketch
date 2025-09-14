// js/fs_project.js - Project selection and filesystem data functions
(function (global) {
  const S = global.App.state;

  function openProjectFolder() {
    try {
      // Use Electron's dialog to open folder selection
      const { ipcRenderer } = require('electron');
      ipcRenderer.invoke('open-folder-dialog').then(result => {
        if (result && result.filePaths && result.filePaths.length > 0) {
          const selectedFolder = result.filePaths[0];
          console.log('Selected folder:', selectedFolder);

          // Update the folder display
          updateFolderDisplay(selectedFolder);

          // Update the footer info (placeholder for now)
          updateFooterInfo(selectedFolder);
        }
      }).catch(error => {
        console.error('Error opening folder dialog:', error);
      });
    } catch (error) {
      console.error('Error in openProjectFolder:', error);
    }
  }

  function updateFolderDisplay(folderPath) {
    const folderDisplay = document.querySelector('.current-folder-display');
    if (folderDisplay) {
      // Store the full absolute project path globally
      S.currentProjectPath = folderPath;

      // Convert full path to start from ~/ (home directory) for display
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      let displayPath = folderPath;

      if (homeDir && folderPath.startsWith(homeDir)) {
        displayPath = '~/' + folderPath.substring(homeDir.length + 1);
      }

      folderDisplay.textContent = displayPath;
      folderDisplay.classList.remove('no-project');

      // Enable control widgets when project is opened
      updateControlWidgetsState(true);
      updateSettingsButtonState(true);

      // Hide the open folder section and show empty white main content
      hideOpenFolderSection();

      // Load credentials from the project folder
      loadCredentialsFromProject(folderPath);

      // Scan for agents in the project
      scanForAgents();

      console.log('📁 Project opened successfully!');
      console.log('  🔗 Full path stored:', S.currentProjectPath);
      console.log('  📋 Display path:', displayPath);
      console.log('  🏷️ CSS classes:', Array.from(folderDisplay.classList));

      // Test if we can access the project directory
      try {
        const fs = require('fs');
        const projectContents = fs.readdirSync(S.currentProjectPath);
        console.log('  📂 Project directory accessible, contents:', projectContents);
      } catch (error) {
        console.error('  ❌ Error accessing project directory:', error);
      }
    }
  }

  function updateFooterInfo(folderPath) {
    try {
      // Get folder information using Node.js fs module
      const fs = require('fs');
      const path = require('path');

      // Get folder stats for last modified date
      const stats = fs.statSync(folderPath);
      const lastModified = stats.mtime;

      // Calculate folder size recursively
      const folderSize = calculateFolderSize(folderPath);

      // Update the footer elements
      updateLastModified(lastModified);
      updateFolderSize(folderSize);

    } catch (error) {
      console.error('Error updating footer info:', error);
      // Set default values if there's an error
      updateLastModified(null);
      updateFolderSize(0);
    }
  }

  function calculateFolderSize(folderPath) {
    try {
      const fs = require('fs');
      const path = require('path');

      let totalSize = 0;

      function scanDirectory(dirPath) {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            scanDirectory(itemPath);
          } else {
            totalSize += stats.size;
          }
        }
      }

      scanDirectory(folderPath);
      return totalSize;

    } catch (error) {
      console.error('Error calculating folder size:', error);
      return 0;
    }
  }

  function updateLastModified(date) {
    const lastModifiedElement = document.querySelector('.last-modified');
    if (lastModifiedElement) {
      if (date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let displayText;
        if (diffDays === 1) {
          displayText = '1 day ago';
        } else if (diffDays < 7) {
          displayText = `${diffDays} days ago`;
        } else if (diffDays < 30) {
          const weeks = Math.ceil(diffDays / 7);
          displayText = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
          displayText = date.toLocaleDateString();
        }

        lastModifiedElement.textContent = displayText;

        // Dynamically adjust the width and position based on text length
        adjustLastModifiedWidth(displayText);
      } else {
        lastModifiedElement.textContent = 'None';
        adjustLastModifiedWidth('None');
      }
    }
  }

  function adjustLastModifiedWidth(text) {
    const lastModifiedElement = document.querySelector('.last-modified');
    const folderInfoElement = document.querySelector('.folder-info');

    if (lastModifiedElement && folderInfoElement) {
      // Calculate actual text width using canvas for precise measurement
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = context.measureText(text).width;

      // Calculate width based on text content with minimal padding
      let newWidth;
      if (text === 'None') {
        newWidth = Math.ceil(textWidth + 8); // Minimal padding for "None"
      } else if (text.length <= 4) {
        newWidth = Math.ceil(textWidth + 16); // Small padding for short text
      } else if (text.includes('ago') || text.includes('week') || text.includes('day')) {
        // For relative dates like "2 weeks ago", use moderate padding
        newWidth = Math.ceil(textWidth + 20);
      } else if (text.includes('/') || text.includes('-') || text.includes('.')) {
        // For date strings like "12/25/2023", use moderate padding
        newWidth = Math.ceil(textWidth + 16);
      } else {
        // For other text, use standard padding
        newWidth = Math.ceil(textWidth + 18);
      }

      console.log('Text:', text, 'Length:', text.length, 'TextWidth:', textWidth, 'Calculated width:', newWidth);

      // Set the calculated width for all text (including "None")
      lastModifiedElement.style.width = newWidth + 'px';
      lastModifiedElement.style.minWidth = newWidth + 'px';
      lastModifiedElement.style.maxWidth = newWidth + 'px';

      // Add compact class for "None" text for styling purposes
      if (text === 'None') {
        lastModifiedElement.classList.add('compact');
        lastModifiedElement.setAttribute('data-text', 'None');
        console.log('Setting width to', newWidth + 'px for None text');
      } else {
        lastModifiedElement.classList.remove('compact');
        lastModifiedElement.removeAttribute('data-text');
        console.log('Setting width to', newWidth + 'px for text:', text);
      }

      // Calculate positions: start from the right edge and work left
      const sendButtonRight = 0; // send-button is at right: 0
      const sendButtonWidth = 30; // send-button width
      const gap = 5; // gap between elements

      // Position folder-info to the left of send-button
      const folderInfoRight = sendButtonRight + sendButtonWidth + gap;
      folderInfoElement.style.right = folderInfoRight + 'px';

      // Position last-modified to the left of folder-info using actual width
      const folderInfoWidth = parseInt(folderInfoElement.style.width) || 35;
      const lastModifiedWidth = newWidth; // Use the calculated width for all text
      // Account for the border overlap - position so left border connects with folder-info right edge
      const lastModifiedRight = folderInfoRight + folderInfoWidth;
      lastModifiedElement.style.right = lastModifiedRight + 'px';

      console.log('Positioning - folderInfoWidth:', folderInfoWidth, 'lastModifiedWidth:', lastModifiedWidth, 'right position:', lastModifiedRight);

      // Force a reflow to ensure positioning is applied
      lastModifiedElement.offsetHeight;
    }
  }

  function adjustFolderInfoWidth(text) {
    const folderInfoElement = document.querySelector('.folder-info');

    if (folderInfoElement) {
      // Calculate approximate text width (rough estimation)
      const charWidth = 8; // Approximate width per character
      const textWidth = text.length * charWidth;
      const minWidth = 40; // Minimum width
      const maxWidth = 80; // Maximum width for folder size

      // For short text like "0 MB", use tighter width
      let newWidth;
      if (text === '0 MB' || text === '0 B') {
        newWidth = 35; // Tighter width for short size text
      } else if (text.length <= 5) {
        newWidth = minWidth;
      } else {
        // Calculate new width (with some padding) for longer text
        newWidth = Math.max(minWidth, textWidth + 20);
        newWidth = Math.min(maxWidth, newWidth);
      }

      // Update the element width
      folderInfoElement.style.width = newWidth + 'px';

      // Recalculate positions for both elements
      adjustLastModifiedWidth(document.querySelector('.last-modified').textContent);
    }
  }

  function updateFolderSize(sizeInBytes) {
    const folderInfoElement = document.querySelector('.folder-info');
    if (folderInfoElement) {
      if (sizeInBytes > 0) {
        const displaySize = formatFileSize(sizeInBytes);
        folderInfoElement.textContent = displaySize;
        // Adjust width based on the new text
        adjustFolderInfoWidth(displaySize);
      } else {
        folderInfoElement.textContent = '0 MB';
        // Adjust width for default text
        adjustFolderInfoWidth('0 MB');
      }
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Show only the highest magnitude unit
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
  }

  function hideOpenFolderSection() {
    const openFolderSection = document.querySelector('.open-folder-section');
    if (openFolderSection) {
      openFolderSection.style.display = 'none';
    }

    // Show project navigation header
    const projectNavHeader = document.getElementById('projectNavHeader');
    if (projectNavHeader) {
      projectNavHeader.style.display = 'flex';
    }

    // Show empty white main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = '';
      mainContent.style.backgroundColor = 'white';
      mainContent.classList.add('has-project');
    }

    // Show Sketch view by default
    switchProjectView('sketch');
  }

  function loadCredentialsFromProject(folderPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.join(folderPath, '.langsketch-credentials.json');

      if (fs.existsSync(credentialsPath)) {
        const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = JSON.parse(credentialsData);

        // Load LLM keys
        if (credentials.llmKeys) {
          S.llmKeys = credentials.llmKeys;
          updateLLMKeysList();
          updateLLMKeysSubtitle();
        }

        // Load Databricks credentials
        if (credentials.databricksCredentials) {
          S.databricksCredentials = credentials.databricksCredentials;
          updateDatabricksCredentialsList();
          updateDatabricksSubtitle();
        }

        // Load functions
        if (credentials.functions) {
          S.functions = credentials.functions;
          updateFunctionsList();
        }
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  }

  function saveCredentialsToProject() {
    try {
      const fs = require('fs');
      const path = require('path');

      // Get current folder path from display
      const folderDisplay = document.querySelector('.current-folder-display');
      if (!folderDisplay || folderDisplay.classList.contains('no-project')) {
        return; // No project open
      }

      const folderPath = folderDisplay.textContent.startsWith('~/')
        ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
        : folderDisplay.textContent;

      const credentialsPath = path.join(folderPath, '.langsketch-credentials.json');

      const credentials = {
        llmKeys: S.llmKeys,
        databricksCredentials: S.databricksCredentials,
        functions: S.functions
      };

      fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.fsProject = {
    openProjectFolder,
    updateFolderDisplay,
    updateFooterInfo,
    calculateFolderSize,
    updateLastModified,
    adjustLastModifiedWidth,
    adjustFolderInfoWidth,
    updateFolderSize,
    formatFileSize,
    hideOpenFolderSection,
    loadCredentialsFromProject,
    saveCredentialsToProject
  };

  // Back-compat exports for global access
  global.openProjectFolder = openProjectFolder;
  global.updateFolderDisplay = updateFolderDisplay;
  global.updateFooterInfo = updateFooterInfo;
  global.calculateFolderSize = calculateFolderSize;
  global.updateLastModified = updateLastModified;
  global.adjustLastModifiedWidth = adjustLastModifiedWidth;
  global.adjustFolderInfoWidth = adjustFolderInfoWidth;
  global.updateFolderSize = updateFolderSize;
  global.formatFileSize = formatFileSize;
  global.hideOpenFolderSection = hideOpenFolderSection;
  global.loadCredentialsFromProject = loadCredentialsFromProject;
  global.saveCredentialsToProject = saveCredentialsToProject;

})(window);