// js/canvas_core.js - Canvas setup and item lifecycle
(function (global) {
  const S = global.App.state;

  // Use shared state for all canvas variables - no local copies
  // Access via S.canvasItems, S.canvasZoom, S.canvasPanX, S.canvasPanY
  // S.isDragging, S.draggedItem, S.dragOffset, S.CANVAS_WIDTH, S.CANVAS_HEIGHT

  function initializeCanvas() {
    const canvasGrid = document.querySelector('.canvas-grid');
    if (!canvasGrid) return;

    // Center the canvas initially
    const initContainer = document.querySelector('.canvas-container');
    const initContainerRect = initContainer.getBoundingClientRect();
    S.canvasPanX = (initContainerRect.width / 2) - (S.CANVAS_WIDTH / 2);
    S.canvasPanY = (initContainerRect.height / 2) - (S.CANVAS_HEIGHT / 2);
    updateCanvasZoom();

    // Show connectors on all existing canvas items (connection function)
    const existingItems = document.querySelectorAll('.canvas-item');
    existingItems.forEach(item => {
      if (global.showConnectorsOnItem) {
        global.showConnectorsOnItem(item);
      }
    });

    // Add zoom functionality
    document.querySelector('.zoom-in').addEventListener('click', () => {
      zoomToPoint(1.2, window.innerWidth / 2, window.innerHeight / 2);
      // Redraw all connections after zoom to fix positioning (connection function)
      setTimeout(() => {
        if (global.redrawAllConnections) {
          global.redrawAllConnections();
        }
      }, 100);
    });

    document.querySelector('.zoom-out').addEventListener('click', () => {
      zoomToPoint(1/1.2, window.innerWidth / 2, window.innerHeight / 2);
      // Redraw all connections after zoom to fix positioning (connection function)
      setTimeout(() => {
        if (global.redrawAllConnections) {
          global.redrawAllConnections();
        }
      }, 100);
    });

    // Add mouse wheel zoom
    const wheelContainer = document.querySelector('.canvas-container');
    wheelContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomToPoint(zoomDelta, e.clientX, e.clientY);
      // Redraw all connections after zoom to fix positioning (connection function)
      setTimeout(() => {
        if (global.redrawAllConnections) {
          global.redrawAllConnections();
        }
      }, 100);
    });

    // Add draw button functionality (connection-related)
    document.querySelector('.connect-button').addEventListener('click', () => {
      // Turn off activation modes when draw button is clicked (connection function)
      if (S.triangleActivationMode || S.circleActivationMode) {
        if (global.turnOffActivationModes) {
          global.turnOffActivationModes();
        }
      }

      if (global.toggleDrawingMode) {
        global.toggleDrawingMode();
      }
    });

    // Turn off drawing mode and activation modes when other elements are clicked
    document.addEventListener('click', (e) => {
      // Don't turn off if clicking on canvas elements or the connect button itself
      if (e.target.closest('.canvas-item') ||
          e.target.closest('.connection-line') ||
          e.target.closest('.connect-button') ||
          e.target.closest('.canvas-grid') ||
          e.target.closest('.canvas-container') ||
          e.target.closest('.canvas-content')) {
        return;
      }

      // Turn off drawing mode for any other clicks (connection function)
      if (S.isDrawingMode && global.turnOffDrawingMode) {
        global.turnOffDrawingMode();
      }

      // Turn off activation modes for any other clicks (connection function)
      if (global.turnOffActivationModes) {
        global.turnOffActivationModes();
      }
    });

    // Global mouseup handler to ensure stuck states are cleared
    document.addEventListener('mouseup', (e) => {
      // Clear any stuck panning state
      const panCanvasContent = document.querySelector('.canvas-content');
      if (panCanvasContent && panCanvasContent.classList.contains('panning')) {
        panCanvasContent.classList.remove('panning');
      }

      // Only clear stuck connection state if we're not over a canvas item (connection-related)
      // This prevents clearing the connection state when clicking on connectors
      const elementAtMouse = document.elementFromPoint(e.clientX, e.clientY);
      const isOverCanvasItem = elementAtMouse?.closest('.canvas-item');
      const isOverConnector = elementAtMouse?.closest('.left-connector, .right-connector');

      if (global.isConnecting && !isOverCanvasItem && !isOverConnector) {
        global.isConnecting = false;
        global.startConnector = null;
        document.body.classList.remove('connecting-cursor');
        if (global.connectionPreview) {
          global.connectionPreview.remove();
          global.connectionPreview = null;
        }
      }
    });

    // Add trash can drag over effects
    const trashCan = document.querySelector('.trash-can-btn');
    console.log('Trash can element found:', trashCan);

    if (trashCan) {
      console.log('Trash can element found and event listeners being attached');

      trashCan.addEventListener('dragover', (e) => {
        // Check if the dragged item is a canvas item or connection
        const draggedData = e.dataTransfer.types.includes('application/json');

        if (draggedData) {
          try {
            // We can't access dataTransfer.getData during dragover, but we can check for canvas items
            const draggedElement = document.querySelector('.dragging');

            // Only allow canvas items and connections to be dropped
            if (draggedElement && (draggedElement.classList.contains('canvas-item') || draggedElement.classList.contains('connection-line'))) {
              e.preventDefault();
              e.stopPropagation();
              trashCan.classList.add('drag-over');
              console.log('Canvas item or connection dragging over trash can - allowed');
            } else {
              // This is a sidebar item - don't allow drop
              console.log('Sidebar item dragging over trash can - rejected');
              return; // Don't prevent default, so drop won't be allowed
            }
          } catch (error) {
            console.log('Error checking drag data:', error);
            return; // Don't allow drop if we can't determine what's being dragged
          }
        }
      });

      trashCan.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        trashCan.classList.remove('drag-over');
        console.log('Left trash can - dragleave event');

        // Remove dragging-to-trash class from all items
        document.querySelectorAll('.dragging-to-trash').forEach(el => {
          el.classList.remove('dragging-to-trash');
        });
      });

      trashCan.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        trashCan.classList.remove('drag-over');

        console.log('Trash can drop event triggered');

        // Double-check that only canvas items or connections are being dropped
        const draggedElement = document.querySelector('.dragging');
        if (!draggedElement || (!draggedElement.classList.contains('canvas-item') && !draggedElement.classList.contains('connection-line'))) {
          console.log('Invalid drop target - only canvas items and connections can be deleted');
          return;
        }

        try {
          const jsonData = e.dataTransfer.getData('application/json');
          console.log('Drop data:', jsonData);

          if (jsonData) {
            const itemData = JSON.parse(jsonData);
            console.log('Parsed item data:', itemData);

            // Only handle canvas items and connections being dragged directly from canvas
            if (itemData.isConnection && global.deleteConnection) {
              // This is a connection being dragged directly from canvas
              global.deleteConnection(itemData.id);
              console.log('Deleted connection:', itemData.id);
            }
            else if (itemData.isCanvasItem && global.deleteCanvasItem) {
              // This is a canvas item being dragged directly from canvas
              global.deleteCanvasItem(itemData.id);
              console.log('Deleted canvas item:', itemData.id);
            } else {
              // This should not happen anymore due to the dragover filter
              console.log('Unexpected item type dropped on trash can');
            }
          }
        } catch (error) {
          console.error('Error handling trash drop:', error);
        }

        // Clean up any remaining dragging classes
        document.querySelectorAll('.dragging, .dragging-to-trash').forEach(el => {
          el.classList.remove('dragging', 'dragging-to-trash');
        });
      });

      console.log('Trash can event listeners attached successfully');
    } else {
      console.error('Trash can element not found!');
    }

    // Make functions and agents draggable
    makeItemsDraggable();

    // Add drop event listener to canvas
    const dropCanvasContent = document.querySelector('.canvas-content');
    console.log('Setting up drop events on:', dropCanvasContent);

    dropCanvasContent.addEventListener('dragover', (e) => {
      e.preventDefault();

      // Show visual feedback for where the item will be dropped
      const container = document.querySelector('.canvas-container');
      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      const worldX = (mouseX - S.canvasPanX) / S.canvasZoom;
      const worldY = (mouseY - S.canvasPanY) / S.canvasZoom;

      // Update cursor to show drop position
      dropCanvasContent.style.cursor = 'crosshair';

      console.log('Dragover - potential drop at:', { worldX, worldY, mouseX, mouseY });
    });

    dropCanvasContent.addEventListener('drop', (e) => {
      console.log('Drop event on canvas');
      handleCanvasDrop(e);

      // Reset cursor after drop
      dropCanvasContent.style.cursor = 'grab';
    });

    // Add global drag event handlers for debugging and visual feedback
    document.addEventListener('dragstart', (e) => {
      console.log('Global dragstart event:', e.target.id, e.target.className);
    });

    document.addEventListener('dragover', (e) => {
      console.log('Global dragover event:', e.target.className);

      // Check if we're dragging over the trash can
      const trashCan = document.querySelector('.trash-can-btn');
      if (trashCan) {
        const trashRect = trashCan.getBoundingClientRect();
        if (e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
            e.clientY >= trashRect.top && e.clientY <= trashRect.bottom) {
          // We're over the trash can, check what type of item is being dragged
          const draggedItem = document.querySelector('.dragging');
          if (draggedItem && (draggedItem.classList.contains('canvas-item') || draggedItem.classList.contains('connection-line'))) {
            // Canvas item or connection - show positive feedback
            draggedItem.classList.add('dragging-to-trash');
          } else {
            // Sidebar item or invalid item - don't add any special class
            // The trash can won't light up either due to the dragover handler
            console.log('Sidebar item over trash - no visual feedback');
          }
        }
      }
    });

    // Add global drag end handler to clean up dragging classes
    document.addEventListener('dragend', (e) => {

      // Turn off activation modes and drawing mode when drag ends (connection functions)
      if (S.triangleActivationMode || S.circleActivationMode) {
        if (global.turnOffActivationModes) {
          global.turnOffActivationModes();
        }
      }
      if (S.isDrawingMode && global.turnOffDrawingMode) {
        global.turnOffDrawingMode();
      }

      // Clean up any remaining dragging classes
      document.querySelectorAll('.dragging, .dragging-to-trash').forEach(el => {
        el.classList.remove('dragging', 'dragging-to-trash');
      });
    });

    // Add panning functionality
    const panCanvasContent = document.querySelector('.canvas-content');
    if (panCanvasContent) {
      let isPanning = false;
      let panStart = { x: 0, y: 0 };

      panCanvasContent.addEventListener('mousedown', (e) => {
        // Only pan if clicking on background, not on items
        if (e.target === panCanvasContent || e.target.classList.contains('canvas-grid') || e.target.classList.contains('canvas-container')) {
          isPanning = true;
          panStart.x = e.clientX;
          panStart.y = e.clientY;
          panCanvasContent.classList.add('panning');
          e.preventDefault();
          e.stopPropagation();
        }
      });

      document.addEventListener('mousemove', (e) => {
        if (isPanning) {
          const deltaX = e.clientX - panStart.x;
          const deltaY = e.clientY - panStart.y;

          // Update stored pan coordinates
          S.canvasPanX += deltaX;
          S.canvasPanY += deltaY;

          // Apply new transform
          updateCanvasZoom();

          panStart.x = e.clientX;
          panStart.y = e.clientY;
        }
      });

      document.addEventListener('mouseup', (e) => {
        if (isPanning) {
          isPanning = false;
          panCanvasContent.classList.remove('panning');

          // Force a reflow to ensure all positions are current
          document.body.offsetHeight;

          // Redraw with a small delay to ensure DOM has settled (connection function)
          setTimeout(() => {
            console.log('Executing pan end connection redraw');
            if (global.redrawAllConnections) {
              global.redrawAllConnections();
            }
          }, 50);
        }
      });

      // Also handle mouseup on the canvas content itself to ensure panning stops
      panCanvasContent.addEventListener('mouseup', (e) => {
        if (isPanning) {
          isPanning = false;
          panCanvasContent.classList.remove('panning');
      
          // Force a reflow
          document.body.offsetHeight;
      
          // Enqueue a burst of redraws to ensure lines settle
          for (let i = 0; i < 40; i++) {
            setTimeout(() => {
              console.log('Canvas mouseup redraw', i);
              if (global.redrawAllConnections) {
                global.redrawAllConnections();
              }
            }, i * 3);
          }
        }
      });      
    }
  }

  function updateCanvasZoom() {
    const canvasContent = document.querySelector('.canvas-content');
    if (canvasContent) {
      // Use stored pan coordinates
      canvasContent.style.transform = `translate3d(${S.canvasPanX}px, ${S.canvasPanY}px, 0) scale(${S.canvasZoom})`;

      // Redraw all connections after zoom/pan (connection function)
      if (global.redrawAllConnections) {
        global.redrawAllConnections();
      }
    }
  }

  function toggleDrawingMode() {
    S.isDrawingMode = !S.isDrawingMode;
    const canvasGrid = document.querySelector('.canvas-grid');
    const drawButton = document.querySelector('.connect-button');

    if (S.isDrawingMode) {
      if (canvasGrid) canvasGrid.classList.add('drawing-mode');
      if (drawButton) {
        drawButton.style.backgroundColor = '#b0e0e6'; // Even lighter blue
        drawButton.style.color = 'white';
        drawButton.style.borderColor = '#b0e0e6';
      }
    } else {
      if (canvasGrid) canvasGrid.classList.remove('drawing-mode');
      if (drawButton) {
        drawButton.style.backgroundColor = '';
        drawButton.style.color = '';
        drawButton.style.borderColor = '';
      }
      S.drawingStartItem = null;
    }
    
    // Turn off activation modes when entering drawing mode
    if (S.isDrawingMode) {
      if (global.turnOffActivationModes) {
        global.turnOffActivationModes();
      }
    }
    
    console.log('Drawing mode toggled:', S.isDrawingMode);
  }

  function zoomToPoint(zoomDelta, mouseX, mouseY) {
    const oldZoom = S.canvasZoom;
    S.canvasZoom = Math.max(0.1, Math.min(5, S.canvasZoom * zoomDelta));

    if (S.canvasZoom !== oldZoom) {
      // Calculate zoom anchor point
      const container = document.querySelector('.canvas-container');
      const containerRect = container.getBoundingClientRect();

      // Convert mouse position to canvas coordinates
      const canvasX = (mouseX - containerRect.left - canvasPanX) / oldZoom;
      const canvasY = (mouseY - containerRect.top - canvasPanY) / oldZoom;

      // Adjust pan to keep mouse point fixed
      S.canvasPanX = mouseX - containerRect.left - (canvasX * S.canvasZoom);
      S.canvasPanY = mouseY - containerRect.top - (canvasY * S.canvasZoom);

      updateCanvasZoom();

      // Redraw all connections after zoom to fix positioning (connection function)
      setTimeout(() => {
        if (global.redrawAllConnections) {
          global.redrawAllConnections();
        }
      }, 100);
    }
  }

  function makeItemsDraggable() {
    // Make function items draggable
    const functionItems = document.querySelectorAll('.function-item');
    functionItems.forEach(item => {
      item.draggable = true;
      item.addEventListener('dragstart', handleDragStart);
    });

    // Make agent items draggable
    const agentItems = document.querySelectorAll('.agent-item');
    agentItems.forEach(item => {
      item.draggable = true;
      item.addEventListener('dragstart', handleDragStart);
    });
  }

  function handleDragStart(e) {
    // Turn off activation modes and drawing mode when starting to drag (connection functions)
    if (S.triangleActivationMode || S.circleActivationMode) {
      if (typeof global.turnOffActivationModes === 'function') {
        global.turnOffActivationModes();
      }
    }
    if (S.isDrawingMode && typeof global.turnOffDrawingMode === 'function') {
      global.turnOffDrawingMode();
    }

    const item = e.currentTarget || e.target;
    const itemType = item.classList.contains('function-item') ? 'function' : 'agent';

    let itemData;

    if (itemType === 'function') {
      // Get the full function data from data attributes (both item-level and element-level)
      const functionName = item.getAttribute('data-function-name') || item.querySelector('.function-name')?.getAttribute('data-full-name') || item.querySelector('.function-name')?.textContent?.trim() || '';
      const functionFile = item.getAttribute('data-function-file') || item.querySelector('.function-route')?.getAttribute('data-full-file') || item.querySelector('.function-route')?.textContent?.trim() || '';

      // Find the function in S.functions array using BOTH name and file for exact match
      const functionData = S.functions.find(f => f.name === functionName && f.file === functionFile);

      if (functionData) {
        itemData = {
          type: itemType,
          name: functionData.name,
          file: functionData.file,
          color: '#007bff',
          dragStartX: e.clientX,
          dragStartY: e.clientY
        };
      } else {
        // Fallback to data attributes if function not found in array
        itemData = {
          type: itemType,
          name: functionName,
          file: functionFile,
          color: '#007bff',
          dragStartX: e.clientX,
          dragStartY: e.clientY
        };
      }
    } else {
      // Agent handling
      const agentColorFn = (typeof global.getAgentColor === 'function') ? global.getAgentColor : () => '#007bff';
      itemData = {
        type: itemType,
        name: item.querySelector('.agent-name')?.textContent?.trim() || '',
        color: agentColorFn(item),
        dragStartX: e.clientX,
        dragStartY: e.clientY
      };
    }

    e.dataTransfer.setData('application/json', JSON.stringify(itemData));
    e.dataTransfer.effectAllowed = 'copy';

    // Store for breadcrumb access
    S._lastDrag = itemData;

    console.log('Drag start from bar:', {
      itemType,
      itemName: itemData.name,
      itemFile: itemData.file,
      dragStartX: e.clientX,
      dragStartY: e.clientY
    });
  }

  function getAgentColor(agentItem) {
    // Find the agent in the agents array to get its color
    const agentName = agentItem.querySelector('.agent-name').textContent;
    const agent = global.agents ? global.agents.find(a => a.name === agentName) : null;
    return agent ? agent.color : '#007bff';
  }

  function handleCanvasDrop(e) {
    e.preventDefault();

    // Turn off activation modes and drawing mode when dropping items (connection functions)
    if (S.triangleActivationMode || S.circleActivationMode) {
      if (global.turnOffActivationModes) {
        global.turnOffActivationModes();
      }
    }
    if (S.isDrawingMode && global.turnOffDrawingMode) {
      global.turnOffDrawingMode();
    }

    const container = document.querySelector('.canvas-container');
    const containerRect = container.getBoundingClientRect();

    // Get the exact mouse position relative to the container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Convert to world coordinates by accounting for current pan and zoom
    const worldX = (mouseX - S.canvasPanX) / S.canvasZoom;
    const worldY = (mouseY - S.canvasPanY) / S.canvasZoom;

    try {
      const itemData = JSON.parse(e.dataTransfer.getData('application/json'));

      // For items dragged from bars, we want them to appear centered on the mouse
      // For items already on canvas, we maintain their relative position
      let finalX = worldX;
      let finalY = worldY;

      if (itemData.dragStartX !== undefined) {
        // This is a new item from a bar - let's try placing it exactly at the mouse position first
        finalX = worldX;
        finalY = worldY;

        console.log('New item from bar - placing at mouse position:', {
          originalX: worldX,
          originalY: worldY,
          finalX,
          finalY,
          mouseX,
          mouseY,
          isFromBar: true
        });
      }

      console.log('Drop coordinates:', {
        mouseX,
        mouseY,
        worldX,
        worldY,
        finalX,
        finalY,
        screenX: e.clientX,
        screenY: e.clientY,
        panX: canvasPanX,
        panY: canvasPanY,
        zoom: S.canvasZoom,
        containerLeft: containerRect.left,
        containerTop: containerRect.top,
        isFromBar: itemData.dragStartX !== undefined,
        dragStartData: itemData.dragStartX ? { x: itemData.dragStartX, y: itemData.dragStartY } : null
      });

      createCanvasItem(itemData, finalX, finalY);
    } catch (error) {
      console.error('Error parsing dropped item data:', error);
    }
  }

  function createCanvasItem(itemData, x, y) {
    const canvasContent = document.querySelector('.canvas-content');
    const item = document.createElement('div');
    const itemId = 'canvas-item-' + Date.now();

    item.className = `canvas-item ${itemData.type}-item new-item`;
    item.id = itemId;

    // Set the position - this should be exactly where the mouse was
    item.style.left = x + 'px';
    item.style.top = y + 'px';

    // Remove the new-item class after animation
    setTimeout(() => {
      item.classList.remove('new-item');
    }, 500);

    if (itemData.type === 'function') {
      item.innerHTML = `
        <div class="function-logo">F</div>
        <div class="item-name">${itemData.name}</div>
        <div class="item-details">${itemData.file || 'No file specified'}</div>
      `;
    } else {
      item.innerHTML = `
        <div class="agent-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" fill="${itemData.color}"/>
            <path d="M20 21C20 16.5817 16.4183 13 4 16.5817 4 21" stroke="${itemData.color}" stroke-width="2" fill="none"/>
          </svg>
        </div>
        <div class="item-name">${itemData.name}</div>
        <div class="item-details">Agent</div>
      `;
    }

    // Make canvas items draggable
    makeCanvasItemInteractive(item);

    canvasContent.appendChild(item);
    S.canvasItems.push({ id: itemId, data: itemData, element: item });

    // Always show connectors on canvas items (connection function)
    if (global.showConnectorsOnItem) {
      global.showConnectorsOnItem(item);
    }

    console.log('Created canvas item:', {
      id: itemId,
      type: itemData.type,
      name: itemData.name,
      position: { x, y },
      styleLeft: item.style.left,
      styleTop: item.style.top
    });
  }

  function makeCanvasItemInteractive(item) {
    item.addEventListener('mousedown', (e) => handleCanvasItemMouseDown(e, item));

    // Make canvas items draggable to trash can
    item.setAttribute('draggable', 'true');
    console.log('Made canvas item draggable:', item.id, 'draggable attribute:', item.getAttribute('draggable'));

    // Set up drag start handler for trash can deletion
    item.addEventListener('dragstart', (dragEvent) => {
      console.log('Drag start event triggered for:', item.id);

      // Store the item ID for deletion
      const itemData = {
        id: item.id,
        isCanvasItem: true
      };
      dragEvent.dataTransfer.setData('application/json', JSON.stringify(itemData));
      dragEvent.dataTransfer.effectAllowed = 'move';

      // Add dragging class for visual feedback
      item.classList.add('dragging');
      console.log('Canvas item drag started:', item.id, 'z-index:', item.style.zIndex);
    });

    // Add drag end handler to clean up classes and redraw connections
    item.addEventListener('dragend', (dragEvent) => {
      console.log('Drag end event triggered for:', item.id);
      item.classList.remove('dragging', 'dragging-to-trash');

      // Redraw all connections involving this item to ensure perfect positioning
      // Monitor the element's icon transform until it returns to normal size
      const checkIconTransform = () => {
        const element = document.getElementById(item.id);
        if (element) {
          const functionLogo = element.querySelector('.function-logo');
          const agentIcon = element.querySelector('.agent-icon');

          // Check if any icon is still scaled
          let isIconScaled = false;
          if (functionLogo) {
            const logoStyle = window.getComputedStyle(functionLogo);
            const logoTransform = logoStyle.transform;
            if (logoTransform !== 'none' && logoTransform.includes('scale(1.3)')) {
              isIconScaled = true;
            }
          }
          if (agentIcon) {
            const iconStyle = window.getComputedStyle(agentIcon);
            const iconTransform = iconStyle.transform;
            if (iconTransform !== 'none' && iconTransform.includes('scale(1.3)')) {
              isIconScaled = true;
            }
          }

          if (!isIconScaled) {
            // Icons are back to normal size, redraw connections (connection function)
            console.log('Icons returned to normal size, redrawing connections');
            if (global.redrawConnectionsForItem) {
              global.redrawConnectionsForItem(item.id);
            }
          } else {
            // Still scaling, check again in 20ms
            setTimeout(checkIconTransform, 20);
          }
        }
      };

      // Start checking immediately
      checkIconTransform();
    });
  }

  function handleCanvasItemMouseDown(e, item) {
    // Completely disable item dragging when in drawing mode (check via global)
    if (S.isDrawingMode) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // Don't interfere with drag operations - let them handle themselves
    if (e.target.hasAttribute('draggable') && e.target.getAttribute('draggable') === 'true') {
      // If this is a draggable item, don't set up mouse dragging
      // Let the HTML5 drag and drop handle it
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    S.isDragging = true;
    S.draggedItem = item;

    // Get the item's current world position
    const itemLeft = parseFloat(item.style.left) || 0;
    const itemTop = parseFloat(item.style.top) || 0;

    // Get mouse position in world coordinates
    const container = document.querySelector('.canvas-container');
    const containerRect = container.getBoundingClientRect();
    const mouseWorldX = (e.clientX - containerRect.left - S.canvasPanX) / S.canvasZoom;
    const mouseY = (e.clientY - containerRect.top - S.canvasPanY) / S.canvasZoom;

    // Calculate offset from mouse to item center in world coordinates
    S.dragOffset.x = mouseWorldX - itemLeft;
    S.dragOffset.y = mouseY - itemTop;

    console.log('Starting mouse drag:', {
      itemLeft,
      itemTop,
      mouseWorldX,
      mouseY,
      dragOffset: { x: S.dragOffset.x, y: S.dragOffset.y }
    });

    item.classList.add('dragging');

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e) {
    if (!S.isDragging || !S.draggedItem) return;

    const container = document.querySelector('.canvas-container');
    const containerRect = container.getBoundingClientRect();

    // Convert screen coordinates to world coordinates
    const mouseWorldX = (e.clientX - containerRect.left - S.canvasPanX) / S.canvasZoom;
    const mouseWorldY = (e.clientY - containerRect.top - S.canvasPanY) / S.canvasZoom;

    // Apply the drag offset to get the new item position
    const newWorldX = mouseWorldX - S.dragOffset.x;
    const newWorldY = mouseWorldY - S.dragOffset.y;

    // Update item position in world coordinates
    S.draggedItem.style.left = newWorldX + 'px';
    S.draggedItem.style.top = newWorldY + 'px';

    // NEW: show trash hover state during custom drag
    const trash = document.querySelector('.trash-can-btn');
    if (trash) {
      const r = trash.getBoundingClientRect();
      const over =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top  && e.clientY <= r.bottom;

      // Visual feedback
      trash.classList.toggle('drag-over', over);
      S.draggedItem.classList.toggle('dragging-to-trash', over);

      // Optional debugging flag
      S._overTrash = over;
    } else {
      S._overTrash = false;
    }

    // Redraw all connections involving this item (connection function)
    if (global.redrawConnectionsForItem) {
      global.redrawConnectionsForItem(S.draggedItem.id);
    }

    console.log('Dragging:', {
      mouseWorldX,
      mouseWorldY,
      newWorldX,
      newWorldY,
      dragOffset: { x: S.dragOffset.x, y: S.dragOffset.y }
    });
  }

  function handleMouseUp(e) {
    if (S.draggedItem) {
      // NEW: if released over trash, delete and exit early
      const trash = document.querySelector('.trash-can-btn');
      if (trash && e) {
        const r = trash.getBoundingClientRect();
        const over =
          e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top  && e.clientY <= r.bottom;

        if (over) {
          const id = S.draggedItem.id;

          // Clear UI state
          trash.classList.remove('drag-over');
          S.draggedItem.classList.remove('dragging', 'dragging-to-trash');

          // Stop custom drag listeners before deletion
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);

          // Reuse existing API (also removes associated connections)
          if (global.deleteCanvasItem) global.deleteCanvasItem(id);

          S.isDragging = false;
          S.draggedItem = null;
          return; // Skip position update & redraw path
        }
      }

      S.draggedItem.classList.remove('dragging');
      // Update the item's position in our data
      updateItemPosition(S.draggedItem);

      // Final redraw of connections for this item
      // Wait for the element to return to normal size before redrawing connections
      console.log('Mouse drag ended, redrawing connections for item:', S.draggedItem.id);

      // Monitor the element's icon transform until it returns to normal size
      const checkIconTransform = () => {
        const element = document.getElementById(S.draggedItem.id);
        if (element) {
          const functionLogo = element.querySelector('.function-logo');
          const agentIcon = element.querySelector('.agent-icon');

          // Check if any icon is still scaled
          let isIconScaled = false;
          if (functionLogo) {
            const logoStyle = window.getComputedStyle(functionLogo);
            const logoTransform = logoStyle.transform;
            if (logoTransform !== 'none' && logoTransform.includes('scale(1.3)')) {
              isIconScaled = true;
            }
          }
          if (agentIcon) {
            const iconStyle = window.getComputedStyle(agentIcon);
            const iconTransform = iconStyle.transform;
            if (iconTransform !== 'none' && iconTransform.includes('scale(1.3)')) {
              isIconScaled = true;
            }
          }

          if (!isIconScaled) {
            // Icons are back to normal size, redraw connections (connection function)
            console.log('Icons returned to normal size, redrawing connections');
            if (global.redrawConnectionsForItem) {
              global.redrawConnectionsForItem(S.draggedItem.id);
            }
          } else {
            // Still scaling, check again in 20ms
            setTimeout(checkIconTransform, 20);
          }
        }
      };

      // Start checking immediately
      checkIconTransform();

      // Keep items draggable to trash can after moving them
      if (S.draggedItem) {
        S.draggedItem.setAttribute('draggable', 'true');
      }
    }
    S.isDragging = false;
    S.draggedItem = null;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  function updateItemPosition(item) {
    const itemId = item.id;
    const canvasItem = S.canvasItems.find(ci => ci.id === itemId);
    if (canvasItem) {
      canvasItem.x = parseFloat(item.style.left) || 0;
      canvasItem.y = parseFloat(item.style.top) || 0;
    }
  }

  function deleteCanvasItem(itemId) {
    const itemIndex = S.canvasItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      const item = S.canvasItems[itemIndex];
      if (item.element) {
        item.element.remove();
      }
      S.canvasItems.splice(itemIndex, 1);

      // Find connections involving this item
      const connectionsToRemove = S.connections.filter(conn =>
        (typeof conn.startItemId === 'string' &&
          (conn.startItemId === itemId || conn.endItemId === itemId))
      );

      // Remove connection elements from DOM
      connectionsToRemove.forEach(conn => {
        const connectionElement = document.getElementById(conn.id);
        if (connectionElement) {
          connectionElement.remove();
        }
      });

      // Remove connections from the array
      S.connections = S.connections.filter(conn =>
        !(typeof conn.startItemId === 'string' &&
          (conn.startItemId === itemId || conn.endItemId === itemId))
      );

      // Reset connector states for remaining items that might have lost connections
      if (global.resetConnectorStates) {
        global.resetConnectorStates();
      }

      console.log(`Deleted item ${itemId} and ${connectionsToRemove.length} associated connections`);
    }
  }

  function deleteConnection(connectionId) {
    // Find the connection in the array
    const connectionIndex = S.connections.findIndex(conn => conn.id === connectionId);
    if (connectionIndex !== -1) {
      const connectionData = S.connections[connectionIndex];

      // Remove the connection element from DOM
      const connectionElement = document.getElementById(connectionId);
      if (connectionElement) {
        connectionElement.remove();
      }

      // Remove the connection from the array
      S.connections.splice(connectionIndex, 1);

      // Reset connector states for the items that were connected
      if (connectionData.startItemId && global.resetConnectorStatesForItem) {
        global.resetConnectorStatesForItem(connectionData.startItemId);
      }
      if (connectionData.endItemId && global.resetConnectorStatesForItem) {
        global.resetConnectorStatesForItem(connectionData.endItemId);
      }

      console.log(`Deleted connection ${connectionId}`);
    }
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.canvasCore = {
    initializeCanvas,
    updateCanvasZoom,
    zoomToPoint,
    toggleDrawingMode,
    updateFunctionsList,
    makeItemsDraggable,
    handleDragStart,
    handleCanvasDrop,
    createCanvasItem,
    makeCanvasItemInteractive,
    handleCanvasItemMouseDown,
    handleMouseMove,
    handleMouseUp,
    updateItemPosition,
    deleteCanvasItem,
    deleteConnection,
    getCanvasItems: () => S.canvasItems,
    getCanvasZoom: () => S.canvasZoom,
    getCanvasPan: () => ({ x: S.canvasPanX, y: S.canvasPanY }),
    setCanvasZoom: (zoom) => { S.canvasZoom = zoom; },
    setCanvasPan: (x, y) => { S.canvasPanX = x; S.canvasPanY = y; }
  };

  // Back-compat exports for global access
  global.initializeCanvas = initializeCanvas;
  global.updateCanvasZoom = updateCanvasZoom;
  global.zoomToPoint = zoomToPoint;
  global.toggleDrawingMode = toggleDrawingMode;
  global.updateFunctionsList = updateFunctionsList;
  global.makeItemsDraggable = makeItemsDraggable;
  global.handleDragStart = handleDragStart;
  global.handleCanvasDrop = handleCanvasDrop;
  global.createCanvasItem = createCanvasItem;
  global.makeCanvasItemInteractive = makeCanvasItemInteractive;
  global.handleCanvasItemMouseDown = handleCanvasItemMouseDown;
  global.handleMouseMove = handleMouseMove;
  global.handleMouseUp = handleMouseUp;
  global.updateItemPosition = updateItemPosition;
  global.deleteCanvasItem = deleteCanvasItem;
  global.deleteConnection = deleteConnection;

})(window);