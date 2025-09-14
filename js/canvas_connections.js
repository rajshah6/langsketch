// js/canvas_connections.js - Connectors and connections
(function (global) {
  const S = global.App.state;

  // Use shared state for connection variables - no local copies
  // Access via S.isConnecting, S.connectionPreview, S.startConnector

  function showConnectorsOnItem(item) {
    console.log('🔗 showConnectorsOnItem called for item:', item.id);
    // Remove existing connectors first
    hideConnectorsOnItem(item);

    // Create left connector (triangle)
    const leftConnector = document.createElement('div');
    leftConnector.className = 'connector left-connector';
    leftConnector.dataset.side = 'left';
    // Removed red border and background for cleaner appearance

    // Create SVG triangle
    const triangleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    triangleSvg.setAttribute('width', '16');
    triangleSvg.setAttribute('height', '16');
    triangleSvg.setAttribute('viewBox', '0 0 16 16');

    // Create white triangle with black outline
    const whiteTriangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    whiteTriangle.setAttribute('points', '16,8 0,0 0,16');
    whiteTriangle.setAttribute('fill', 'white');
    whiteTriangle.setAttribute('stroke', 'black');
    whiteTriangle.setAttribute('stroke-width', '2');

    triangleSvg.appendChild(whiteTriangle);
    leftConnector.appendChild(triangleSvg);

    // Create right connector
    const rightConnector = document.createElement('div');
    rightConnector.className = 'connector right-connector';
    rightConnector.dataset.side = 'right';
    // Removed blue border and background for cleaner appearance

    // Add connectors to the item
    item.appendChild(leftConnector);
    item.appendChild(rightConnector);

    console.log('🔗 Connectors added to item:', item.id, 'Left:', leftConnector, 'Right:', rightConnector);

    // Add mouse down handlers for drawing connections
    leftConnector.addEventListener('mousedown', (e) => {
      console.log('🖱️ Left connector mousedown event triggered for item:', item.id);
      handleConnectorMouseDown(e, item, 'left');
    });
    rightConnector.addEventListener('mousedown', (e) => {
      console.log('🖱️ Right connector mousedown event triggered for item:', item.id);
      handleConnectorMouseDown(e, item, 'right');
    });

    console.log('🔗 Event listeners attached to connectors for item:', item.id);
  }

  function hideConnectorsOnItem(item) {
    const existingConnectors = item.querySelectorAll('.connector');
    existingConnectors.forEach(connector => connector.remove());
  }

  function handleConnectorMouseDown(e, item, side) {
    e.stopPropagation();
    e.preventDefault();

    // Handle left connector activation when start button is active
    if (side === 'left' && S.triangleActivationMode) {
      // Check if this triangle is already connected
      if (item.querySelector('.left-connector').classList.contains('connected')) {
        console.log('Cannot activate already connected triangle');
        return;
      }

      // Toggle activation state
      const leftConnector = item.querySelector('.left-connector');
      const isActivated = leftConnector.classList.contains('activated');

      if (isActivated) {
        // Deactivate
        leftConnector.classList.remove('activated');
      } else {
        // Activate
        leftConnector.classList.add('activated');
        // Automatically deactivate start button after selecting one triangle
        const startBtn = document.querySelector('.start-btn');
        if (startBtn) {
          startBtn.classList.remove('active');
          S.triangleActivationMode = false;
        }
      }
      return;
    }

    // Handle right connector activation when stop button is active
    if (side === 'right' && S.circleActivationMode) {
      // Check if this circle is already connected
      if (item.querySelector('.right-connector').classList.contains('connected')) {
        return;
      }

      // Toggle activation state
      const rightConnector = item.querySelector('.right-connector');
      const isActivated = rightConnector.classList.contains('activated');

      if (isActivated) {
        // Deactivate
        rightConnector.classList.remove('activated');
      } else {
        // Activate
        rightConnector.classList.add('activated');
        // Automatically deactivate stop button after selecting one circle
        const stopBtn = document.querySelector('.stop-btn');
        if (stopBtn) {
          stopBtn.classList.remove('active');
          S.circleActivationMode = false;
        }
      }
      return;
    }

    if (!S.isDrawingMode) {
      return;
    }

    // Only allow starting from right connectors
    if (side !== 'right') {
      return;
    }

    // Prevent connection drawing from activated (red) circles
    if (item.querySelector('.right-connector').classList.contains('activated')) {
      return;
    }

    // Calculate world coordinates for the start connector
    const startRect = item.getBoundingClientRect();
    const container = document.querySelector('.canvas-container');
    const containerRect = container.getBoundingClientRect();

    const screenToWorld = (screenX, screenY) => ({
      x: (screenX - containerRect.left - S.canvasPanX) / S.canvasZoom,
      y: (screenY - containerRect.top - S.canvasPanY) / S.canvasZoom
    });

    const startConnectorScreenX = startRect.right; // Right edge where connector center is
    const startConnectorScreenY = startRect.top + startRect.height / 2; // Vertical center
    const startWorld = screenToWorld(startConnectorScreenX, startConnectorScreenY);

    S.isConnecting = true;
    S.startConnector = { item, side, worldX: startWorld.x, worldY: startWorld.y };

    // Add connecting cursor to body
    document.body.classList.add('connecting-cursor');

    // Create preview line
    createConnectionPreview(e);

    // Add mouse move and up listeners
    document.addEventListener('mousemove', handleConnectionDrag);
    document.addEventListener('mouseup', handleConnectionEnd);
  }

  function createConnectionPreview(e) {
    // Remove existing preview
    if (S.connectionPreview) {
      S.connectionPreview.remove();
    }

    // Use the world coordinates already calculated in startConnector
    const container = document.querySelector('.canvas-container');
    const containerRect = container.getBoundingClientRect();

    // Create a canvas-contained SVG overlay for the preview
    let svg;
    try {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.className = 'connection-preview';
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '1001';
    } catch (error) {
      return;
    }

    // Get start position in screen coordinates
    const startItem = S.startConnector.item;
    const startRect = startItem.getBoundingClientRect();
    const startScreenX = startRect.right; // Right edge where connector center is
    const startScreenY = startRect.top + startRect.height / 2; // Vertical center

    // Convert to canvas container coordinates
    const startCanvasX = startScreenX - containerRect.left;
    const startCanvasY = startScreenY - containerRect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startCanvasX);
    line.setAttribute('y1', startCanvasY);
    line.setAttribute('x2', startCanvasX);
    line.setAttribute('y2', startCanvasY);
    line.setAttribute('stroke', '#000000'); // Black line for preview
    line.setAttribute('stroke-width', '6'); // Even thicker
    line.setAttribute('stroke-dasharray', '8,4');
    line.setAttribute('opacity', '1');

    svg.appendChild(line);

    // Add to canvas container to keep it within canvas bounds
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(svg);
    }
    S.connectionPreview = svg;

    console.log('Preview created at:', startCanvasX, startCanvasY, 'Full screen overlay');
    console.log('Preview element:', svg);
    console.warn('Preview created at:', startCanvasX, startCanvasY, 'Full screen overlay');
    console.error('Preview created at:', startCanvasX, startCanvasY, 'Full screen overlay');
  }

  function handleConnectionDrag(e) {
    if (!S.isConnecting || !S.connectionPreview) return;

    const container = document.querySelector('.canvas-container');
    const containerRect = container.getBoundingClientRect();

    // Helper function to convert screen to world coordinates
    const screenToWorld = (screenX, screenY) => ({
      x: (screenX - containerRect.left - S.canvasPanX) / S.canvasZoom,
      y: (screenY - containerRect.top - S.canvasPanY) / S.canvasZoom
    });

    let endX, endY;

    // Check if we're hovering over a left connector
    const elementAtMouse = document.elementFromPoint(e.clientX, e.clientY);
    const leftConnector = elementAtMouse?.closest('.left-connector');

    if (leftConnector && leftConnector.dataset.side === 'left') {
      // Snap to the connector center
      const endItem = leftConnector.closest('.canvas-item');
      if (endItem && endItem !== S.startConnector.item) {
        const endRect = endItem.getBoundingClientRect();
        // Connect to the left edge of the triangle connector, not the left edge of the item
        const endConnectorScreenX = calculateTriangleLeftEdge(endItem, endRect);
        const endConnectorScreenY = endRect.top + endRect.height / 2; // Vertical center
        const endWorld = screenToWorld(endConnectorScreenX, endConnectorScreenY);
        endX = endWorld.x;
        endY = endWorld.y;
      } else {
        // Use mouse position
        const mouseWorld = screenToWorld(e.clientX, e.clientY);
        endX = mouseWorld.x;
        endY = mouseWorld.y;
      }
    } else {
      // Use mouse position
      const mouseWorld = screenToWorld(e.clientX, e.clientY);
      endX = mouseWorld.x;
      endY = mouseWorld.y;
    }

    // Get mouse position in screen coordinates
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Update preview line end point using canvas container coordinates
    const line = S.connectionPreview.querySelector('line');
    if (line) {
      // If we're over a left connector, snap to the exact connector position
      if (leftConnector && leftConnector.dataset.side === 'left') {
        const endItem = leftConnector.closest('.canvas-item');
        if (endItem && endItem !== S.startConnector.item) {
          // Use the exact same positioning logic as the static connection line
          const endRect = endItem.getBoundingClientRect();
          const endConnectorScreenX = calculateTriangleLeftEdge(endItem, endRect);
          const endConnectorScreenY = endRect.top + endRect.height / 2;
          // Convert to canvas container coordinates
          const endConnectorCanvasX = endConnectorScreenX - containerRect.left;
          const endConnectorCanvasY = endConnectorScreenY - containerRect.top;
          line.setAttribute('x2', endConnectorCanvasX);
          line.setAttribute('y2', endConnectorCanvasY);
        } else {
          // Convert mouse position to canvas container coordinates
          const mouseCanvasX = mouseX - containerRect.left;
          const mouseCanvasY = mouseY - containerRect.top;
          line.setAttribute('x2', mouseCanvasX);
          line.setAttribute('y2', mouseCanvasY);
        }
      } else {
        // Convert mouse position to canvas container coordinates
        const mouseCanvasX = mouseX - containerRect.left;
        const mouseCanvasY = mouseY - containerRect.top;
        line.setAttribute('x2', mouseCanvasX);
        line.setAttribute('y2', mouseCanvasY);
      }
    }
  }

  function handleConnectionEnd(e) {
    if (!S.isConnecting) return;

    // Remove connecting cursor
    document.body.classList.remove('connecting-cursor');

    // Remove preview
    if (S.connectionPreview) {
      S.connectionPreview.remove();
      S.connectionPreview = null;
    }

    // Check if we're over a left connector
    const elementAtMouse = document.elementFromPoint(e.clientX, e.clientY);
    const leftConnector = elementAtMouse?.closest('.left-connector');

    if (leftConnector && leftConnector.dataset.side === 'left') {
      const endItem = leftConnector.closest('.canvas-item');
      if (endItem && endItem !== S.startConnector.item) {
        // Create the connection - this will snap to exact connector centers
        createConnectionFromConnectors(S.startConnector, { item: endItem, side: 'left' });
      }
    }

    // Reset state
    S.isConnecting = false;
    S.startConnector = null;

    // Remove event listeners
    document.removeEventListener('mousemove', handleConnectionDrag);
    document.removeEventListener('mouseup', handleConnectionEnd);
  }

  function createConnectionFromConnectors(startConnector, endConnector) {
    const startItem = S.startConnector.item;
    const endItem = endConnector.item;

    // Check if the end item's left connector is activated or already connected (prevent connections)
    if (endConnector.side === 'left') {
      const leftConnector = endItem.querySelector('.left-connector');
      if (leftConnector) {
        if (leftConnector.classList.contains('activated')) {
          return;
        }
        if (leftConnector.classList.contains('connected')) {
          return;
        }
      } else {
        return;
      }
    }

    // Check if the start item's right connector is activated (prevent connections from activated circles)
    if (startConnector.side === 'right') {
      const rightConnector = startItem.querySelector('.right-connector');
      if (rightConnector && rightConnector.classList.contains('activated')) {
        return;
      }
    }

    // Create connection data structure
    const connectionData = {
      id: 'connection-' + Date.now(),
      startItemId: startItem.id,
      endItemId: endItem.id,
      startSide: startConnector.side,
      endSide: endConnector.side
    };

    // Store connection data
    S.connections.push(connectionData);

    // Create the visual connection line
    createConnectionLine(connectionData);

    // Turn off drawing mode after successful connection
    if (S.isDrawingMode) {
      global.App.canvasCore.toggleDrawingMode();
    }

    console.log('Created connection from right to left:', connectionData);
  }

  function createConnectionLine(connectionData) {
    // Get canvas container for coordinate conversion
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) {
      return;
    }
    const containerRect = canvasContainer.getBoundingClientRect();

    const startItem = document.getElementById(connectionData.startItemId);
    const endItem = document.getElementById(connectionData.endItemId);

    if (!startItem || !endItem) {
      console.log('❌ Missing start or end item:', startItem, endItem);
      return;
    }

    // Get connector positions in screen coordinates
    const startRect = startItem.getBoundingClientRect();
    const startConnectorScreenX = startRect.right; // Right edge where connector center is
    const startConnectorScreenY = startRect.top + startRect.height / 2; // Vertical center

    const endRect = endItem.getBoundingClientRect();
    // Connect to the left edge of the triangle connector, not the left edge of the item
    const endConnectorScreenX = calculateTriangleLeftEdge(endItem, endRect);
    const endConnectorScreenY = endRect.top + endRect.height / 2; // Vertical center

    // Convert to canvas container coordinates
    const startConnectorCanvasX = startConnectorScreenX - containerRect.left;
    const startConnectorCanvasY = startConnectorScreenY - containerRect.top;
    const endConnectorCanvasX = endConnectorScreenX - containerRect.left;
    const endConnectorCanvasY = endConnectorScreenY - containerRect.top;

    // Create the visual connection element using canvas-contained SVG
    const connection = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    connection.className = 'connection-line';
    connection.id = connectionData.id;
    connection.dataset.connectionId = connectionData.id;
    connection.style.position = 'absolute';
    connection.style.left = '0';
    connection.style.top = '0';
    connection.style.width = '100%';
    connection.style.height = '100%';
    connection.style.pointerEvents = 'none';
    connection.style.zIndex = '1000';

    // Instead of making the connection itself draggable, we'll add a draggable overlay
    // This prevents conflicts with the connection drawing system
    const dragOverlay = document.createElement('div');
    dragOverlay.style.position = 'absolute';
    dragOverlay.style.left = '0';
    dragOverlay.style.top = '0';
    dragOverlay.style.width = '100%';
    dragOverlay.style.height = '100%';
    dragOverlay.style.pointerEvents = 'auto';
    dragOverlay.style.cursor = 'pointer';
    dragOverlay.setAttribute('draggable', 'true');

    dragOverlay.addEventListener('dragstart', (dragEvent) => {
      const connectionData = {
        id: connection.id,
        isConnection: true
      };
      dragEvent.dataTransfer.setData('application/json', JSON.stringify(connectionData));
      dragEvent.dataTransfer.effectAllowed = 'move';

      // Add dragging class for visual feedback
      connection.classList.add('dragging');
    });

    dragOverlay.addEventListener('dragend', (dragEvent) => {
      connection.classList.remove('dragging');
    });

    connection.appendChild(dragOverlay);

    // Create line with arrow
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startConnectorCanvasX);
    line.setAttribute('y1', startConnectorCanvasY);
    line.setAttribute('x2', endConnectorCanvasX);
    line.setAttribute('y2', endConnectorCanvasY);
    line.setAttribute('stroke', '#000'); // Black line
    line.setAttribute('stroke-width', '2'); // Normal line width

    connection.appendChild(line);

    // Add to canvas container to keep it within canvas bounds
    if (canvasContainer) {
      canvasContainer.appendChild(connection);
    }

    // Fill connectors to indicate connection
    const startConnectorEl = startItem.querySelector('.right-connector');
    if (startConnectorEl) {
      startConnectorEl.classList.add('connected');
      startConnectorEl.style.backgroundColor = '#000';
      startConnectorEl.style.borderColor = '#000';
    }
    const endConnectorEl = endItem.querySelector('.left-connector');
    if (endConnectorEl) {
      endConnectorEl.classList.add('connected');
      const tri = endConnectorEl.querySelector('polygon');
      if (tri) {
        tri.setAttribute('fill', '#000');
        tri.setAttribute('stroke', '#000');
      }
    }
  }

  function redrawConnectionsForItem(itemId) {
    // Find all connections involving this item
    const relevantConnections = S.connections.filter(conn =>
      conn.startItemId === itemId || conn.endItemId === itemId
    );

    // Redraw each connection
    relevantConnections.forEach(connectionData => {
      const startItem = document.getElementById(connectionData.startItemId);
      const endItem = document.getElementById(connectionData.endItemId);

      if (!startItem || !endItem) return;

      // Get the connection element
      const connectionElement = document.getElementById(connectionData.id);
      if (!connectionElement) {
        // If connection element doesn't exist, create it
        createConnectionLine(connectionData);
        return;
      }

      // Get consistent world coordinates for both items
      const container = document.querySelector('.canvas-container');
      const containerRect = container.getBoundingClientRect();

      // Helper function to convert screen to world coordinates
      const screenToWorld = (screenX, screenY) => ({
        x: (screenX - containerRect.left - S.canvasPanX) / S.canvasZoom,
        y: (screenY - containerRect.top - S.canvasPanY) / S.canvasZoom
      });

      // Get start item connector center (right connector)
      const startRect = startItem.getBoundingClientRect();
      const startConnectorScreenX = startRect.right; // Right edge where connector center is
      const startConnectorScreenY = startRect.top + startRect.height / 2; // Vertical center

      // Get end item connector center (left connector) with precise triangle edge calculation
      const endRect = endItem.getBoundingClientRect();
      const endConnectorScreenX = calculateTriangleLeftEdge(endItem, endRect);
      const endConnectorScreenY = endRect.top + endRect.height / 2; // Vertical center

      // Update the line coordinates using canvas container coordinates
      const line = connectionElement.querySelector('line');
      if (line) {
        // Convert to canvas container coordinates
        const containerRect = container.getBoundingClientRect();
        const startCanvasX = startConnectorScreenX - containerRect.left;
        const startCanvasY = startConnectorScreenY - containerRect.top;
        const endCanvasX = endConnectorScreenX - containerRect.left;
        const endCanvasY = endConnectorScreenY - containerRect.top;

        line.setAttribute('x1', startCanvasX);
        line.setAttribute('y1', startCanvasY);
        line.setAttribute('x2', endCanvasX);
        line.setAttribute('y2', endCanvasY);
      }

      // Ensure connectors are marked as connected
      const startConnectorEl = startItem.querySelector('.right-connector');
      const endConnectorEl = endItem.querySelector('.left-connector');

      if (startConnectorEl && !startConnectorEl.classList.contains('connected')) {
        startConnectorEl.classList.add('connected');
        startConnectorEl.style.backgroundColor = '#000';
        startConnectorEl.style.borderColor = '#000';
      }

      if (endConnectorEl && !endConnectorEl.classList.contains('connected')) {
        endConnectorEl.classList.add('connected');
        const triangle = endConnectorEl.querySelector('svg polygon');
        if (triangle) {
          triangle.setAttribute('fill', '#000');
          triangle.setAttribute('stroke', '#000');
        }
      }
    });

    console.log(`Redrew ${relevantConnections.length} connections for item: ${itemId}`);
  }

  function redrawAllConnections() {
    console.log('Redrawing all connections after zoom/pan change');

    // Force a reflow to ensure all positions are current
    document.body.offsetHeight;

    // Redraw all connections to fix positioning after zoom/pan
    const container = document.querySelector('.canvas-container');
    if (!container) return;

    S.connections.forEach(connectionData => {
      const startItem = document.getElementById(connectionData.startItemId);
      const endItem = document.getElementById(connectionData.endItemId);

      if (!startItem || !endItem) return;

      // Get the connection element
      const connectionElement = document.getElementById(connectionData.id);
      if (!connectionElement) return;

      // Get start item connector center (right connector)
      const startRect = startItem.getBoundingClientRect();
      const startConnectorScreenX = startRect.right; // Right edge where connector center is
      const startConnectorScreenY = startRect.top + startRect.height / 2; // Vertical center

      // Get end item connector center (left connector) with precise triangle edge calculation
      const endRect = endItem.getBoundingClientRect();
      const endConnectorScreenX = calculateTriangleLeftEdge(endItem, endRect);
      const endConnectorScreenY = endRect.top + endRect.height / 2; // Vertical center

      // Update the line coordinates using canvas container coordinates
      const line = connectionElement.querySelector('line');
      if (line) {
        // Convert to canvas container coordinates
        const containerRect = container.getBoundingClientRect();
        const startCanvasX = startConnectorScreenX - containerRect.left;
        const startCanvasY = startConnectorScreenY - containerRect.top;
        const endCanvasX = endConnectorScreenX - containerRect.left;
        const endCanvasY = endConnectorScreenY - containerRect.top;

        line.setAttribute('x1', startCanvasX);
        line.setAttribute('y1', startCanvasY);
        line.setAttribute('x2', endCanvasX);
        line.setAttribute('y2', endCanvasY);
      }
    });
  }

  function calculateTriangleLeftEdge(item, itemRect) {
    // Find the left connector (triangle) within the item
    const leftConnector = item.querySelector('.left-connector');
    if (!leftConnector) return itemRect.left;

    // Get the triangle SVG element
    const triangleSvg = leftConnector.querySelector('svg');
    if (!triangleSvg) return itemRect.left;

    // Get the triangle's bounding rect relative to the viewport
    const triangleRect = triangleSvg.getBoundingClientRect();

    // The triangle points are "16,8 0,0 0,16" so the leftmost point is at x=0
    // The triangle has a stroke-width of 2, so the visual edge is offset by 1px from the SVG edge
    // We want the line to connect exactly at the visual edge of the triangle
    return triangleRect.left + 1; // +1px to account for the 2px stroke width
  }

  function clearAllConnectionLines() {
    // Remove all connection lines from the DOM
    const allConnectionLines = document.querySelectorAll('.connection-line');

    allConnectionLines.forEach((connection) => {
      connection.remove();
    });

    // Remove connection preview if it exists
    if (S.connectionPreview) {
      S.connectionPreview.remove();
      S.connectionPreview = null;
    }

    // Clear the connections array
    const previousCount = S.connections.length;
    S.connections = [];

    console.log(`🧹 Cleared all connection lines and connections array (was ${previousCount}, now 0)`);
  }

  function turnOffDrawingMode() {
    if (S.isDrawingMode) {
      global.App.canvasCore.toggleDrawingMode();
    }
  }

  function toggleDrawingMode() {
    if (global.App.canvasCore && global.App.canvasCore.toggleDrawingMode) {
      global.App.canvasCore.toggleDrawingMode();
    }
  }

  function turnOffActivationModes() {
    // Turn off triangle activation mode (but keep existing activated triangles!)
    S.triangleActivationMode = false;
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      startBtn.classList.remove('active');
    }

    // Turn off circle activation mode (but keep existing activated circles!)
    S.circleActivationMode = false;
    const stopBtn = document.querySelector('.stop-btn');
    if (stopBtn) {
      stopBtn.classList.remove('active');
    }

    // DO NOT remove activation from existing connectors!
    // The activated start/end points should remain until manually changed
    // This was the bug causing start/end points to be cleared when clicking test/import/compile
  }

  function showConnectorsOnAllItems() {
    const allCanvasItems = document.querySelectorAll('.canvas-item');
    allCanvasItems.forEach(item => {
      showConnectorsOnItem(item);
    });
  }

  function hideConnectorsOnAllItems() {
    const allCanvasItems = document.querySelectorAll('.canvas-item');
    allCanvasItems.forEach(item => {
      hideConnectorsOnItem(item);
    });
  }

  function resetConnectorStates() {
    // Reset all connectors to unconnected state
    const allConnectors = document.querySelectorAll('.right-connector, .left-connector');
    allConnectors.forEach(connector => {
      connector.classList.remove('connected');
      if (connector.classList.contains('right-connector')) {
        connector.style.backgroundColor = '';
        connector.style.borderColor = '';
      } else if (connector.classList.contains('left-connector')) {
        const triangle = connector.querySelector('svg polygon');
        if (triangle) {
          triangle.setAttribute('fill', 'white');
          triangle.setAttribute('stroke', 'black');
        }
      }
    });

    // Re-apply connected state based on actual connections
    S.connections.forEach(connectionData => {
      const startItem = document.getElementById(connectionData.startItemId);
      const endItem = document.getElementById(connectionData.endItemId);

      if (startItem && endItem) {
        const startConnectorEl = startItem.querySelector('.right-connector');
        const endConnectorEl = endItem.querySelector('.left-connector');

        if (startConnectorEl) {
          startConnectorEl.classList.add('connected');
          startConnectorEl.style.backgroundColor = '#000';
          startConnectorEl.style.borderColor = '#000';
        }

        if (endConnectorEl) {
          endConnectorEl.classList.add('connected');
          const triangle = endConnectorEl.querySelector('svg polygon');
          if (triangle) {
            triangle.setAttribute('fill', '#000');
            triangle.setAttribute('stroke', '#000');
          }
        }
      }
    });
  }

  function resetConnectorStatesForItem(itemId) {
    const item = document.getElementById(itemId);
    if (!item) return;

    // Reset connectors for this specific item
    const rightConnector = item.querySelector('.right-connector');
    const leftConnector = item.querySelector('.left-connector');

    if (rightConnector) {
      rightConnector.classList.remove('connected');
      rightConnector.style.backgroundColor = '';
      rightConnector.style.borderColor = '';
    }

    if (leftConnector) {
      leftConnector.classList.remove('connected');
      const triangle = leftConnector.querySelector('svg polygon');
      if (triangle) {
        triangle.setAttribute('fill', 'white');
        triangle.setAttribute('stroke', 'black');
      }
    }

    // Re-apply connected state if this item still has connections
    S.connections.forEach(connectionData => {
      if (connectionData.startItemId === itemId) {
        // This item is a start item, check if end item exists
        const endItem = document.getElementById(connectionData.endItemId);
        if (endItem && rightConnector) {
          rightConnector.classList.add('connected');
          rightConnector.style.backgroundColor = '#000';
          rightConnector.style.borderColor = '#000';
        }
      } else if (connectionData.endItemId === itemId) {
        // This item is an end item, check if start item exists
        const startItem = document.getElementById(connectionData.startItemId);
        if (startItem && leftConnector) {
          leftConnector.classList.add('connected');
          const triangle = leftConnector.querySelector('svg polygon');
          if (triangle) {
            triangle.setAttribute('fill', '#000');
            triangle.setAttribute('stroke', '#000');
          }
        }
      }
    });
  }

  // Export to App namespace
  global.App = global.App || {};
  global.App.canvasConnections = {
    showConnectorsOnItem,
    hideConnectorsOnItem,
    showConnectorsOnAllItems,
    hideConnectorsOnAllItems,
    resetConnectorStates,
    resetConnectorStatesForItem,
    handleConnectorMouseDown,
    createConnectionPreview,
    handleConnectionDrag,
    handleConnectionEnd,
    createConnectionFromConnectors,
    createConnectionLine,
    redrawConnectionsForItem,
    redrawAllConnections,
    calculateTriangleLeftEdge,
    clearAllConnectionLines,
    turnOffDrawingMode,
    toggleDrawingMode,
    turnOffActivationModes
  };

  // Back-compat exports for global access
  global.showConnectorsOnItem = showConnectorsOnItem;
  global.hideConnectorsOnItem = hideConnectorsOnItem;
  global.showConnectorsOnAllItems = showConnectorsOnAllItems;
  global.hideConnectorsOnAllItems = hideConnectorsOnAllItems;
  global.resetConnectorStates = resetConnectorStates;
  global.resetConnectorStatesForItem = resetConnectorStatesForItem;
  global.handleConnectorMouseDown = handleConnectorMouseDown;
  global.createConnectionPreview = createConnectionPreview;
  global.handleConnectionDrag = handleConnectionDrag;
  global.handleConnectionEnd = handleConnectionEnd;
  global.createConnectionFromConnectors = createConnectionFromConnectors;
  global.createConnectionLine = createConnectionLine;
  global.redrawConnectionsForItem = redrawConnectionsForItem;
  global.redrawAllConnections = redrawAllConnections;
  global.calculateTriangleLeftEdge = calculateTriangleLeftEdge;
  global.clearAllConnectionLines = clearAllConnectionLines;
  global.turnOffDrawingMode = turnOffDrawingMode;
  global.toggleDrawingMode = toggleDrawingMode;
  global.turnOffActivationModes = turnOffActivationModes;

})(window);