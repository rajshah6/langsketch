// js/ipc_window.js - IPC window control functions
(function (global) {
  const S = global.App.state;
  const { ipcRenderer } = require('electron');

  // Make ipcRenderer globally available for analytics and other modules
  global.ipcRenderer = ipcRenderer;

  function minimizeWindow() {
    ipcRenderer.invoke('minimize-window');
  }

  function maximizeWindow() {
    try {
      ipcRenderer.invoke('maximize-window');
      // Don't immediately toggle the state - wait for the actual window state change
      // The state will be updated via the IPC event or resize listener
    } catch (error) {
      console.error('Error maximizing window:', error);
    }
  }

  function closeWindow() {
    ipcRenderer.invoke('close-window');
  }

  function updateMaximizeButton() {
    const maximizeBtn = document.getElementById('maximizeBtn');
    const titleBar = document.querySelector('.title-bar');

    if (isMaximized) {
      maximizeBtn.innerHTML = '↙';
      maximizeBtn.title = 'Restore';
      titleBar.classList.add('maximized');
    } else {
      maximizeBtn.innerHTML = '↗';
      maximizeBtn.title = 'Maximize';
      titleBar.classList.remove('maximized');
    }
  }

  function resetHoverState() {
    // Force remove hover state using CSS variable
    const windowControls = document.querySelector('.window-controls');
    if (windowControls) {
      // Force the CSS variable to 0 to reset hover state
      windowControls.style.setProperty('--hover-active', '0');

      // Restore normal functionality after a short delay
      setTimeout(() => {
        windowControls.style.removeProperty('--hover-active');
      }, 150);
    }
  }

  // Listen for window state changes from main process
  ipcRenderer.on('window-state-changed', (event, state) => {
    console.log('Window state changed to:', state);
    isMaximized = (state === 'maximized');
    updateMaximizeButton();
  });

  // Also listen for window resize events to keep button in sync
  window.addEventListener('resize', () => {
    // Small delay to ensure the window state has updated
    setTimeout(() => {
      try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.invoke('get-window-state').then(state => {
          console.log('Window state from resize event:', state);
          isMaximized = (state === 'maximized');
          updateMaximizeButton();
        }).catch(error => {
          console.error('Error getting window state:', error);
        });
      } catch (error) {
        console.error('Error in resize handler:', error);
      }
    }, 100);
  });

  // Export to App namespace
  global.App = global.App || {};
  global.App.ipcWindow = {
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    updateMaximizeButton,
    resetHoverState
  };

  // Back-compat exports for global access
  global.minimizeWindow = minimizeWindow;
  global.maximizeWindow = maximizeWindow;
  global.closeWindow = closeWindow;
  global.updateMaximizeButton = updateMaximizeButton;
  global.resetHoverState = resetHoverState;

})(window);