// js/functions_browser.js - Functions manager & directory browsing
(function (global) {
  const S = global.App.state;

  // Use shared state instead of local variables
  // Access via S.functions and S.currentPath

  /**
   * Shows the functions modal for browsing and selecting Python functions
   */
  function showFunctionsModal() {
    const modal = document.getElementById('functionsModal');
    if (modal) {
      modal.style.display = 'flex';
      loadCurrentDirectory();
    }
  }

  /**
   * Hides the functions modal and resets function selection
   */
  function hideFunctionsModal() {
    const modal = document.getElementById('functionsModal');
    if (modal) {
      modal.style.display = 'none';
      // Reset function selection
      document.getElementById('functionSelection').style.display = 'none';
    }
  }

  /**
   * Loads and displays the current directory contents in the file browser
   */
  function loadCurrentDirectory() {
    try {
      const fs = require('fs');
      const path = require('path');

      // Get current project folder path
      const folderDisplay = document.querySelector('.current-folder-display');
      if (!folderDisplay || folderDisplay.classList.contains('no-project')) {
        alert('Please open a project folder first');
        return;
      }

      const projectPath = folderDisplay.textContent.startsWith('~/')
        ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
        : folderDisplay.textContent;

      const fullPath = path.join(projectPath, S.currentPath);

      if (!fs.existsSync(fullPath)) {
        S.currentPath = '/';
        loadCurrentDirectory();
        return;
      }

      const items = fs.readdirSync(fullPath);
      const fileList = document.getElementById('fileList');
      const currentPathDisplay = document.getElementById('currentPath');

      if (currentPathDisplay) {
        currentPathDisplay.textContent = S.currentPath;
      }

      if (fileList) {
        fileList.innerHTML = '';

        // Sort items: folders first, then Python files only
        const pythonFiles = items.filter(item => {
          const itemPath = path.join(fullPath, item);
          const stats = fs.statSync(itemPath);
          return stats.isDirectory() || item.endsWith('.py');
        }).sort((a, b) => {
          const aPath = path.join(fullPath, a);
          const bPath = path.join(fullPath, b);
          const aIsDir = fs.statSync(aPath).isDirectory();
          const bIsDir = fs.statSync(bPath).isDirectory();

          if (aIsDir && !bIsDir) return -1;
          if (!aIsDir && bIsDir) return 1;
          return a.localeCompare(b);
        });

        if (pythonFiles.length === 0) {
          const emptyMessage = document.createElement('div');
          emptyMessage.style.cssText = 'padding: 40px 20px; text-align: center; color: #999; font-style: italic; font-size: 14px;';
          emptyMessage.textContent = 'No assets found...';
          fileList.appendChild(emptyMessage);
        } else {
          pythonFiles.forEach(item => {
            const itemPath = path.join(fullPath, item);
            const stats = fs.statSync(itemPath);
            const isDirectory = stats.isDirectory();

            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            if (isDirectory) {
              fileItem.innerHTML = `<div class="file-icon"><img src="public/folder.png" alt="Folder" style="width: 20px; height: 20px;"></div><div class="file-name">${item}/</div>`;
              fileItem.addEventListener('click', () => {
                S.currentPath = path.join(S.currentPath, item);
                loadCurrentDirectory();
              });
            } else if (item.endsWith('.py')) {
              fileItem.innerHTML = `<div class="file-icon"><img src="public/python.png" alt="Python" style="width: 20px; height: 20px;"></div><div class="file-name">${item}</div>`;
              fileItem.addEventListener('click', () => {
                console.log('Python file clicked:', item);
                showFunctionSelection(item, itemPath);
              });
            }

            fileList.appendChild(fileItem);
          });
        }
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      alert('Error loading directory: ' + error.message);
    }
  }

  /**
   * Shows function selection interface for a specific Python file
   * @param {string} fileName - Name of the Python file
   * @param {string} filePath - Full path to the Python file
   */
  function showFunctionSelection(fileName, filePath) {
    try {
      console.log('showFunctionSelection called with:', fileName, filePath);

      const fs = require('fs');

      // Check if the path is actually a file, not a directory
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        alert('Please select a Python file, not a folder');
        return;
      }

      // Check if it's a Python file
      if (!fileName.endsWith('.py')) {
        alert('Please select a Python file (.py extension)');
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      console.log('File content length:', content.length);

      // Simple regex to find Python function definitions
      const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      const foundFunctions = [];
      let match;

      while ((match = functionRegex.exec(content)) !== null) {
        foundFunctions.push(match[1]);
      }

      console.log('Found functions:', foundFunctions);

      if (foundFunctions.length === 0) {
        alert('No functions found in this Python file');
        return;
      }

      const functionSelection = document.getElementById('functionSelection');
      const selectedFile = document.getElementById('selectedFile');
      const functionsCheckboxes = document.getElementById('functionsCheckboxes');

      console.log('DOM elements found:', { functionSelection, selectedFile, functionsCheckboxes });

      if (selectedFile) {
        selectedFile.textContent = fileName;
      }

      if (functionsCheckboxes) {
        functionsCheckboxes.innerHTML = '';

        foundFunctions.forEach(funcName => {
          const checkboxItem = document.createElement('div');
          checkboxItem.className = 'function-checkbox-item';

          // Check if this function is already added
          const isAlreadyAdded = S.functions.some(existingFunc =>
            existingFunc.name === funcName && existingFunc.file === fileName
          );

          console.log(`Function ${funcName} from ${fileName} - Already added: ${isAlreadyAdded}`);

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `func_${funcName}`;
          checkbox.value = funcName;
          checkbox.disabled = isAlreadyAdded;

          const label = document.createElement('label');
          label.htmlFor = `func_${funcName}`;
          label.textContent = funcName;

          // Add visual indication for already added functions
          if (isAlreadyAdded) {
            label.style.color = '#999';
            label.style.fontStyle = 'italic';
            label.textContent = `${funcName} (already added)`;
            checkboxItem.style.opacity = '0.6';
          }

          checkboxItem.appendChild(checkbox);
          checkboxItem.appendChild(label);
          functionsCheckboxes.appendChild(checkboxItem);
        });
      }

      if (functionSelection) {
        console.log('Setting functionSelection display to block');
        functionSelection.style.display = 'block';
        functionSelection.style.backgroundColor = '#e3f2fd';
        functionSelection.style.border = '2px solid #2196f3';
        console.log('Function selection area should now be visible');
      } else {
        console.error('functionSelection element not found!');
      }
    } catch (error) {
      console.error('Error reading Python file:', error);
      alert('Error reading file: ' + error.message);
    }
  }

  /**
   * Adds selected functions from the checkbox list to the project
   */
  function addSelectedFunctions() {
    const selectedFunctions = [];
    const checkboxes = document.querySelectorAll('#functionsCheckboxes input[type="checkbox"]:checked');

    checkboxes.forEach(checkbox => {
      const functionName = checkbox.value;
      const fileName = document.getElementById('selectedFile').textContent;

      // Double-check: prevent adding duplicates
      const isDuplicate = S.functions.some(existingFunc =>
        existingFunc.name === functionName && existingFunc.file === fileName
      );

      if (!isDuplicate) {
        selectedFunctions.push({
          id: Date.now() + Math.random(),
          name: functionName,
          file: fileName
        });
      } else {
        console.log(`Skipping duplicate function: ${functionName} from ${fileName}`);
      }
    });

    if (selectedFunctions.length === 0) {
      // Use global showCustomAlert if available
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(
          'No Functions to Add',
          'All selected functions are already added to your project.',
          () => {
            // Modal will close automatically
          }
        );
      } else {
        alert('All selected functions are already added to your project.');
      }
      return;
    }

    // Add to functions array
    S.functions.push(...selectedFunctions);

    // Update the functions list display
    updateFunctionsList();

    // Save to project credentials file
    if (typeof saveCredentialsToProject === 'function') {
      saveCredentialsToProject();
    }

    // Hide modal
    hideFunctionsModal();
  }

  /**
   * Hides the function details modal
   */
  function hideFunctionDetailsModal() {
    const modal = document.getElementById('functionDetailsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Shows detailed information about a specific function
   * @param {Object} func - Function object with name and file properties
   */
  function showFunctionDetails(func) {
    try {
      const fs = require('fs');
      const path = require('path');

      // Get current project folder path
      const folderDisplay = document.querySelector('.current-folder-display');
      if (!folderDisplay || folderDisplay.classList.contains('no-project')) {
        alert('Please open a project folder first');
        return;
      }

      const projectPath = folderDisplay.textContent.startsWith('~/')
        ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
        : folderDisplay.textContent;

      // Find the file in the project
      const filePath = findFileInProject(projectPath, func.file);

      if (!filePath) {
        alert('Could not find the file in the project');
        return;
      }

      // Read the file content
      const content = fs.readFileSync(filePath, 'utf8');

      // Find the specific function
      console.log('Looking for function:', func.name, 'in file:', filePath);
      console.log('File content length:', content.length);

      const functionRegex = new RegExp(`def\\s+${func.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\([^)]*\\):.*?(?=\\n\\s*def|\\n\\s*$|$)`, 'gs');
      const match = functionRegex.exec(content);

      let functionCode = 'Function not found in file';
      if (match) {
        console.log('Found function with regex:', match[0].substring(0, 100) + '...');
        functionCode = match[0];
      } else {
        console.log('Regex failed, trying simple approach...');
        // Try a simpler approach - find the function definition line and get a few lines after
        const simpleRegex = new RegExp(`def\\s+${func.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\([^)]*\\):`, 'g');
        const simpleMatch = simpleRegex.exec(content);
        if (simpleMatch) {
          console.log('Found function with simple regex at index:', simpleMatch.index);
          const startIndex = simpleMatch.index;
          const lines = content.substring(startIndex).split('\n');
          const functionLines = [];

          for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const line = lines[i];
            functionLines.push(line);

            // Stop if we hit another function definition or end of file
            if (i > 0 && line.trim().startsWith('def ') && !line.includes(func.name)) {
              functionLines.pop(); // Remove the last line as it's the start of another function
              break;
            }
          }

          functionCode = functionLines.join('\n');
          console.log('Extracted function code length:', functionCode.length);
        } else {
          console.log('Simple regex also failed. Function name might not match exactly.');
          // Show a sample of the file content to help debug
          const sampleContent = content.substring(0, 500);
          functionCode = `Function "${func.name}" not found in file.\n\nFile content sample:\n${sampleContent}`;
        }
      }

      // Update the modal content
      document.getElementById('detailFunctionName').textContent = func.name;
      document.getElementById('detailFilePath').textContent = filePath;
      document.getElementById('functionCodeSnippet').textContent = functionCode;

      // Show the modal
      const modal = document.getElementById('functionDetailsModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    } catch (error) {
      console.error('Error showing function details:', error);
      alert('Error reading function details: ' + error.message);
    }
  }

  // findFileInProject is now available globally from file_utilities.js

  /**
   * Updates the functions list display with optional filtering
   * @param {string} searchTerm - Optional search term to filter functions
   */
  function updateFunctionsList(searchTerm = '') {
    // Pull shared state (falls back gracefully if state.js hasn't loaded yet)
    const S = window.App?.state || window;
  
    const functionsList = document.querySelector('.functions-list');
    if (!functionsList) return;
  
    functionsList.innerHTML = '';
  
    // Filter functions based on search term using shared state
    const all = Array.isArray(S.functions) ? S.functions : [];
    const filteredFunctions = searchTerm
      ? all.filter(func =>
          func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          func.file.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : all;
  
    if (filteredFunctions.length === 0) {
      const noResultsMessage = document.createElement('div');
      noResultsMessage.style.cssText =
        'padding: 20px; text-align: center; color: #999; font-style: italic; font-size: 14px; font-weight: normal;';
      noResultsMessage.textContent = searchTerm ? 'No functions found...' : 'No functions added yet';
      functionsList.appendChild(noResultsMessage);
      return;
    }
  
    filteredFunctions.forEach(func => {
      const functionItem = document.createElement('div');
      functionItem.className = 'function-item';
  
      // Keep the dataset used by the drag logic
      functionItem.setAttribute('data-function-name', func.name);
      functionItem.setAttribute('data-function-file', func.file);
  
      const functionLogo = document.createElement('div');
      functionLogo.className = 'function-logo';
      functionLogo.textContent = 'F';
  
      const functionInfo = document.createElement('div');
      functionInfo.className = 'function-info';
  
      const functionName = document.createElement('div');
      functionName.className = 'function-name';
      // Also store the full name like in functions_browser.js for uniformity
      functionName.setAttribute('data-full-name', func.name);
      functionName.textContent = func.name.length > 15
        ? '...' + func.name.substring(func.name.length - 14)
        : func.name;
  
      const functionRoute = document.createElement('div');
      functionRoute.className = 'function-route';
      functionRoute.setAttribute('data-full-file', func.file);
      functionRoute.textContent = func.file.length > 11
        ? '...' + func.file.substring(func.file.length - 10)
        : func.file;
  
      functionInfo.appendChild(functionName);
      functionInfo.appendChild(functionRoute);
  
      // Delete button
      const deleteButton = document.createElement('button');
      deleteButton.className = 'function-delete-btn';
      deleteButton.innerHTML = '×';
      deleteButton.title = `Delete ${func.name}`;
  
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
  
        const doDelete = () => {
          S.functions = (S.functions || []).filter(f => f.id !== func.id);
          updateFunctionsList(searchTerm);
          if (typeof saveCredentialsToProject === 'function') {
            saveCredentialsToProject();
          }
        };
  
        if (typeof showCustomConfirm === 'function') {
          showCustomConfirm('Remove Function', `Are you sure you want to remove the function "${func.name}"?`, doDelete);
        } else if (confirm(`Are you sure you want to remove the function "${func.name}"?`)) {
          doDelete();
        }
      });
  
      functionItem.appendChild(functionLogo);
      functionItem.appendChild(functionInfo);
      functionItem.appendChild(deleteButton);
  
      // Show details on click (unchanged)
      functionItem.addEventListener('click', () => {
        showFunctionDetails(func);
      });
  
      functionsList.appendChild(functionItem);
    });
  
    // Only call if present (uniform with modular code)
    if (typeof makeItemsDraggable === 'function') {
      makeItemsDraggable();
    }
  }  

  /**
   * Gets the current functions array
   * @returns {Array} Current functions array
   */
  function getFunctions() {
    return S.functions;
  }

  /**
   * Sets the functions array
   * @param {Array} newFunctions - New functions array
   */
  function setFunctions(newFunctions) {
    S.functions = newFunctions || [];
    updateFunctionsList();
  }

  /**
   * Gets the current path
   * @returns {string} Current directory path
   */
  function getCurrentPath() {
    return S.currentPath;
  }

  /**
   * Sets the current path
   * @param {string} newPath - New directory path
   */
  function setCurrentPath(newPath) {
    S.currentPath = newPath || '/';
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.functionsBrowser = {
    showFunctionsModal,
    hideFunctionsModal,
    loadCurrentDirectory,
    showFunctionSelection,
    addSelectedFunctions,
    hideFunctionDetailsModal,
    showFunctionDetails,
    findFileInProject,
    updateFunctionsList,
    getFunctions,
    setFunctions,
    getCurrentPath,
    setCurrentPath
  };

  // Back-compat exports for global access
  global.showFunctionsModal = showFunctionsModal;
  global.hideFunctionsModal = hideFunctionsModal;
  global.loadCurrentDirectory = loadCurrentDirectory;
  global.showFunctionSelection = showFunctionSelection;
  global.addSelectedFunctions = addSelectedFunctions;
  global.hideFunctionDetailsModal = hideFunctionDetailsModal;
  global.showFunctionDetails = showFunctionDetails;
  global.findFileInProject = findFileInProject;
  global.updateFunctionsList = updateFunctionsList;

})(window);