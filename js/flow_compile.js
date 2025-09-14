// js/flow_compile.js - Flow validation & intermediate JSON generation
(function (global) {
  const S = global.App.state;

  // Flow validation function to ensure proper connections from start to end
  function validateAgenticFlow() {
    console.log('🚀 validateAgenticFlow() called');
    console.log('🔍 Looking for green triangles and red circles...');

    // Find all green triangles (activated left connectors)
    const greenTriangles = document.querySelectorAll('.left-connector.activated');
    console.log('🎯 Found green triangles:', greenTriangles.length);

    // Find all red circles (activated right connectors)
    const redCircles = document.querySelectorAll('.right-connector.activated');
    console.log('🔴 Found red circles:', redCircles.length);

    if (greenTriangles.length === 0) {
      console.log('❌ No green triangles found');
      showNotification('No green triangles found! Please activate at least one triangle using the Start button.', 'error');
      return;
    }

    if (redCircles.length === 0) {
      console.log('❌ No red circles found');
      showNotification('No red circles found! Please activate at least one circle using the End button.', 'error');
      return;
    }

    console.log('✅ Found both green triangles and red circles, checking flow validity...');

    // Check if there's a valid flow from any green triangle to any red circle
    // OR if we have a single item with both start and end points
    let hasValidFlow = false;

    // Check for any item with both start and end
    if (greenTriangles.length > 0 && redCircles.length > 0) {
      // Look for any item that has both start and end activated
      let foundItemWithBoth = false;
      S.canvasItems.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
          const leftConnector = element.querySelector('.left-connector');
          const rightConnector = element.querySelector('.right-connector');
          if (leftConnector && leftConnector.classList.contains('activated') &&
              rightConnector && rightConnector.classList.contains('activated')) {
            console.log('🎯 Found item with both start and end points:', item.id);
            foundItemWithBoth = true;
            hasValidFlow = true;
          }
        }
      });

      if (foundItemWithBoth) {
        console.log('🎯 Item with both start and end points - valid flow!');
        hasValidFlow = true;
      }
    }

    // If no item with both start and end, check for connected flow
    if (!hasValidFlow) {
      greenTriangles.forEach((greenTriangle, index) => {
        console.log(`  🔍 Checking green triangle ${index + 1}:`, greenTriangle);
        const startItem = greenTriangle.closest('.canvas-item');
        if (startItem) {
          console.log(`    ✅ Found start item:`, startItem.id);
          // Use depth-first search to find paths to red circles
          if (hasPathToRedCircle(startItem, new Set(), redCircles)) {
            console.log(`    🎯 Valid path found from ${startItem.id} to a red circle`);
            hasValidFlow = true;
          } else {
            console.log(`    ❌ No valid path found from ${startItem.id} to any red circle`);
          }
        } else {
          console.log(`    ❌ No start item found for green triangle ${index + 1}`);
        }
      });
    }

    console.log('📊 Flow validation result:', hasValidFlow);

    if (hasValidFlow) {
      console.log('🎉 Flow is valid! Generating intermediate.json...');
      // Generate and save intermediate.json
      generateIntermediateJson();
      showNotification('Compiled Successfully!', 'success');
    } else {
      console.log('❌ Flow is invalid');
      showNotification('Invalid Schema', 'error');
    }
  }

  // Helper function to check if there's a path from current item to a red circle
  function hasPathToRedCircle(currentItem, visited, redCircles) {
    // Prevent infinite loops
    if (visited.has(currentItem.id)) {
      return false;
    }
    visited.add(currentItem.id);

    // Check if this item has a red circle (end point)
    const rightConnector = currentItem.querySelector('.right-connector');
    if (rightConnector && rightConnector.classList.contains('activated')) {
      return true; // Found a red circle!
    }

    // Find all outgoing connections from this item
    const outgoingConnections = S.connections.filter(conn => conn.startItemId === currentItem.id);

    // Recursively check each connected item
    for (const connection of outgoingConnections) {
      const nextItem = document.getElementById(connection.endItemId);
      if (nextItem && hasPathToRedCircle(nextItem, visited, redCircles)) {
        return true;
      }
    }

    return false;
  }

  // Generate intermediate JSON from canvas state
  function generateIntermediateJson() {
    console.log('🚀 generateIntermediateJson() called');
    console.log('📁 currentProjectPath:', S.currentProjectPath);
    console.log('🔍 canvasItems count:', S.canvasItems.length);
    console.log('🔗 connections count:', S.connections.length);

    try {
      // Use the stored global project path
      if (!S.currentProjectPath) {
        console.error('❌ No project folder selected or project path not stored');
        console.log('🔍 Checking folderDisplay element...');
        const folderDisplay = document.querySelector('.current-folder-display');
        if (folderDisplay) {
          console.log('📋 folderDisplay.textContent:', folderDisplay.textContent);
          console.log('🏷️ folderDisplay.classList:', Array.from(folderDisplay.classList));
        } else {
          console.log('❌ folderDisplay element not found');
        }
        return;
      }

      const projectPath = S.currentProjectPath;
      console.log('✅ Project path found:', projectPath);

      // Verify the project path exists and is accessible
      const fs = require('fs');
      const path = require('path');
      console.log('🔍 Checking if project path exists...');
      if (!fs.existsSync(projectPath)) {
        console.error('❌ Project path does not exist:', projectPath);
        return;
      }

      console.log('✅ Project path exists and is accessible');
      console.log('📂 Project directory contents:');
      try {
        const projectContents = fs.readdirSync(projectPath);
        console.log('   📁 Files/folders in project:', projectContents);
      } catch (dirError) {
        console.error('❌ Error reading project directory:', dirError);
      }

      // Find all start points (green triangles)
      console.log('🔍 Looking for start points (green triangles)...');
      const startItems = [];
      const greenTriangles = document.querySelectorAll('.left-connector.activated');
      console.log('🎯 Found', greenTriangles.length, 'activated left connectors (green triangles)');

      greenTriangles.forEach((triangle, index) => {
        console.log(`  🔍 Triangle ${index + 1}:`, triangle);
        const startItem = triangle.closest('.canvas-item');
        if (startItem) {
          console.log(`  ✅ Found canvas item for triangle ${index + 1}:`, startItem.id);
          startItems.push(startItem);
        } else {
          console.log(`  ❌ No canvas item found for triangle ${index + 1}`);
        }
      });

      console.log('📋 Total start items found:', startItems.length);

      // Check for any item with both start and end
      if (startItems.length === 0) {
        S.canvasItems.forEach(item => {
          const element = document.getElementById(item.id);
          if (element) {
            const leftConnector = element.querySelector('.left-connector');
            const rightConnector = element.querySelector('.right-connector');
            if (leftConnector && leftConnector.classList.contains('activated') &&
                rightConnector && rightConnector.classList.contains('activated')) {
              console.log('🎯 Found item with both start and end points:', item.id);
              startItems.push(element);
            }
          }
        });
      }

      if (startItems.length === 0) {
        console.error('❌ No start points found - cannot generate flow');
        console.log('🔍 Available canvas items:');
        S.canvasItems.forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id}, Type: ${item.data.type}, Name: ${item.data.name}`);
        });
        return;
      }

      // Build flow for each start point
      console.log('🔨 Building flow for each start point...');
      const allFlows = [];
      const processedItems = new Set();

      startItems.forEach((startItem, index) => {
        console.log(`  🔄 Processing start item ${index + 1}:`, startItem.id);
        if (!processedItems.has(startItem.id)) {
          console.log(`    🚀 Building flow from start item: ${startItem.id}`);
          const flow = buildFlowFromStart(startItem, new Set(), processedItems);
          console.log(`    📊 Flow result for ${startItem.id}:`, flow);
          if (flow.length > 0) {
            console.log(`    ✅ Adding ${flow.length} items to allFlows`);
            allFlows.push(...flow);
          } else {
            console.log(`    ⚠️ Empty flow for ${startItem.id}`);
          }
        } else {
          console.log(`    ⏭️ Skipping already processed item: ${startItem.id}`);
        }
      });

      // If we have connections, also include items that are connected to start points
      if (S.connections.length > 0) {
        // Find all items that are connected to start items (either directly or indirectly)
        const connectedItems = new Set();
        startItems.forEach(startItem => {
          connectedItems.add(startItem.id);
          // Add all items that are connected to this start item
          const connectedToStart = findConnectedItems(startItem.id, new Set());
          connectedToStart.forEach(itemId => connectedItems.add(itemId));
        });

        // Add any connected items that weren't processed yet
        connectedItems.forEach(itemId => {
          if (!processedItems.has(itemId)) {
            const canvasItem = S.canvasItems.find(item => item.id === itemId);
            if (canvasItem) {
              const flowElement = createFlowElement(canvasItem);
              if (flowElement) {
                allFlows.push(flowElement);
              }
            }
          }
        });
      }

      console.log('📊 Total flows collected:', allFlows.length);

      // Remove duplicates while preserving order
      console.log('🧹 Removing duplicates while preserving order...');
      // Keep all items in order (including duplicates of same function/agent)
      // This allows the same function to appear multiple times in the flow
      const finalFlows = [...allFlows];

      console.log('🎯 Final flows count (including duplicates):', finalFlows.length);
      console.log('🔍 Flow items:');
      finalFlows.forEach((item, index) => {
        const itemId = item.is_agent ? item.agent_name : item.function_name;
        console.log(`  ${index + 1}. ${item.is_agent ? 'Agent: ' + item.agent_name : 'Function: ' + item.function_name} (start: ${item.is_start}, end: ${item.is_end})`);
      });

      // Create the intermediate.json structure
      console.log('📝 Creating intermediate.json structure...');
      const intermediateData = {
        flow: finalFlows
      };

      console.log('📋 Final data structure:', intermediateData);

      // Write to file in the project root
      console.log('💾 Writing file to project root...');
      const intermediatePath = path.join(projectPath, 'intermediate.json');
      console.log('📁 Full file path:', intermediatePath);

      try {
        fs.writeFileSync(intermediatePath, JSON.stringify(intermediateData, null, 2));
        console.log('✅ File write operation completed');
      } catch (writeError) {
        console.error('❌ Error writing file:', writeError);
        throw writeError;
      }

      // Verify the file was created successfully
      if (fs.existsSync(intermediatePath)) {
        const stats = fs.statSync(intermediatePath);
        console.log('✅ intermediate.json successfully created!');
        console.log('📁 File location:', intermediatePath);
        console.log('📊 File size:', stats.size, 'bytes');
        console.log('🕒 Created at:', stats.birthtime);
        console.log('📋 Flow contains', finalFlows.length, 'items');
        finalFlows.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.is_agent ? 'Agent: ' + item.agent_name : 'Function: ' + item.function_name} (start: ${item.is_start}, end: ${item.is_end})`);
        });
      } else {
        console.error('❌ Failed to create intermediate.json file');
      }

    } catch (error) {
      console.error('Error generating intermediate.json:', error);
    }
  }

  // Generate intermediate JSON preview for modal display
  function generateIntermediatePreview() {
    console.log('🔬 Generating intermediate JSON preview...');

    try {
      // Import required modules at the top
      const fs = require('fs');
      const path = require('path');

      // Check if we have a project path
      if (!S.currentProjectPath) {
        document.getElementById('jsonContent').textContent = '❌ Error: No project folder selected';
        return;
      }

      // Check if we have canvas items
      if (S.canvasItems.length === 0) {
        document.getElementById('jsonContent').textContent = '❌ Error: No canvas items found on the canvas';
        return;
      }

      // Check if we have connections OR any item with both start and end
      const hasConnections = S.connections.length > 0;
      const anyItemWithBothEnds = document.querySelectorAll('.left-connector.activated').length > 0 &&
        document.querySelectorAll('.right-connector.activated').length > 0;

      if (!hasConnections && !anyItemWithBothEnds) {
        document.getElementById('jsonContent').textContent = '❌ Error: No connections found between items, and no item with both start and end points';
        return;
      }

      // Check for start points (green triangles)
      const greenTriangles = document.querySelectorAll('.left-connector.activated');
      if (greenTriangles.length === 0) {
        document.getElementById('jsonContent').textContent = '❌ Error: No start points found. Please activate at least one triangle using the Start button.';
        return;
      }

      // Check for end points (red circles)
      const redCircles = document.querySelectorAll('.right-connector.activated');
      if (redCircles.length === 0) {
        document.getElementById('jsonContent').textContent = '❌ Error: No end points found. Please activate at least one circle using the End button.';
        return;
      }

      // Generate the flow data (same logic as generateIntermediateJson but without file writing)
      const startItems = [];
      greenTriangles.forEach((triangle) => {
        const startItem = triangle.closest('.canvas-item');
        if (startItem) {
          startItems.push(startItem);
        }
      });

      if (startItems.length === 0) {
        document.getElementById('jsonContent').textContent = '❌ Error: Could not find canvas items for start points';
        return;
      }

      // Build flow for each start point
      const allFlows = [];
      const processedItems = new Set();

      startItems.forEach((startItem) => {
        if (!processedItems.has(startItem.id)) {
          const flow = buildFlowFromStart(startItem, new Set(), processedItems);
          if (flow.length > 0) {
            allFlows.push(...flow);
          }
        }
      });

      // If we have connections, also include items that are connected to start points
      if (S.connections.length > 0) {
        // Find all items that are connected to start items (either directly or indirectly)
        const connectedItems = new Set();
        startItems.forEach(startItem => {
          connectedItems.add(startItem.id);
          // Add all items that are connected to this start item
          const connectedToStart = findConnectedItems(startItem.id, new Set());
          connectedToStart.forEach(itemId => connectedItems.add(itemId));
        });

        // Add any connected items that weren't processed yet
        connectedItems.forEach(itemId => {
          if (!processedItems.has(itemId)) {
            const canvasItem = S.canvasItems.find(item => item.id === itemId);
            if (canvasItem) {
              const flowElement = createFlowElement(canvasItem);
              if (flowElement) {
                allFlows.push(flowElement);
              }
            }
          }
        });
      }

      // Keep all items in order (including duplicates of same function/agent)
      // This allows the same function to appear multiple times in the flow
      const finalFlows = [...allFlows];

      console.log('📊 Final flows count (including duplicates):', finalFlows.length);
      console.log('🔍 Flow items:');
      finalFlows.forEach((item, index) => {
        const itemId = item.is_agent ? item.agent_name : item.function_name;
        console.log(`  ${index + 1}. ${item.is_agent ? 'Agent: ' + item.agent_name : 'Function: ' + item.function_name} (start: ${item.is_start}, end: ${item.is_end})`);
      });

      // Create the intermediate.json structure
      const intermediateData = {
        flow: finalFlows
      };

      // Display the JSON
      const jsonString = JSON.stringify(intermediateData, null, 2);
      document.getElementById('jsonContent').textContent = jsonString;

      console.log('✅ JSON preview generated successfully');
      console.log('📊 Flow contains', finalFlows.length, 'items');

    } catch (error) {
      console.error('❌ Error generating JSON preview:', error);
      document.getElementById('jsonContent').textContent = `❌ Error: ${error.message}`;
    }
  }

  // Test function for intermediate JSON generation
  function testIntermediateJsonGeneration() {
    console.log('Testing intermediate.json generation...');
    console.log('Current project path:', S.currentProjectPath);
    console.log('Canvas items:', S.canvasItems.length);
    console.log('Connections:', S.connections.length);

    if (S.currentProjectPath) {
      generateIntermediateJson();
    } else {
      console.error('No project path available');
    }
  }

  // Debug function to check flow validation state
  function debugFlowValidation() {
    console.log('🔍 Debugging flow validation...');
    console.log('📁 currentProjectPath:', S.currentProjectPath);
    console.log('🔍 canvasItems count:', S.canvasItems.length);
    console.log('🔗 connections count:', S.connections.length);

    // Check for green triangles
    const greenTriangles = document.querySelectorAll('.left-connector.activated');
    console.log('🎯 Found green triangles:', greenTriangles.length);

    // Check for red circles
    const redCircles = document.querySelectorAll('.right-connector.activated');
    console.log('🔴 Found red circles:', redCircles.length);

    // Check canvas items
    if (S.canvasItems.length > 0) {
      console.log('📋 Canvas items:');
      S.canvasItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.id}, Type: ${item.data.type}, Name: ${item.data.name}`);
      });
    } else {
      console.log('❌ No canvas items found');
    }

    // Check connections
    if (S.connections.length > 0) {
      console.log('🔗 Connections:');
      S.connections.forEach((conn, index) => {
        console.log(`  ${index + 1}. ${conn.startItemId} -> ${conn.endItemId}`);
      });
    } else {
      console.log('❌ No connections found');
    }

    // Check if start/stop buttons are active
    const startBtn = document.querySelector('.start-btn');
    const stopBtn = document.querySelector('.stop-btn');
    console.log('🟢 Start button active:', startBtn ? startBtn.classList.contains('active') : 'Not found');
    console.log('🔴 Stop button active:', stopBtn ? stopBtn.classList.contains('active') : 'Not found');
  }

  // Create flow element from canvas item data
  function createFlowElement(canvasItem) {
    console.log(`    🏗️ createFlowElement called for:`, canvasItem);

    const itemData = canvasItem.data;
    const element = document.getElementById(canvasItem.id);

    console.log(`      📋 Item data:`, itemData);
    console.log(`      🎯 Element found:`, element ? 'Yes' : 'No');

    // Check if it's an agent or function
    const isAgent = itemData.type === 'agent';
    console.log(`      🏷️ Item type: ${itemData.type} (isAgent: ${isAgent})`);

    // Check start/end status
    const leftConnector = element.querySelector('.left-connector');
    const rightConnector = element.querySelector('.right-connector');
    const isStart = leftConnector && leftConnector.classList.contains('activated');
    const isEnd = rightConnector && rightConnector.classList.contains('activated');

    console.log(`      🔵 Left connector (start):`, leftConnector ? 'Found' : 'Not found');
    console.log(`      🔴 Right connector (end):`, rightConnector ? 'Found' : 'Not found');
    console.log(`      🟢 Is start: ${isStart}, Is end: ${isEnd}`);

    if (isAgent) {
      const result = {
        is_agent: true,
        agent_name: itemData.name,
        is_start: isStart,
        is_end: isEnd
      };
      console.log(`      🤖 Agent flow element created:`, result);
      return result;
    } else {
      // For functions, we need to find the file path
      const functionName = itemData.name;
      const functionFile = itemData.file;

      console.log(`      ⚙️ Function details - Name: ${functionName}, File: ${functionFile}`);

      // Import required modules at the top
      const fs = require('fs');
      const path = require('path');

      // Find the relative path to the function file
      const folderDisplay = document.querySelector('.current-folder-display');

      if (folderDisplay && !folderDisplay.classList.contains('no-project')) {
        const projectPath = folderDisplay.textContent.startsWith('~/')
          ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
          : folderDisplay.textContent;

        console.log(`      📁 Project path for function lookup:`, projectPath);

        // Find the function in the project

        // Search for the function file in the project
        const foundPath = findFileInProject(projectPath, functionFile);
        console.log(`      🔍 Function file search result:`, foundPath);

        if (foundPath) {
          const relativePath = path.relative(projectPath, foundPath);
          const result = {
            is_agent: false,
            function_name: functionName,
            function_path: relativePath,
            is_start: isStart,
            is_end: isEnd
          };
          console.log(`      ⚙️ Function flow element created:`, result);
          return result;
        }
      }

      // Fallback if path not found
      const result = {
        is_agent: false,
        function_name: functionName,
        function_path: functionFile || 'unknown',
        is_start: isStart,
        is_end: isEnd
      };
      console.log(`      ⚙️ Function flow element created (fallback):`, result);
      return result;
    }
  }

  // Build flow from start item recursively following connections
  function buildFlowFromStart(startItem, visited, processedItems) {
    console.log(`  🔍 buildFlowFromStart called for item: ${startItem.id}`);

    if (visited.has(startItem.id)) {
      console.log(`    ⚠️ Item ${startItem.id} already visited, preventing infinite loop`);
      return []; // Prevent infinite loops
    }
    visited.add(startItem.id);
    processedItems.add(startItem.id);

    console.log(`    ✅ Added ${startItem.id} to visited and processed sets`);

    const flow = [];

    // Get item data
    const canvasItem = S.canvasItems.find(item => item.id === startItem.id);
    if (!canvasItem) {
      console.log(`    ❌ No canvas item data found for ${startItem.id}`);
      return flow;
    }

    console.log(`    📋 Canvas item data:`, canvasItem.data);

    // Create flow element
    const flowElement = createFlowElement(canvasItem);
    console.log(`    🏗️ Created flow element:`, flowElement);
    flow.push(flowElement);

    // Check if this is an end point (red circle)
    const rightConnector = startItem.querySelector('.right-connector');
    const isEndPoint = rightConnector && rightConnector.classList.contains('activated');
    console.log(`    🔴 Is end point (red circle): ${isEndPoint}`);

    if (isEndPoint) {
      console.log(`    🎯 End point reached, returning flow with ${flow.length} items`);
      return flow; // End of flow
    }

    // Find next items in the flow
    const outgoingConnections = S.connections.filter(conn => conn.startItemId === startItem.id);
    console.log(`    🔗 Found ${outgoingConnections.length} outgoing connections:`, outgoingConnections);

    if (outgoingConnections.length === 0) {
      console.log(`    ⚠️ No outgoing connections, flow ends here with ${flow.length} items`);
      return flow;
    }

    // Sort connections by some criteria (e.g., position) to maintain order
    outgoingConnections.sort((a, b) => {
      const itemA = document.getElementById(a.endItemId);
      const itemB = document.getElementById(b.endItemId);
      if (!itemA || !itemB) return 0;

      // Sort by Y position, then X position
      const rectA = itemA.getBoundingClientRect();
      const rectB = itemB.getBoundingClientRect();

      if (Math.abs(rectA.top - rectB.top) > 20) {
        return rectA.top - rectB.top; // Sort by Y if difference is significant
      }
      return rectA.left - rectB.left; // Otherwise sort by X
    });

    console.log(`    📐 Sorted connections:`, outgoingConnections.map(c => c.endItemId));

    // Recursively build flow for each connected item
    for (const connection of outgoingConnections) {
      const nextItem = document.getElementById(connection.endItemId);
      console.log(`    🔄 Processing connection to: ${connection.endItemId}`);

      if (nextItem && !processedItems.has(nextItem.id)) {
        console.log(`      ✅ Next item found and not processed: ${nextItem.id}`);
        const nextFlow = buildFlowFromStart(nextItem, new Set(visited), processedItems);
        console.log(`      📊 Next flow result:`, nextFlow);
        flow.push(...nextFlow);
        console.log(`      📈 Flow now contains ${flow.length} items`);
      } else if (!nextItem) {
        console.log(`      ❌ Next item not found: ${connection.endItemId}`);
      } else {
        console.log(`      ⏭️ Next item already processed: ${nextItem.id}`);
      }
    }

    console.log(`    🎯 Returning flow with ${flow.length} items for ${startItem.id}`);
    return flow;
  }

  // Find all connected items starting from a given item ID
  function findConnectedItems(startItemId, visited) {
    if (visited.has(startItemId)) {
      return new Set();
    }
    visited.add(startItemId);

    const connected = new Set([startItemId]);

    // Find all outgoing connections from this item
    const outgoingConnections = S.connections.filter(conn => conn.startItemId === startItemId);

    // Recursively find all connected items
    outgoingConnections.forEach(connection => {
      const nextItemId = connection.endItemId;
      const nextConnected = findConnectedItems(nextItemId, new Set(visited));
      nextConnected.forEach(itemId => connected.add(itemId));
    });

    return connected;
  }

  // Handle compile button click - main compilation entry point
  async function handleCompile() {
    console.log('🚀 handleCompile() called');

    try {
      // Check if we have a project path
      if (!S.currentProjectPath) {
        showNotification('No project folder selected!', 'error');
        return;
      }

      // First, generate intermediate.json if it doesn't exist
      console.log('📝 Generating intermediate.json...');
      generateIntermediateJson();

      // Wait a moment for file to be written
      await new Promise(resolve => setTimeout(resolve, 500));

      // First, copy the agent_runner folder to the project
      console.log('📁 Copying agent_runner to project folder...');
      const response = await fetch(`http://localhost:8000/copy-agent-runner?destination=${encodeURIComponent(S.currentProjectPath)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to copy agent_runner: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Agent runner copied:', result.message);

      // Generate and inject run.py
      console.log('🐍 Generating run.py...');
      await generateRunScript();

      showNotification('Compile successful! run.py generated.', 'success');

    } catch (error) {
      console.error('❌ Compile failed:', error);
      showNotification(`Compile failed: ${error.message}`, 'error');
    }
  }

  // Show test JSON modal
  function showTestJsonModal() {
    const modal = document.getElementById('testJsonModal');
    modal.style.display = 'flex';
  }

  // Hide test JSON modal
  function hideTestJsonModal() {
    const modal = document.getElementById('testJsonModal');
    modal.style.display = 'none';
  }

  // Helper function to show notifications (borrowed from existing code)
  function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.flow-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'flow-notification';
    notification.innerHTML = `
      <div class="flow-notification-content">
        <div class="flow-notification-message">${message}</div>
        <button class="flow-notification-close">×</button>
      </div>
    `;

    // Add to document
    document.body.appendChild(notification);

    // Show notification with slide-in animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 5000);

    // Close button functionality
    const closeBtn = notification.querySelector('.flow-notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      });
    }
  }

  // Helper function to generate run.py script
  async function generateRunScript() {
    console.log('🐍 generateRunScript() called');

    try {
      // Import required modules
      const path = require('path');
      const fs = require('fs');

      // Read intermediate.json from the project folder
      const intermediatePath = path.join(S.currentProjectPath, 'intermediate.json');

      if (!fs.existsSync(intermediatePath)) {
        throw new Error('intermediate.json not found. Please generate it first using the TEST button.');
      }

      const intermediateData = JSON.parse(fs.readFileSync(intermediatePath, 'utf8'));
      const flow = intermediateData.flow;

      if (!flow || flow.length === 0) {
        throw new Error('No flow data found in intermediate.json');
      }

      // Find the starting agent
      const startAgent = flow.find(item => item.is_start);
      if (!startAgent) {
        throw new Error('No starting agent found in flow');
      }

      // Generate the run.py content
      const runPyContent = generateRunPyContent(flow, startAgent, intermediateData);

      // Write run.py to project root
      const runPyPath = path.join(S.currentProjectPath, 'run.py');

      fs.writeFileSync(runPyPath, runPyContent);
      console.log('✅ run.py successfully created at:', runPyPath);

    } catch (error) {
      console.error('❌ Error generating run.py:', error);
      throw error;
    }
  }

  // Helper function to generate run.py content
  function generateRunPyContent(flow, startAgent, intermediateData) {
    console.log('📝 Generating run.py content...');
    
    // Import path module
    const path = require('path');
    
    // Get all unique agents and functions
    const agents = [...new Set(flow.filter(item => item.is_agent).map(item => item.agent_name))];
    const functions = flow.filter(item => !item.is_agent);
    // Generate imports
    let imports = `import json
import sys
import os
from pathlib import Path

# Add the project root to the path for function imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from agent_runner.make_agent import build_agent
`;

    // Add the helper function
    imports += generateAgentInputHelper();

    // Add function imports from intermediate.json flow data
    functions.forEach(func => {
      // Validate function data
      if (!func.function_path || !func.function_name) {
        console.warn('Skipping function with missing path or name:', func);
        return;
      }
      
      const relativePath = path.relative(currentProjectPath, func.function_path);
      // Convert file path to proper Python module path
      let modulePath = relativePath.replace(/\\/g, '/').replace('.py', '');
      
      // Handle relative paths with ../ by using sys.path manipulation instead
      if (modulePath.startsWith('../')) {
        // For paths going up directories, we'll add the parent directory to sys.path
        // and import from the actual file path
        const parentDir = path.dirname(path.resolve(currentProjectPath, relativePath));
        imports += `sys.path.append('${parentDir.replace(/\\/g, '/')}')
`;
        // Extract just the filename without extension for import
        const fileName = path.basename(relativePath, '.py');
        modulePath = fileName;
      } else {
        // For normal relative paths, convert to module format
        modulePath = modulePath.replace(/\//g, '.');
      }
      
      imports += `from ${modulePath} import ${func.function_name}
`;
    });

    // Generate the run function with injected flow data and API key
    let runFunction = `
def run(initial_input=None):
  """
  Execute the agent flow defined in intermediate.json

  Args:
      initial_input: The initial input to pass to the first node in the flow
  """
  try:
      # Injected flow data from intermediate.json
      flow_data = ${JSON.stringify(intermediateData, null, 8).replace(/true/g, 'True').replace(/false/g, 'False')}
      flow = flow_data['flow']
      
      # Get Martian API key from .langsketch-credentials.json
      try:
          credentials_path = os.path.join(os.path.dirname(__file__), '.langsketch-credentials.json')
          with open(credentials_path, 'r') as f:
              credentials = json.load(f)
          # Get the first Martian API key from the llmKeys array
          llm_keys = credentials.get('llmKeys', [])
          martian_key = next((key for key in llm_keys if key.get('provider') == 'martian'), None)
          api_key = martian_key.get('apiKey', 'your-api-key-here') if martian_key else 'your-api-key-here'
      except Exception as e:
          print(f"Warning: Could not read credentials file: {e}")
          api_key = 'your-api-key-here'
      
      # Find the starting agent
      start_agent = next(item for item in flow if item['is_start'])
      if start_agent['is_agent']:
          print(f"Starting with agent: {start_agent['agent_name']}")
      else:
          print(f"Starting with function: {start_agent['function_name']}")
      
      # Initialize agents
      agents = {}
  `;

      // Add agent initialization
      agents.forEach(agentName => {
        runFunction += `    agents['${agentName}'] = build_agent('${agentName}', api_key)
  `;
      });

      // Generate the flow execution logic
      runFunction += `
      # Execute the flow step by step following intermediate.json order
      # Note: All inputs/outputs are expected to be dicts (not JSON strings or arrays)
      current_data = None
      
      # Process each step in the flow in order (top to bottom from intermediate.json)
      # This follows the exact order of items in the flow array from intermediate.json
      for i, step in enumerate(flow):
          # Validate step data
          if not isinstance(step, dict):
              print(f"Error: Step {i+1} is not a valid dictionary: {step}")
              current_data = {"error": f"Invalid step data at index {i}"}
              continue
              
          if 'is_agent' not in step:
              print(f"Error: Step {i+1} missing 'is_agent' field: {step}")
              current_data = {"error": f"Missing 'is_agent' field at index {i}"}
              continue
              
          step_name = step['agent_name'] if step['is_agent'] else step['function_name']
          step_type = "agent" if step['is_agent'] else "function"
          print(f"Step {i+1}: Processing {step_type} '{step_name}' (index {i} in flow array)")
          
          if step['is_agent']:
              # Validate agent data
              if 'agent_name' not in step or not step['agent_name']:
                  print(f"Error: Step {i+1} missing or empty 'agent_name' field")
                  current_data = {"error": f"Missing agent_name at index {i}"}
                  continue
                  
              agent_name = step['agent_name']
              if agent_name not in agents:
                  print(f"Error: Agent '{agent_name}' not found in initialized agents")
                  current_data = {"error": f"Agent '{agent_name}' not found"}
                  continue
                  
              # Execute agent - agents expect dict input and return dict output
              agent = agents[agent_name]
              
              if current_data is None:
                  # This is the first node in the flow, use the provided initial input
                  if initial_input is not None:
                      # Use the provided initial input
                      if isinstance(initial_input, dict):
                          current_data = initial_input
                      else:
                          # Convert non-dict input to dict format
                          current_data = {"text": str(initial_input)}
                      print(f"Using provided initial input: {current_data}")
                  else:
                      # Fallback: prompt for user input if no initial input provided
                      print("Please provide initial input for the flow:")
                      user_input = input("Input: ")
                      # Convert user input to dict format
                      current_data = {"text": user_input}
              
              # Prepare input for agent using the helper function
              try:
                  agent_input = prepare_agent_input(agent, current_data)
                  print(f"Prepared agent input: {agent_input}")
              except Exception as e:
                  print(f"Warning: Could not prepare agent input properly: {e}")
                  # Fallback to simple text input in dict format
                  agent_input = {"text": str(current_data) if current_data else ""}
              
              print(f"Passing input to agent '{agent_name}': {agent_input}")
              try:
                  # agent.run() expects a dict and returns a dict
                  current_data = agent.run(agent_input)
                  print(f"Agent output: {current_data}")
              except Exception as e:
                  print(f"Error executing agent {step['agent_name']}: {e}")
                  print("This might be due to input format mismatch. Check the agent's input schema.")
                  current_data = {"error": str(e)}
              
          else:
              # Validate function data
              if 'function_name' not in step or not step['function_name']:
                  print(f"Error: Step {i+1} missing or empty 'function_name' field")
                  current_data = {"error": f"Missing function_name at index {i}"}
                  continue
                  
              if 'function_path' not in step or not step['function_path']:
                  print(f"Error: Step {i+1} missing or empty 'function_path' field")
                  current_data = {"error": f"Missing function_path at index {i}"}
                  continue
              
              # Execute function - get function from intermediate.json flow data
              function_name = step['function_name']
              function_path = step['function_path']
              
              # Import the function dynamically from the specified path
              module_path = os.path.relpath(function_path, os.path.dirname(__file__))
              module_path = module_path.replace(os.sep, '/').replace('.py', '')
              
              # Handle relative paths with ../ by adding parent directory to sys.path
              if module_path.startswith('../'):
                  parent_dir = os.path.dirname(os.path.abspath(function_path))
                  if parent_dir not in sys.path:
                      sys.path.append(parent_dir)
                  # Extract just the filename without extension for import
                  module_name = os.path.basename(module_path)
              else:
                  # For normal relative paths, convert to module format
                  module_name = module_path.replace('/', '.')
              
              try:
                  module = __import__(module_name, fromlist=[function_name])
                  func = getattr(module, function_name)
                  
                  # Check if function accepts arguments by inspecting its signature
                  import inspect
                  sig = inspect.signature(func)
                  params = list(sig.parameters.keys())
                  
                  # Handle initial input for first node
                  if current_data is None:
                      # This is the first node in the flow, use the provided initial input
                      if initial_input is not None:
                          # Use the provided initial input
                          if isinstance(initial_input, dict):
                              current_data = initial_input
                          else:
                              # Convert non-dict input to dict format
                              current_data = {"text": str(initial_input)}
                          print(f"Using provided initial input: {current_data}")
                      else:
                          # Fallback: use empty dict if no initial input provided
                          current_data = {}
                  
                  # Pass the current data to the function based on its signature
                  print(f"Passing input to function '{function_name}': {current_data}")
                  if len(params) == 0:
                      # Function takes no arguments
                      current_data = func()
                  elif len(params) == 1:
                      # Function takes one argument
                      current_data = func(current_data)
                  else:
                      # Function takes multiple arguments - pass as keyword args if possible
                      if 'data' in params:
                          current_data = func(data=current_data)
                      elif 'input' in params:
                          current_data = func(input=current_data)
                      else:
                          # Fallback: pass as first positional argument
                          current_data = func(current_data)
                  
                  print(f"Function output: {current_data}")
                  
              except Exception as e:
                  print(f"Error executing function {function_name} from {function_path}: {e}")
                  current_data = {"error": str(e)}
      
      print(f"Flow completed. Final output: {current_data}")
      return current_data
      
  except Exception as e:
      print(f"Error executing flow: {e}")
      return None

if __name__ == "__main__":
  result = run()
  print(f"Final result: {result}")
`;

    return imports + runFunction;
  }

  // Helper function to generate agent input preparation helper
  function generateAgentInputHelper() {
    return `
def prepare_agent_input(agent, current_input):
    """
    Prepare input for agent - always returns a dict
    Agents expect dict input, not JSON or arrays
    """
    try:
        # Get the agent's input configuration
        input_config = agent.config.agent.input

        # For array inputs, just pass through as-is (assume user handles correctly)
        if input_config.is_array:
            return current_input

        # Ensure current_input is a dict for non-array inputs
        if not isinstance(current_input, dict):
            current_input = {"text": str(current_input) if current_input else ""}

        # For non-array input, check if agent expects specific field names
        if input_config.fields and len(input_config.fields) > 0:
            # Check if the current input already has the expected field names
            expected_field = input_config.fields[0].name
            if expected_field in current_input:
                # Already has the right field name
                return current_input
            else:
                # Map the input to the expected field name
                return {expected_field: current_input.get("text", str(current_input))}
        else:
            # Use the dict as-is
            return current_input

    except Exception as e:
        print(f"Warning: Could not prepare agent input properly: {e}")
        # Fallback to simple text input in dict format
        return {"text": str(current_input) if current_input else ""}
`;
  }

  // findFileInProject is now available globally from file_utilities.js

  // Export to App namespace
  global.App = global.App || {};
  global.App.flowCompile = {
    validateAgenticFlow,
    hasPathToRedCircle,
    generateIntermediateJson,
    generateIntermediatePreview,
    testIntermediateJsonGeneration,
    debugFlowValidation,
    createFlowElement,
    buildFlowFromStart,
    findConnectedItems,
    handleCompile,
    showTestJsonModal,
    hideTestJsonModal,
    generateRunScript,
    generateRunPyContent,
    generateAgentInputHelper,
    findFileInProject
  };

  // Back-compat exports for global access
  global.validateAgenticFlow = validateAgenticFlow;
  global.hasPathToRedCircle = hasPathToRedCircle;
  global.generateIntermediateJson = generateIntermediateJson;
  global.generateIntermediatePreview = generateIntermediatePreview;
  global.testIntermediateJsonGeneration = testIntermediateJsonGeneration;
  global.debugFlowValidation = debugFlowValidation;
  global.createFlowElement = createFlowElement;
  global.buildFlowFromStart = buildFlowFromStart;
  global.findConnectedItems = findConnectedItems;
  global.handleCompile = handleCompile;
  global.showTestJsonModal = showTestJsonModal;
  global.hideTestJsonModal = hideTestJsonModal;

})(window);