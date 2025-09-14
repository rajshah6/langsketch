// js/agents.js - Agents scanning and rendering
(function (global) {
  const S = global.App.state;

  function scanForAgents() {
    try {
      const fs = require('fs');
      const path = require('path');

      // Get current project folder path
      const folderDisplay = document.querySelector('.current-folder-display');
      if (!folderDisplay || folderDisplay.classList.contains('no-project')) {
        return; // No project open
      }

      const projectPath = folderDisplay.textContent.startsWith('~/')
        ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
        : folderDisplay.textContent;

      const agentsFolderPath = path.join(projectPath, 'agents');

      if (!fs.existsSync(agentsFolderPath)) {
        // Create agents folder if it doesn't exist
        fs.mkdirSync(agentsFolderPath, { recursive: true });
        S.agents = [];
        updateAgentsList();
        return;
      }

      const agentFiles = fs.readdirSync(agentsFolderPath)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          try {
            const filePath = path.join(agentsFolderPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const fileData = JSON.parse(content);

            return {
              name: file.replace('.json', ''),
              color: fileData.color || '#007bff',
              filePath: filePath
            };
          } catch (error) {
            console.error(`Error reading agent file ${file}:`, error);
            return {
              name: file.replace('.json', ''),
              color: '#007bff',
              filePath: path.join(agentsFolderPath, file)
            };
          }
        });

      S.agents = agentFiles;
      updateAgentsList();

    } catch (error) {
      console.error('Error scanning for agents:', error);
      S.agents = [];
      updateAgentsList();
    }
  }

  function updateAgentsList() {
    const agentsList = document.getElementById('agentsList');
    if (!agentsList) return;

    agentsList.innerHTML = '';

    if (S.agents.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.style.cssText = 'text-align: center; color: #999; font-style: italic; font-size: 14px; padding: 20px;';
      emptyMessage.textContent = 'No agents found';
      agentsList.appendChild(emptyMessage);
      return;
    }

    S.agents.forEach(agent => {
      const agentItem = document.createElement('div');
      agentItem.className = 'agent-item';

      const agentIcon = document.createElement('div');
      agentIcon.className = 'agent-icon';

      const agentIconInner = document.createElement('div');
      agentIconInner.className = 'agent-icon-inner';
      agentIconInner.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" fill="${agent.color}"/>
          <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke="${agent.color}" stroke-width="2" fill="none"/>
        </svg>
      `;

      agentIcon.appendChild(agentIconInner);

      const agentName = document.createElement('div');
      agentName.className = 'agent-name';
      agentName.textContent = agent.name;

      agentItem.appendChild(agentIcon);
      agentItem.appendChild(agentName);

      // Add click functionality for future agent management
      agentItem.addEventListener('click', () => {
        console.log('Agent clicked:', agent.name);
        // TODO: Add agent details or management functionality
      });

      agentsList.appendChild(agentItem);
    });

    // Also update the main agents listing if it exists
    if (document.getElementById('agentsListingSection')) {
      // This is now handled by the AgentsTab component
    }

    // Update the component instance if it exists
    if (window.agentsTabInstance) {
      window.agentsTabInstance.refresh();
    }
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.agents = {
    scanForAgents,
    updateAgentsList
  };

  // Back-compat exports for global access
  global.scanForAgents = scanForAgents;
  global.updateAgentsList = updateAgentsList;

})(window);