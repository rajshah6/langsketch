// Agents Tab Component
// This file contains all the functionality and styling for the Agents tab

(function (global) {
  class AgentsTab {
    constructor() {
      // Use shared state instead of local variables
      const S = window.App.state;
      this.S = S;
      
      // Keep local state for UI-specific data
      this.selectedUtilities = [];
      this.scrapingItems = [];
      this.documents = [];
      this.inputVariables = [];
      this.outputVariables = [];
      this.apis = [];
      this.tools = [];
      this.toolsCurrentPath = '/';
      this.fileInputEventListenersSetup = false;
      
      // Add property watcher to track documents array changes
      Object.defineProperty(this, 'documents', {
        get: function() {
          return this._documents;
        },
        set: function(value) {
          console.log('Documents array being set to:', value);
          console.log('Stack trace:', new Error().stack);
          this._documents = value;
        }
      });
      
      // Initialize the private documents property
      this._documents = [];
      
      this.init();
    }

    init() {
      this.injectStyles();
      this.render();
      this.setupEventListeners();
      this.loadAgents();
    }

    injectStyles() {
      // Inject CSS styles for the component
      const styleId = 'agents-tab-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .agents-view {
            padding: 0 0 0 20px;
            text-align: left;
            width: 100% !important;
            max-width: none !important;
            min-width: 100% !important;
            flex: 1 1 100% !important;
            align-self: stretch !important;
          }

          .agents-header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
            width: 100%;
            max-width: none;
          }

          .agents-main-title {
            color: #000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          }

          .agents-header-section::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: -40px;
            right: -40px;
            height: 3px;
            background-color: rgba(251, 144, 40, 0.6);
          }

          .agents-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-right: 20px;
            margin-top: 16px;
          }

          .agents-search-input {
            width: 200px;
            padding: 6px 10px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            outline: none;
            transition: border-color 0.2s ease;
          }

          .agents-search-input:focus {
            border-color: rgba(251, 144, 40, 255);
          }

          .agents-search-input::placeholder {
            color: #999;
          }

          .agents-add-button {
            background-color: transparent;
            border: 2px solid #28a745;
            color: #28a745;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            margin-left: 15px;
          }

          .agents-add-button:hover {
            background-color: #28a745;
            color: white;
          }

          .agents-add-button:active {
            background-color: #218838;
            border-color: #218838;
            color: white;
          }
          .agents-analytics-button {
            background-color: transparent;
            border: 2px solid #FB9028;
            color: #FB9028;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            margin-left: 15px;
          }
          .agents-analytics-button:hover {
            background-color: #FB9028;
            color: white;
          }
          .agents-analytics-button:active {
            background-color: #e8811f;
            border-color: #e8811f;
            color: white;
          }

          .add-agent-page {
            display: flex;
            height: 100%;
            background-color: white;
            position: relative;
            width: 100%;
          }

          .left-section {
            width: 350px;
            background-color: white;
            padding: 15px 15px 15px 2px;
            position: relative;
            border-right: 2px solid #e0e0e0;
            height: calc(100vh - 100px);
            box-sizing: border-box;
            overflow-y: auto;
          }

          .right-section {
            flex: 1;
            background-color: white;
            position: relative;
            padding: 15px;
            overflow: hidden;
            height: calc(100vh - 100px);
            min-width: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
          }

          .right-section-content {
            height: 100%;
            overflow-y: auto;
            padding-right: 0;
            padding-bottom: 20px;
            max-height: 100%;
            width: 100%;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .right-section-item {
            margin-bottom: 0;
            background-color: #f8f9fa;
            border-radius: 12px;
            padding: 15px;
            border: 1px solid #e9ecef;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          .right-section-item .section-header {
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }

          .right-section-item .section-title {
            font-size: 16px;
            color: #495057;
            margin: 0;
          }

          /* Styled Headings */
          .styled-heading {
            display: flex;
            align-items: center;
            gap: 12px;
            background-color: #adb5bd;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            min-width: fit-content;
          }

          .heading-text {
            white-space: nowrap;
          }

          .heading-svg {
            color: white;
            stroke: white;
            flex-shrink: 0;
          }

          .preview-container {
            background-color: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin: 0;
            min-height: 80px;
            height: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            box-sizing: border-box;
            flex: 1;
            min-width: 0;
            max-width: 100%;
            overflow: hidden;
          }

          .preview-container:not(:empty) {
            justify-content: flex-start;
            align-items: stretch;
            width: 100%;
            flex-direction: column;
            overflow-y: auto;
            max-height: 80px;
            height: auto;
          }

          .preview-container .no-content-message {
            color: #6c757d;
            font-style: italic;
            text-align: center;
            margin: 0;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 80px;
          }

          /* Utilities and Scraping side by side */
          .utilities-scraping-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 0;
            width: 100%;
            min-width: 0;
            max-width: 100%;
          }

          .utilities-scraping-row .right-section-item {
            margin-bottom: 0;
            width: 100%;
            min-width: 0;
            max-width: 100%;
          }

          .utilities-selection-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            height: 200px;
            overflow-y: auto;
            padding: 12px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            background-color: #f8f9fa;
            width: 100%;
            box-sizing: border-box;
          }



          .tool-preview-item {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
            font-size: 13px;
          }

          .tool-preview-item:last-child {
            border-bottom: none;
          }

          .tool-preview-name {
            font-weight: 600;
            color: #fb9028;
            flex-shrink: 0;
          }

          .tool-preview-path {
            color: #333;
            font-size: 12px;
            line-height: 1.3;
            text-align: right;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /* Folder Navigation Styles */
          .folder-navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
          }

          .current-path {
            font-size: 14px;
            color: #495057;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            flex: 1;
          }

          .current-path span:first-child {
            color: #6c757d;
            flex-shrink: 0;
          }

          .current-path .path-value {
            color: #495057;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 200px;
            cursor: default;
            padding: 4px 8px;
            background-color: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e9ecef;
            transition: all 0.2s ease;
          }

          .current-path .path-value:hover {
            overflow-x: auto;
            white-space: nowrap;
            text-overflow: clip;
            background-color: #e9ecef;
            border-color: #adb5bd;
            max-width: 300px;
          }

          .current-path .path-value::-webkit-scrollbar {
            height: 4px;
          }

          .current-path .path-value::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 2px;
          }

          .current-path .path-value::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 2px;
          }

          .current-path .path-value::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

          .folder-buttons {
            display: flex;
            gap: 10px;
          }

          .folder-buttons .btn {
            padding: 6px 12px;
            font-size: 13px;
          }

          /* File List Styles */
          .file-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            background-color: white;
            margin-bottom: 20px;
          }

          .file-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            border-bottom: 1px solid #f1f3f4;
            cursor: pointer;
            transition: background-color 0.2s ease;
          }

          .file-item:hover {
            background-color: #f8f9fa;
          }

          .file-item:last-child {
            border-bottom: none;
          }

          .file-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
          }

          .file-icon img {
            width: 20px;
            height: 20px;
            object-fit: contain;
          }

          .file-name {
            font-size: 14px;
            color: #333;
            font-weight: 500;
          }

          /* Function Selection Styles */
          .function-selection {
            background-color: #e3f2fd;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
          }

          .function-selection h3 {
            margin: 0 0 15px 0;
            color: #1976d2;
            font-size: 16px;
          }

          .functions-checkboxes {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .function-checkbox-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background-color: white;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .function-checkbox-item:hover {
            border-color: #2196f3;
            background-color: #f5f9ff;
          }

          .function-checkbox-item input[type="checkbox"] {
            margin: 0;
            cursor: pointer;
          }

          .function-checkbox-item label {
            cursor: pointer;
            font-size: 14px;
            color: #333;
            font-weight: 500;
            flex: 1;
          }

          /* Tool Configuration Modal Sections */
          .tool-section-container {
            margin-bottom: 25px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            /* Remove overflow: hidden to allow dropdowns to be visible */
          }

          .tool-section-header {
            background-color: #f8f9fa;
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .tool-section-header h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #495057;
          }

          .tool-section-content {
            padding: 16px;
            background-color: white;
          }

          .tool-section-content .form-group {
            margin-bottom: 0;
          }

          .tool-section-content .no-content-message {
            text-align: center;
            color: #999;
            font-style: italic;
            font-size: 14px;
            padding: 20px;
            background-color: #fafbfc;
            border: 1px solid #e9ecef;
            border-radius: 4px;
          }

          .utilities-selection-grid .no-content-message {
            grid-column: 1 / -1;
            width: 100%;
            margin: 0;
          }

          .utility-preview-item {
            display: block;
            padding: 6px 0;
            border-bottom: 1px solid #f0f0f0;
            width: 100%;
            clear: both;
            min-height: 28px;
            box-sizing: border-box;
          }

          .utility-preview-item:last-child {
            border-bottom: none;
          }

          .utility-preview-name {
            color: #fb9028;
            font-size: 14px;
            font-weight: 500;
          }

          /* Specific styling for utilities preview container */
          #utilitiesPreviewContainer.preview-container:not(:empty) {
            max-height: 80px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #c1c1c1 #f1f1f1;
            padding: 12px 20px;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
          }

          #utilitiesPreviewContainer.preview-container:not(:empty) .preview-item:nth-child(n+3) {
            display: none;
          }

          #utilitiesPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar {
            width: 6px;
          }

          #utilitiesPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }

          #utilitiesPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }

          #utilitiesPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

          /* Scraping modal layout */
          .scraping-top-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }

          .scraping-top-row .form-group {
            margin-bottom: 0;
          }

          /* Scraping preview items styling */
          .scraping-preview-item {
            display: block;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            width: 100%;
            clear: both;
            min-height: 32px;
            box-sizing: border-box;
          }

          .scraping-preview-item:last-child {
            border-bottom: none;
          }

          .scraping-preview-url {
            display: block;
            color: #fb9028;
            font-size: 14px;
            font-weight: 500;
          }

          /* Specific styling for scraping preview container */
          #scrapingPreviewContainer.preview-container:not(:empty) {
            max-height: 80px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #c1c1c1 #f1f1f1;
            padding: 12px 20px;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
          }

          #scrapingPreviewContainer.preview-container:not(:empty) .preview-item:nth-child(n+3) {
            display: none;
          }

          #scrapingPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar {
            width: 6px;
          }

          #scrapingPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }

          #scrapingPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }

          #scrapingPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

          /* Specific styling for documents container - override preview-container rules */
          #ragPreviewContainer.preview-container {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          #ragPreviewContainer.preview-container .click-browse-content {
            min-height: 120px;
            height: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          }

          #ragPreviewContainer.preview-container .upload-icon {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
          }

          #ragPreviewContainer.preview-container .click-browse-text {
            color: #6c757d;
            font-size: 14px;
            line-height: 1.4;
            font-weight: 500;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
            margin: 0;
          }

          /* Documents controls styling */
          .documents-controls {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .file-count-circle {
            width: 24px;
            height: 24px;
            background-color: #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            position: relative;
            z-index: 10;
          }

          .file-count-number {
            color: white;
            font-size: 12px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            user-select: none;
          }

          .reset-files-btn {
            width: 24px;
            height: 24px;
            background-color: #000;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
          }

          .reset-files-btn:hover {
            background-color: #333;
            transform: scale(1.05);
          }

          .reset-files-btn:active {
            transform: scale(0.95);
          }

          .reset-icon {
            width: 16px;
            height: 16px;
          }

          .utility-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px 8px;
            background-color: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          }

          .utility-option:hover {
            border-color: rgba(251, 144, 40, 255);
            transform: translateY(-2px);
          }

          .utility-option.selected {
            border-color: rgba(251, 144, 40, 255);
            background-color: rgba(251, 144, 40, 0.1);
          }

          .utility-option img {
            width: 40px;
            height: 40px;
            object-fit: contain;
            max-width: 100%;
          }

          .utility-option .utility-name {
            font-size: 13px;
            font-weight: 500;
            color: #333;
            line-height: 1.2;
            width: 100%;
            text-align: center;
            word-wrap: break-word;
          }

          .help-text {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
            font-style: italic;
          }

          /* Click to Browse Styles */
          .click-browse-zone {
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px dashed #e0e0e0;
            background-color: #f8f9fa;
            position: relative;
            width: 100%;
            box-sizing: border-box;
          }

          .click-browse-zone:hover {
            border-color: #adb5bd;
            background-color: #e9ecef;
            width: 100%;
            border-style: dashed;
          }

          .click-browse-zone.drag-over {
            border-color: rgba(251, 144, 40, 255);
            background-color: rgba(251, 144, 40, 0.1);
            transform: scale(1.02);
            width: 100%;
            border-style: dashed;
          }

          .click-browse-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            height: 100%;
            min-height: 120px;
            position: relative;
            z-index: 1;
            width: 100%;
            box-sizing: border-box;
          }

          .upload-icon {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .click-browse-text {
            color: #6c757d;
            font-size: 14px;
            line-height: 1.4;
            font-weight: 500;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          }

          .file-input-hidden {
            position: absolute;
            opacity: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
            top: 0;
            left: 0;
            box-sizing: border-box;
          }

          .click-browse-zone.has-files {
            border-style: dashed;
            border-color: #e0e0e0;
            background-color: #f8f9fa;
            width: 100%;
          }

          .add-agent-container {
            height: 100%;
            padding: 0;
            padding-left: 0;
            width: 100%;
          }

          .agent-section {
            margin-bottom: 15px;
            width: 100%;
          }

          .section-title {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 0 0 8px 0;
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            width: 100%;
          }

          .input-group {
            display: flex;
            gap: 10px;
            align-items: center;
            width: 100%;
          }

          .orange-plus-button {
            background-color: #ff8c00;
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease;
          }

          .orange-plus-button:hover {
            background-color: #e67e00;
          }

          .manage-button {
            background-color: #ff8c00;
            color: white;
            border: none;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease;
            min-width: 70px;
          }

          .manage-button:hover {
            background-color: #e67e00;
          }

          .no-content-message {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            color: #999;
            font-style: italic;
            margin: 0;
            text-align: center;
            padding: 12px 20px;
            background-color: #fafbfc;
            border-radius: 6px;
            border: 1px dashed #e9ecef;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 40px;
          }

          .agent-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            outline: none;
            transition: border-color 0.2s ease;
            box-sizing: border-box;
          }

          .agent-input:focus {
            border-color: #666;
          }

          .color-input {
            width: 50px;
            height: 44px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            outline: none;
            box-sizing: border-box;
          }

          .agent-textarea {
            width: 100%;
            min-height: 100px;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            outline: none;
            transition: border-color 0.2s ease;
            resize: vertical;
            box-sizing: border-box;
          }

          .agent-textarea.role-textarea {
            height: 120px;
            resize: vertical;
            overflow: auto;
            position: relative;
            min-width: 100%;
            max-width: 100%;
          }

          .agent-textarea.role-textarea::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 20px;
            height: 20px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M18 16V14H16V16H18ZM14 10V8H12V10H14ZM10 6V4H8V6H10ZM6 2V0H4V2H6ZM2 6V4H0V6H2ZM6 10V8H4V10H6ZM10 14V12H8V14H10ZM14 18V16H12V18H14ZM18 22V20H16V22H18ZM22 18V16H20V18H22ZM18 14V12H16V14H18ZM14 10V8H12V10H14ZM10 6V4H8V6H10ZM6 2V0H4V2H6ZM2 6V4H0V6H2ZM6 10V8H4V10H6ZM10 14V12H8V14H10ZM14 18V16H12V18H14ZM18 22V20H16V22H18ZM22 18V16H20V18H22Z' fill='%23ccc'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: bottom left;
            background-size: 16px 16px;
            pointer-events: none;
            opacity: 0.6;
          }

          .agent-textarea.role-textarea:hover::after {
            opacity: 1;
          }

          .agent-textarea:focus {
            border-color: #666;
          }

          .section-separator {
            height: 1px;
            background-color: #e0e0e0;
            margin: 15px 0;
            width: 100%;
          }

          /* Modal Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
          }

          .modal {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px 16px 24px;
            border-bottom: 1px solid #e5e5e5;
            gap: 16px;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #333;
            flex: 1;
            min-width: 0;
          }

          .modal-close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: #999;
            cursor: pointer;
            padding: 0;
            border-radius: 50%;
            transition: all 0.2s ease;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-left: auto;
          }

          .modal-close-btn:hover {
            background-color: #f5f5f5;
            color: #666;
          }

          .modal-content {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 20px;
            position: relative;
            width: 100%;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
            font-size: 14px;
            width: 100%;
          }

          .radio-group {
            display: flex;
            gap: 20px;
          }

          .radio-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 14px;
          }

          .radio-label input[type="radio"] {
            margin: 0;
          }

          .input-variable-row,
          .output-variable-row {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: center;
          }

          #inputVariablesContainer,
          #outputVariablesContainer {
            height: 200px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 10px;
            background-color: #f8f9fa;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 8px;
          }

          #inputVariablesContainer:empty::after,
          #outputVariablesContainer:empty::after {
            content: "None added...";
            color: #999;
            font-style: italic;
            font-size: 14px;
          }

          #inputVariablesContainer:not(:empty),
          #outputVariablesContainer:not(:empty) {
            align-items: stretch;
            justify-content: flex-start;
          }

          /* Tool configuration modal input/output containers */
          #toolInputVariablesContainer,
          #toolOutputVariablesContainer {
            height: 200px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 10px;
            background-color: #f8f9fa;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 8px;
          }

          #toolInputVariablesContainer:empty::after {
            content: "No input fields added...";
            color: #999;
            font-style: italic;
            font-size: 14px;
          }

          #toolOutputVariablesContainer:empty::after {
            content: "No output fields added...";
            color: #999;
            font-style: italic;
            font-size: 14px;
          }

          #toolInputVariablesContainer:not(:empty),
          #toolOutputVariablesContainer:not(:empty) {
            align-items: stretch;
            justify-content: flex-start;
          }

          .var-name {
            flex: 2;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
          }

          .var-type {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
          }

          /* Custom Select Styles */
          .custom-select {
            flex: 1;
            position: relative;
            user-select: none;
          }

          .select-selected {
            background-color: white;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            position: relative;
          }

          .select-selected:after {
            position: absolute;
            content: "";
            top: 14px;
            right: 10px;
            width: 0;
            height: 0;
            border: 6px solid transparent;
            border-color: #666 transparent transparent transparent;
          }

          .select-selected.select-arrow-active:after {
            border-color: transparent transparent #666 transparent;
            top: 8px;
          }

          .select-items {
            position: fixed;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-height: 200px;
            overflow-y: auto;
            z-index: 99999;
          }

          /* Ensure dropdown appears above modal content */
          .modal .select-items {
            z-index: 10000;
          }

          /* Force dropdown to be visible above all content */
          .tool-section-container .select-items {
            z-index: 10001;
          }

          /* Ensure dropdown options are fully visible */
          .select-option {
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: fit-content;
          }

          /* Custom scrollbar for dropdown */
          .select-items::-webkit-scrollbar {
            width: 8px;
          }

          .select-items::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }

          .select-items::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }

          .select-items::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

          /* Ensure dropdown is positioned correctly in all contexts */
          .modal-content .custom-select {
            position: relative;
            z-index: 1;
          }

          /* Ensure dropdown breaks out of overflow containers */
          .modal-content .select-items {
            z-index: 10002;
            position: fixed;
          }

          /* Specific styling for tool configuration modal dropdowns */
          #toolConfigModal .select-items {
            z-index: 10003;
            position: fixed;
          }

          .select-hide {
            display: none;
          }

          /* Ensure dropdown is always on top and visible */
          .select-items:not(.select-hide) {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          /* Force dropdown to break out of any overflow constraints */
          .select-items {
            position: fixed !important;
            z-index: 99999 !important;
            max-height: 200px !important;
            overflow-y: auto !important;
          }

          /* Ensure dropdown doesn't extend beyond viewport */
          .select-items {
            max-width: calc(100vw - 40px) !important;
            word-wrap: break-word !important;
          }



          .select-option:hover {
            background-color: #f8f9fa;
          }

          .select-option[data-value="float"] {
            color: #ff8c00;
          }

          .select-option[data-value="int"] {
            color: #007bff;
          }

          .select-option[data-value="string"] {
            color: #28a745;
          }

          .select-option[data-value="bool"] {
            color: #dc3545;
          }

          .select-selected[data-value="float"] {
            color: #ff8c00;
          }

          .select-selected[data-value="int"] {
            color: #007bff;
          }

          .select-selected[data-value="string"] {
            color: #28a745;
          }

          .select-selected[data-value="bool"] {
            color: #dc3545;
          }

          .var-description {
            flex: 3;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
          }



          .add-var-btn {
            background: white;
            color: #28a745;
            border: 2px solid #28a745;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin: 0;
            transition: all 0.2s ease;
          }

          .add-var-btn:hover {
            background-color: #28a745;
            color: white;
          }

          .add-var-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #e9ecef;
            color: #6c757d;
            border-color: #dee2e6;
          }

          .add-var-btn:disabled:hover {
            background-color: #e9ecef;
            color: #6c757d;
            border-color: #dee2e6;
          }

          /* Special positioning for tool configuration modal buttons */
          .tool-section-header .add-var-btn {
            position: static;
            right: auto;
            top: auto;
          }

          /* Input/Output Preview Styles */
          #inputPreviewContainer,
          #outputPreviewContainer {
            margin-top: 8px;
            height: 80px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 10px;
            background-color: #f8f9fa;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
          }

          .preview-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #e9ecef;
            font-size: 13px;
          }

          .preview-item:last-child {
            border-bottom: none;
          }

          .preview-name {
            font-weight: 500;
            color: #333;
          }

          .input-type {
            color: #fb9028;
            font-size: 12px;
            font-weight: 500;
            margin-left: 8px;
            font-family: monospace;
          }

          .output-type {
            color: #fb9028;
            font-size: 12px;
            font-weight: 500;
            margin-left: 8px;
            font-family: monospace;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px 24px 24px;
            border-top: 1px solid #e5e5e5;
          }

          .btn {
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            border: 2px solid;
            transition: all 0.2s ease;
            min-width: 80px;
          }

          .btn-secondary {
            background-color: transparent;
            border-color: #000;
            color: #000;
          }

          .btn-secondary:hover {
            background-color: #000;
            color: white;
          }

          .btn-primary {
            background-color: transparent;
            border-color: #28a745;
            color: #28a745;
          }

          .btn-primary:hover {
            background-color: #28a745;
            color: white;
          }







          .tools-section-extended {
            flex: 1;
            min-height: 200px;
          }

          .tools-section-extended .preview-container {
            flex: 1;
            min-height: 120px;
          }

          /* Make APIs and Tools sections equal height */
          .right-section-item:has(#apisPreviewContainer),
          .right-section-item:has(#toolsPreviewContainer) {
            flex: 1;
            min-height: 200px;
          }

          .right-section-item:has(#apisPreviewContainer) .preview-container,
          .right-section-item:has(#toolsPreviewContainer) .preview-container {
            flex: 1;
            min-height: 120px;
          }

          .add-agent-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: white;
            z-index: 1000;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          }

          .footer-separator {
            height: 1.5px;
            background-color: #e0e0e0;
            margin-bottom: 12px;
          }

          .footer-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 0 40px 12px 40px;
          }

          .cancel-button {
            background-color: transparent;
            border: 2px solid #000;
            color: #000;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 80px;
          }

          .cancel-button:hover {
            background-color: #000;
            color: white;
          }

          .add-button-green {
            background-color: transparent;
            border: 2px solid #28a745;
            color: #28a745;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 80px;
          }

          .add-button-green:hover {
            background-color: #28a745;
            color: white;
          }



          .agents-listing-section {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 20px;
            padding: 10px 0;
            width: 100%;
            max-width: none;
          }

          .agents-listing-section.no-agents {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 300px;
          }

          .no-agents-message {
            text-align: center;
            color: #666;
            font-size: 18px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          /* Agent Cards in the main listing */
          .agent-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 16px 12px;
            border: 1px solid #e9ecef;
            border-radius: 10px;
            background-color: #f8f9fa;
            cursor: pointer;
            transition: all 0.2s ease;
            min-height: 120px;
            justify-content: center;
            position: relative;
          }

          .agent-card:hover {
            background-color: #e9ecef;
            box-shadow: 0 6px 16px rgba(0,0,0,0.15);
            transform: translateY(-2px);
          }

          .agent-card-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: white;
            border: 2px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .agent-card-icon-inner {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .agent-card-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .agent-delete-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 10;
          }

          .agent-delete-btn:hover {
            background-color: #c82333;
            transform: scale(1.1);
          }

          .agent-delete-btn:active {
            transform: scale(0.95);
          }









          .config-panels {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            width: 100%;
          }

          .config-panel {
            background-color: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }

          .config-panel h3 {
            margin: 0 0 20px 0;
            font-size: 20px;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid rgba(251, 144, 40, 255);
            padding-bottom: 10px;
          }

          .config-field {
            margin-bottom: 20px;
          }

          .config-field label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
          }

          .config-field input,
          .config-field textarea,
          .config-field select {
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
            transition: border-color 0.2s ease;
          }

          .config-field input:focus,
          .config-field textarea:focus,
          .config-field select:focus {
            border-color: rgba(251, 144, 40, 255);
            outline: none;
          }

          .field-item {
            display: grid;
            grid-template-columns: 2fr 1fr 2fr auto;
            gap: 10px;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 6px;
          }

          .remove-field-btn {
            width: 24px;
            height: 24px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          }

          .add-field-btn {
            padding: 8px 16px;
            background-color: rgba(251, 144, 40, 255);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .add-field-btn:hover {
            background-color: #e8690b;
          }

          .tools-section,
          .utilities-section {
            margin-bottom: 24px;
          }

          .tools-section h4,
          .utilities-section h4 {
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            color: #555;
          }

          .tools-grid,
          .utilities-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
            margin-bottom: 15px;
          }

          .tool-item,
          .utility-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background-color: #f8f9fa;
            border: 2px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .tool-item:hover,
          .utility-item:hover {
            border-color: rgba(251, 144, 40, 255);
            transform: translateY(-2px);
          }

          .tool-item.selected,
          .utility-item.selected {
            border-color: rgba(251, 144, 40, 255);
            background-color: rgba(251, 144, 40, 0.1);
          }

          .tool-icon,
          .utility-icon {
            font-size: 24px;
          }

          .tool-name,
          .utility-name {
            font-size: 12px;
            font-weight: 500;
            color: #333;
            text-align: center;
            line-height: 1.2;
          }

          .add-tool-btn {
            padding: 8px 16px;
            background-color: rgba(251, 144, 40, 255);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .add-tool-btn:hover {
            background-color: #e8690b;
          }

          .rag-apis {
            grid-column: 1 / -1;
          }

          .rag-section,
          .apis-section {
            margin-bottom: 24px;
          }

          .rag-section h4,
          .apis-section h4 {
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            color: #555;
          }

          .rag-fields {
            display: grid;
            gap: 15px;
          }

          .api-item {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 15px;
          }

          .api-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .api-name {
            flex: 1;
            margin-right: 15px;
          }

          .remove-api-btn {
            width: 24px;
            height: 24px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          }

          .api-url,
          .api-method,
          .api-auth,
          .api-description {
            margin-bottom: 15px;
          }

          .api-auth {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }

          .add-api-btn {
            padding: 8px 16px;
            background-color: rgba(251, 144, 40, 255);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .add-api-btn:hover {
            background-color: #e8690b;
          }

          /* API Modal specific styles */
          .auth-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }

          .auth-details {
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px;
            background-color: #f8f9fa;
          }

          /* API Preview Items */
          .api-preview-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
            font-size: 13px;
            gap: 15px;
          }

          .api-preview-item:last-child {
            border-bottom: none;
          }

          .api-preview-name {
            flex-shrink: 0;
            color: #fb9028;
            font-weight: 600;
            font-size: 12px;
            min-width: 80px;
          }

          .api-preview-url {
            flex: 1;
            color: #333;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: center;
            max-width: 200px;
          }

          .api-preview-auth {
            flex-shrink: 0;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            min-width: 70px;
            text-align: center;
          }

          .api-preview-auth.no-auth {
            background-color: #e9ecef;
            color: #6c757d;
          }

          .api-preview-auth.api-key {
            background-color: #fff3cd;
            color: #856404;
          }

          /* APIs preview container height limit */
          #apisPreviewContainer.preview-container:not(:empty) {
            max-height: 120px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #c1c1c1 #f1f1f1;
            padding: 12px 20px;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
          }

          #apisPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar {
            width: 6px;
          }

          #apisPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }

          #apisPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }

          #apisPreviewContainer.preview-container:not(:empty)::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

          /* Tool Item Styles */
          .tool-item {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 15px;
          }

          .tool-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .tool-name {
            flex: 1;
            margin-right: 15px;
          }

          .remove-tool-btn {
            width: 24px;
            height: 24px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          }

          .tool-inputs,
          .tool-outputs {
            margin-bottom: 15px;
          }

          .tool-inputs h5,
          .tool-outputs h5 {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: 600;
            color: #555;
          }

          .tool-code {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }

          .tool-array-toggle {
            margin-top: 10px;
          }

          .tool-array-toggle label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #666;
          }

          /* API Headers and Queries */
          .api-headers,
          .api-queries {
            margin-bottom: 15px;
          }

          .api-headers label,
          .api-queries label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
          }

          .header-fields,
          .query-fields {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 10px;
            margin-bottom: 10px;
          }

          .add-header-btn,
          .add-query-btn {
            padding: 8px 12px;
            background-color: rgba(251, 144, 40, 255);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }

          .headers-list,
          .queries-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .header-item,
          .query-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background-color: #e9ecef;
            border-radius: 4px;
            font-size: 14px;
          }

          .remove-header-btn,
          .remove-query-btn {
            width: 20px;
            height: 20px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
          }

          /* Scraping Styles */
          .scraping-section {
            margin-top: 24px;
          }

          .scraping-section h4 {
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            color: #555;
          }

          .scraping-item {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 15px;
          }

          .scraping-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .scraping-name {
            flex: 1;
            margin-right: 15px;
          }

          .remove-scraping-btn {
            width: 24px;
            height: 24px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          }

          .add-scraping-btn {
            padding: 8px 16px;
            background-color: rgba(251, 144, 40, 255);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .add-scraping-btn:hover {
            background-color: #e8690b;
          }

          /* Input Array Toggle */
          .input-array-toggle {
            margin-bottom: 15px;
          }

          .input-array-toggle label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #666;
          }







          /* Ensure agents view can use full width in project mode */
          .main-content.has-project .agents-view {
            width: 100% !important;
            max-width: none !important;
            min-width: 100% !important;
            flex: 1 1 100% !important;
            align-self: stretch !important;
          }


        `;
        document.head.appendChild(style);
      }
    }

    render() {
      return `
        <div class="agents-view">
          <div class="agents-header-section">
            <h1 class="agents-main-title">My Agents</h1>
            <div class="agents-controls">
              <input type="text" class="agents-search-input" placeholder="Search agents by name..." id="agentsSearchInput">
              <button class="agents-add-button" id="agentsAddButton">+ Add Agent</button>
              <button class="agents-analytics-button" id="agentsAnalyticsButton">📊 Open Analytics</button>
            </div>
          </div>
          <div class="agents-listing-section" id="agentsListingSection">
            <!-- Agents will be populated here -->
          </div>
        </div>
      `;
    }

    setupEventListeners() {
      // Search functionality
      const searchInput = document.getElementById('agentsSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase().trim();
          this.filterAgents(searchTerm);
        });
      }

      // Add Agent button functionality
      const addAgentButton = document.getElementById('agentsAddButton');
      if (addAgentButton) {
        addAgentButton.addEventListener('click', () => {
          this.handleAddAgent();
        });
      }

      // Analytics button functionality
      const analyticsButton = document.getElementById('agentsAnalyticsButton');
      if (analyticsButton) {
        analyticsButton.addEventListener('click', () => {
          this.handleOpenAnalytics();
        });
      }
    }

    loadAgents() {
      this.scanForAgents();
    }

    scanForAgents() {
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
          this.S.agents = [];
          this.updateAgentsListing();
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
        
        this.S.agents = agentFiles;
        this.updateAgentsListing();
        
      } catch (error) {
        console.error('Error scanning for agents:', error);
        this.S.agents = [];
        this.updateAgentsListing();
      }
    }

    updateAgentsListing() {
      const agentsListingSection = document.getElementById('agentsListingSection');
      if (!agentsListingSection) return;

      agentsListingSection.innerHTML = '';

      if (this.S.agents.length === 0) {
        agentsListingSection.classList.add('no-agents');
        const noAgentsMessage = document.createElement('div');
        noAgentsMessage.className = 'no-agents-message';
        noAgentsMessage.textContent = 'No agents found. Please create some.';
        agentsListingSection.appendChild(noAgentsMessage);
        return;
      }

      agentsListingSection.classList.remove('no-agents');

      this.S.agents.forEach(agent => {
        const agentCard = this.createAgentCard(agent);
        agentsListingSection.appendChild(agentCard);
      });
    }

    createAgentCard(agent) {
      const agentCard = document.createElement('div');
      agentCard.className = 'agent-card';
      
      // Create delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'agent-delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = 'Delete Agent';
      
      // Add delete functionality
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click event
        this.handleDeleteAgent(agent);
      });
      
      const agentIcon = document.createElement('div');
      agentIcon.className = 'agent-card-icon';
      
      const agentIconInner = document.createElement('div');
      agentIconInner.className = 'agent-card-icon-inner';
      agentIconInner.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" fill="${agent.color}"/>
          <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke="${agent.color}" stroke-width="2" fill="none"/>
        </svg>
      `;
      
      agentIcon.appendChild(agentIconInner);
      
      const agentName = document.createElement('div');
      agentName.className = 'agent-card-name';
      agentName.textContent = agent.name;
      
      agentCard.appendChild(deleteBtn);
      agentCard.appendChild(agentIcon);
      agentCard.appendChild(agentName);
      
      // Add click functionality for future agent management
      agentCard.addEventListener('click', () => {
        this.handleAgentClick(agent);
      });
      
      return agentCard;
    }

    filterAgents(searchTerm) {
      const agentsListingSection = document.getElementById('agentsListingSection');
      if (!agentsListingSection) return;

      if (!searchTerm) {
        this.updateAgentsListing();
        return;
      }

      const filteredAgents = this.S.agents.filter(agent => 
        agent.name.toLowerCase().includes(searchTerm)
      );

      agentsListingSection.innerHTML = '';

      if (filteredAgents.length === 0) {
        agentsListingSection.classList.add('no-agents');
        const noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-agents-message';
        noResultsMessage.textContent = `No agents found matching "${searchTerm}"`;
        agentsListingSection.appendChild(noResultsMessage);
        return;
      }

      agentsListingSection.classList.remove('no-agents');

      filteredAgents.forEach(agent => {
        const agentCard = this.createAgentCard(agent);
        agentsListingSection.appendChild(agentCard);
      });
    }

    handleAgentClick(agent) {
      console.log('Agent clicked:', agent.name);
      // TODO: Add agent details or management functionality
    }

    handleDeleteAgent(agent) {
      // Show confirmation dialog
      const confirmed = confirm(`Are you sure you want to delete the agent "${agent.name}"? This action cannot be undone.`);
      
      if (!confirmed) {
        return;
      }

      try {
        const fs = require('fs');
        const path = require('path');
        
        // Check if the agent file exists
        if (!fs.existsSync(agent.filePath)) {
          alert(`Agent file not found: ${agent.filePath}`);
          return;
        }
        
        // Delete the agent file
        fs.unlinkSync(agent.filePath);
        
        console.log(`Agent "${agent.name}" deleted successfully from: ${agent.filePath}`);
        
        // Show success message
        alert(`Agent "${agent.name}" has been deleted successfully.`);
        
        // Refresh the agents list
        this.loadAgents();
        
      } catch (error) {
        console.error('Error deleting agent:', error);
        alert(`Error deleting agent: ${error.message}`);
      }
    }

    handleAddAgent() {
      console.log('Add Agent button clicked');
      
      // Replace the agents content with a white blank page
      const agentsView = document.querySelector('.agents-view');
      if (agentsView) {
        agentsView.innerHTML = `
          <div class="add-agent-page">
            <!-- Left Section with all form fields -->
            <div class="left-section">
              <div class="add-agent-container">
                <!-- Agent Name & Color Section (no header) -->
                <div class="agent-section">
                  <div class="input-group">
                    <input type="text" id="agentNameInput" class="agent-input" placeholder="Enter agent name...">
                    <input type="color" id="agentColorInput" class="color-input" value="#007bff">
                  </div>
                </div>

                <!-- Input Section -->
                <div class="section-separator"></div>
                <div class="agent-section">
                  <div class="section-header">
                    <h3 class="section-title">Input</h3>
                    <button class="orange-plus-button" id="inputPlusButton">+</button>
                  </div>
                  <div id="inputPreviewContainer">
                    <div class="no-content-message">No input added...</div>
                  </div>
                </div>

                <!-- Output Section -->
                <div class="section-separator"></div>
                <div class="agent-section">
                  <div class="section-header">
                    <h3 class="section-title">Output</h3>
                    <button class="orange-plus-button" id="outputPlusButton">+</button>
                  </div>
                  <div id="outputPreviewContainer">
                    <div class="no-content-message">No output added...</div>
                  </div>
                </div>

                <!-- Role Section -->
                <div class="section-separator"></div>
                <div class="agent-section">
                  <h3 class="section-title">Role of Agent</h3>
                  <div class="input-group">
                    <textarea id="agentRole" class="agent-textarea role-textarea" placeholder="Describe the role and responsibilities of this agent..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Section with RAG, Tools, Utilities, APIs, and Scraping -->
            <div class="right-section">
              <div class="right-section-content">
                <!-- Documents Section -->
                <div class="right-section-item">
                  <div class="section-header">
                    <div class="styled-heading">
                      <span class="heading-text">Documents</span>
                      <svg class="heading-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" fill="none"/>
                        <path d="M14 2V8H20" stroke="currentColor" stroke-width="2"/>
                        <path d="M16 13H8" stroke="currentColor" stroke-width="2"/>
                        <path d="M16 17H8" stroke="currentColor" stroke-width="2"/>
                        <path d="M10 9H8" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="documents-controls">
                      <div class="file-count-circle" id="fileCountCircle">
                        <span class="file-count-number" id="fileCountNumber">0</span>
                      </div>
                      <button class="reset-files-btn" id="resetFilesBtn" title="Clear all files">
                        <svg class="reset-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 4V10H7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M3.51 15A9 9 0 1 0 6 5L1 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div id="ragPreviewContainer" class="preview-container click-browse-zone">
                    <div class="click-browse-content">
                      <svg class="upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M7 10L12 15L17 10" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 15V3" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <div class="click-browse-text">Click to browse files. Or drag and drop.</div>
                      <input type="file" id="ragFileInput" multiple accept=".pdf,.doc,.docx,.txt" class="file-input-hidden">
                    </div>
                  </div>
                </div>

                <!-- Utilities and Scraping Section (side by side) -->
                <div class="utilities-scraping-row">
                  <!-- Utilities Section -->
                  <div class="right-section-item">
                    <div class="section-header">
                      <div class="styled-heading">
                        <span class="heading-text">Utilities</span>
                        <svg class="heading-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                      </div>
                      <button class="manage-button" id="utilitiesPlusButton">Manage</button>
                    </div>
                    <div id="utilitiesPreviewContainer" class="preview-container">
                      <div class="no-content-message">No utilities selected...</div>
                    </div>
                  </div>

                  <!-- Scraping Section -->
                  <div class="right-section-item">
                    <div class="section-header">
                      <div class="styled-heading">
                        <span class="heading-text">Scraping</span>
                        <svg class="heading-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" stroke-width="2" fill="none"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                      </div>
                      <button class="orange-plus-button" id="scrapingPlusButton">+</button>
                    </div>
                    <div id="scrapingPreviewContainer" class="preview-container">
                      <div class="no-content-message">No scraping items added...</div>
                    </div>
                  </div>
                </div>

                <!-- APIs Section -->
                <div class="right-section-item">
                  <div class="section-header">
                    <div class="styled-heading">
                      <span class="heading-text">APIs</span>
                      <svg class="heading-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" stroke="currentColor" stroke-width="2" fill="none"/>
                      </svg>
                    </div>
                      <button class="orange-plus-button" id="apisPlusButton">+</button>
                    </div>
                  <div id="apisPreviewContainer" class="preview-container">
                    <div class="no-content-message">No APIs added...</div>
                  </div>
                </div>

                <!-- Tools Section -->
                <div class="right-section-item tools-section-extended">
                  <div class="section-header">
                                      <div class="styled-heading">
                      <span class="heading-text">Tools</span>
                      <svg class="heading-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="2" fill="none"/>
                      </svg>
                    </div>
                      <button class="manage-button" id="toolsPlusButton">Manage</button>
                    </div>
                  <div id="toolsPreviewContainer" class="preview-container">
                    <div class="no-content-message">No tools added...</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer with buttons -->
            <div class="add-agent-footer">
              <div class="footer-separator"></div>
              <div class="footer-buttons">
                <button class="cancel-button" id="cancelAddAgent">Cancel</button>
                <button class="add-button-green" id="confirmAddAgent">Add</button>
              </div>
            </div>
          </div>

          <!-- Input Variables Modal -->
          <div class="modal-overlay" id="inputModal" style="display: none;">
            <div class="modal">
              <div class="modal-header">
                <h2>Add Input Variables</h2>
                <button class="modal-close-btn" id="inputModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="form-group">
                  <label>Input Type:</label>
                  <div class="radio-group">
                    <label class="radio-label">
                      <input type="radio" name="inputType" value="single" checked>
                      <span>Not Array</span>
                    </label>
                    <label class="radio-label">
                      <input type="radio" name="inputType" value="array">
                      <span>Array</span>
                    </label>
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Input Variables:</label>
                  <button class="add-var-btn" id="addInputVarBtn">+ Add Variable</button>
                  <div id="inputVariablesContainer">
                    <!-- Variables will be added here dynamically -->
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="inputModalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="inputModalSaveBtn">Save</button>
              </div>
            </div>
          </div>

          <!-- Output Variables Modal -->
          <div class="modal-overlay" id="outputModal" style="display: none;">
            <div class="modal">
              <div class="modal-header">
                <h2>Add Output Variables</h2>
                <button class="modal-close-btn" id="outputModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="form-group">
                  <label>Output Variables:</label>
                  <button class="add-var-btn" id="addOutputVarBtn">+ Add Variable</button>
                  <div id="outputVariablesContainer">
                    <!-- Variables will be added here dynamically -->
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="outputModalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="outputModalSaveBtn">Save</button>
              </div>
            </div>
          </div>

          <!-- RAG Documents Modal -->
          <div class="modal-overlay" id="ragModal" style="display: none;">
            <div class="modal">
              <div class="modal-header">
                <h2>Add RAG Documents</h2>
                <button class="modal-close-btn" id="ragModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="form-group">
                  <label>Document Files:</label>
                  <input type="file" id="ragFileInput" multiple accept=".pdf,.doc,.docx,.txt" class="agent-input">
                  <p class="help-text">Select PDF, Word, or text files to add to RAG</p>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="ragModalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="ragModalSaveBtn">Save</button>
              </div>
            </div>
          </div>

          <!-- Tools Modal -->
          <div class="modal-overlay" id="toolsModal" style="display: none;">
            <div class="modal functions-modal">
              <div class="modal-header">
                <h2>Select Tool Function</h2>
                <button class="modal-close-btn" id="toolsModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="folder-navigation">
                  <div class="current-path">
                    <span>Folder Path: </span>
                    <span class="path-value" id="toolsCurrentPath">/</span>
                  </div>
                  <div class="folder-buttons">
                    <button class="btn btn-secondary" id="toolsGoUpBtn">
                      <span style="font-size: 18px; margin-right: 5px; vertical-align: middle;">↑</span>
                      Go Up
                    </button>
                    <button class="btn btn-secondary" id="toolsRefreshBtn">
                      <img src="public/reset.png" alt="Reset" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;">
                      Refresh
                    </button>
                  </div>
                </div>
                <div class="file-list" id="toolsFileList">
                  <!-- Files and folders will be populated here -->
                </div>
                <div class="function-selection" id="toolsFunctionSelection" style="display: none;">
                  <h3>Select Function from <span id="toolsSelectedFile"></span></h3>
                  <div class="functions-checkboxes" id="toolsFunctionsCheckboxes">
                    <!-- Function checkboxes will be populated here -->
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="toolsModalCancelBtn">Cancel</button>
              </div>
            </div>
          </div>

          <!-- Tool Configuration Modal -->
          <div class="modal-overlay" id="toolConfigModal" style="display: none;">
            <div class="modal">
              <div class="modal-header">
                <h2>Configure Tool</h2>
                <button class="modal-close-btn" id="toolConfigModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="form-group">
                  <label>Function Name:</label>
                  <input type="text" id="toolFunctionNameDisplay" class="agent-input" readonly>
                </div>
                <div class="form-group">
                  <label>Description:</label>
                  <textarea id="toolDescriptionInput" class="agent-textarea" placeholder="Describe what this tool does..."></textarea>
                </div>
                <!-- Input Fields Section -->
                <div class="tool-section-container">
                  <div class="tool-section-header">
                    <h4>Input Fields</h4>
                    <button class="add-var-btn" id="addToolInputVarBtn">+ Add Input</button>
                  </div>
                  <div class="tool-section-content">
                    <div id="toolInputVariablesContainer">
                      <!-- Input variables will be added here -->
                    </div>
                  </div>
                </div>

                <!-- Output Type Section -->
                <div class="tool-section-container">
                  <div class="tool-section-header">
                    <h4>Output Configuration</h4>
                  </div>
                  <div class="tool-section-content">
                    <div class="form-group">
                      <label>Output Type:</label>
                      <div class="radio-group">
                        <label class="radio-label">
                          <input type="radio" name="toolOutputType" value="single" checked>
                          <span>Single Result</span>
                        </label>
                        <label class="radio-label">
                          <input type="radio" name="toolOutputType" value="array">
                          <span>Array of Results</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Output Fields Section -->
                <div class="tool-section-container">
                  <div class="tool-section-header">
                    <h4>Output Fields</h4>
                    <button class="add-var-btn" id="addToolOutputVarBtn">+ Add Output</button>
                  </div>
                  <div class="tool-section-content">
                    <div id="toolOutputVariablesContainer">
                      <!-- Output variables will be added here -->
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label>Code Path:</label>
                  <input type="text" id="toolCodePathInput" class="agent-input" readonly>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="toolConfigModalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="toolConfigModalSaveBtn">Save Tool</button>
              </div>
            </div>
          </div>

          <!-- Utilities Modal -->
          <div class="modal-overlay" id="utilitiesModal" style="display: none;">
            <div class="modal">
              <div class="modal-header">
                <h2>Select Utilities</h2>
                <button class="modal-close-btn" id="utilitiesModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="form-group">
                  <label>Available Utilities:</label>
                  <div id="utilitiesGrid" class="utilities-selection-grid">
                    <!-- Utilities will be populated here -->
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="utilitiesModalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="utilitiesModalSaveBtn">Save</button>
              </div>
            </div>
          </div>

          <!-- APIs Modal -->
          <div class="modal-overlay" id="apisModal" style="display: none;">
            <div class="modal">
              <div class="modal-header">
                <h2>Add API</h2>
                <button class="modal-close-btn" id="apisModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="form-group">
                  <label>API Name:</label>
                  <input type="text" id="apiNameInput" placeholder="e.g., WeatherAPI, OpenAI API" class="agent-input">
                </div>
                <div class="form-group">
                  <label>API Endpoint:</label>
                  <input type="url" id="apiUrlInput" placeholder="https://api.example.com/endpoint" class="agent-input">
                </div>
                <div class="form-group">
                  <label>Method:</label>
                  <select id="apiMethodSelect" class="agent-input">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Authentication:</label>
                  <div class="radio-group">
                    <label class="radio-label">
                      <input type="radio" name="authType" value="none" checked>
                      <span>No Auth</span>
                    </label>
                    <label class="radio-label">
                      <input type="radio" name="authType" value="api_key">
                      <span>API Key</span>
                    </label>
                  </div>
                </div>
                <div class="form-group auth-details" id="authDetails" style="display: none;">
                  <label>API Key Details:</label>
                  <div class="auth-row">
                    <select id="authLocation" class="agent-input">
                      <option value="header">Header</option>
                      <option value="query">Query Parameter</option>
                    </select>
                    <input type="text" id="authField" placeholder="e.g., Authorization, X-API-Key" class="agent-input">
                  </div>
                  <input type="text" id="apiKeyInput" placeholder="Enter your API key" class="agent-input">
                </div>
                <div class="form-group">
                  <label>Description:</label>
                  <textarea id="apiDescriptionInput" placeholder="Describe what this API does..." class="agent-textarea"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="apisModalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="apisModalSaveBtn">Save</button>
              </div>
            </div>
          </div>

          <!-- Scraping Modal -->
          <div class="modal-overlay" id="scrapingModal" style="display: none;">
            <div class="modal">
              <div class="modal-header">
                <h2>Add Scraping Item</h2>
                <button class="modal-close-btn" id="scrapingModalCloseBtn">×</button>
              </div>
              <div class="modal-content">
                <div class="scraping-top-row">
                  <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="scrapingNameInput" placeholder="Enter scraping name" class="agent-input">
                  </div>
                  <div class="form-group">
                    <label>URL to Scrape:</label>
                    <input type="url" id="scrapingUrlInput" placeholder="https://example.com" class="agent-input">
                  </div>
                </div>
                <div class="form-group">
                  <label>Description:</label>
                  <textarea id="scrapingDescriptionInput" placeholder="Describe what this scraping does..." class="agent-textarea"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" id="scrapingModalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="scrapingModalSaveBtn">Save</button>
              </div>
            </div>
          </div>
        `;
        
        // Set up event listeners for the new buttons
        this.setupAddAgentEventListeners();
      }
    }

    setupAddAgentEventListeners() {
      // Cancel button - return to agents list
      const cancelButton = document.getElementById('cancelAddAgent');
      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          this.showAgentsList();
        });
      }

      // Add button - handle agent creation
      const confirmButton = document.getElementById('confirmAddAgent');
      if (confirmButton) {
        confirmButton.addEventListener('click', () => {
          this.handleCreateAgent();
        });
      }

      // Input plus button click - open input modal
      const inputPlusButton = document.getElementById('inputPlusButton');
      if (inputPlusButton) {
        inputPlusButton.addEventListener('click', () => {
          this.openInputModal();
        });
      }

      // Output plus button click - open output modal
      const outputPlusButton = document.getElementById('outputPlusButton');
      if (outputPlusButton) {
        outputPlusButton.addEventListener('click', () => {
          this.openOutputModal();
        });
      }

      // Documents click to browse and drag & drop functionality
      const documentsDropZone = document.getElementById('ragPreviewContainer');
      const ragFileInput = document.getElementById('ragFileInput');
      
      console.log('Documents drop zone found:', documentsDropZone);
      console.log('RAG file input found:', ragFileInput);
      
      if (documentsDropZone && ragFileInput) {
        // Click to browse
        documentsDropZone.addEventListener('click', () => {
          ragFileInput.click();
        });

        // Drag and drop events
        documentsDropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          documentsDropZone.classList.add('drag-over');
        });

        documentsDropZone.addEventListener('dragleave', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Only remove drag-over if we're leaving the container entirely
          if (!documentsDropZone.contains(e.relatedTarget)) {
            documentsDropZone.classList.remove('drag-over');
          }
        });

        documentsDropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          documentsDropZone.classList.remove('drag-over');
          const files = e.dataTransfer.files;
          console.log('Drop event triggered with event:', e);
          console.log('Files in drop event:', files);
          console.log('Files length in drop:', files.length);
          
          if (files.length > 0) {
            console.log('Setting files to file input and processing');
            ragFileInput.files = files;
            this.handleDocumentsSelected(files);
          } else {
            console.log('Drop event fired but no files in dataTransfer');
          }
        });

        // File input change
        ragFileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) {
            console.log('File input change event triggered with files:', e.target.files);
            console.log('this context in change event:', this);
            this.handleDocumentsSelected(e.target.files);
          }
        });
      }

      // Tools plus button click - open tools modal
      const toolsPlusButton = document.getElementById('toolsPlusButton');
      if (toolsPlusButton) {
        toolsPlusButton.addEventListener('click', () => {
          this.openToolsModal();
        });
      }

      // Utilities plus button click - open utilities modal
      const utilitiesPlusButton = document.getElementById('utilitiesPlusButton');
      if (utilitiesPlusButton) {
        utilitiesPlusButton.addEventListener('click', () => {
          this.openUtilitiesModal();
        });
      }

      // APIs plus button click - open APIs modal
      const apisPlusButton = document.getElementById('apisPlusButton');
      if (apisPlusButton) {
        apisPlusButton.addEventListener('click', () => {
          this.openApisModal();
        });
      }

      // Scraping plus button click - open scraping modal
      const scrapingPlusButton = document.getElementById('scrapingPlusButton');
      if (scrapingPlusButton) {
        scrapingPlusButton.addEventListener('click', () => {
          this.openScrapingModal();
        });
      }

      // Input modal event listeners
      this.setupInputModalEventListeners();
      // Output modal event listeners
      this.setupOutputModalEventListeners();
      // Documents functionality is now handled inline
      // Tools modal event listeners
      this.setupToolsModalEventListeners();
      // Tool configuration modal event listeners
      this.setupToolConfigModalEventListeners();
      // Utilities modal event listeners
      this.setupUtilitiesModalEventListeners();
      // APIs modal event listeners
      this.setupApisModalEventListeners();
      // Scraping modal event listeners
      this.setupScrapingModalEventListeners();
      
      // Initialize previews with existing data
      this.updateScrapingPreview(this.scrapingItems);
      this.updateInputPreview('single', this.inputVariables);
      this.updateOutputPreview(this.outputVariables);
      this.updateApisPreview(this.apis);
      this.updateToolsPreview(this.tools);
      
      console.log('Initialized previews:', {
        inputVariables: this.inputVariables,
        outputVariables: this.outputVariables,
        apis: this.apis,
        tools: this.tools
      });
      
      // Initialize file count
      this.updateFileCount();
      
      // Documents reset button event listener
      const resetFilesBtn = document.getElementById('resetFilesBtn');
      if (resetFilesBtn) {
        resetFilesBtn.addEventListener('click', () => this.resetDocuments());
      }
    }

    handleOpenAnalytics() {
      console.log('Open Analytics button clicked');

      // Get current project path from state
      const S = this.S; // Access the shared state
      const currentProjectPath = S.currentProjectPath;

      if (!currentProjectPath) {
        console.warn('No project selected. Cannot open analytics.');
        // Could show a modal or notification here
        return;
      }

      // Send IPC message to main process to open analytics window
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('open-analytics', { projectPath: currentProjectPath });
    }

    async handleCreateAgent() {
      const agentName = document.getElementById('agentNameInput').value.trim();
      const agentColor = document.getElementById('agentColorInput').value;
      const agentRole = document.getElementById('agentRole').value.trim();

      if (!agentName) {
        alert('Please enter an agent name');
        return;
      }

      try {
        // Check if we have documents to process
        if (this.documents && this.documents.length > 0) {
          // Validate documents before processing
          this.validateDocumentsForProcessing();
          
          // Show loading message
          const loadingMessage = `Creating Databricks vector database for agent "${agentName}"...\nThis may take a few minutes.\n\nProcessing ${this.documents.length} document(s)...`;
          alert(loadingMessage);
          
          // Create Databricks vector database index first
          await this.createDatabricksVectorIndex(agentName);
          
          // Show success message
          alert(`Databricks vector database created successfully for agent "${agentName}"!\n\nDocuments processed and embeddings created.`);
        }

        // Create the agent configuration object
        const agentConfig = this.createAgentConfig(agentName, agentColor, agentRole);
        
        // Save the agent configuration to file
        await this.saveAgentToFile(agentConfig, agentName);
        
        // Show success message
        alert(`Agent "${agentName}" created successfully!`);
        
        // Return to agents list
        this.showAgentsList();
        
      } catch (error) {
        console.error('Error creating agent:', error);
        alert(`Error creating agent: ${error.message}`);
      }
    }

    validateDocumentsForProcessing() {
      if (!this.documents || this.documents.length === 0) {
        return;
      }
      
      // Check file sizes and types
      const maxFileSize = 10 * 1024 * 1024; // 10MB limit
      const supportedTypes = ['.txt', '.md', '.csv', '.json'];
      
      for (let i = 0; i < this.documents.length; i++) {
        const document = this.documents[i];
        
        // Check file size
        if (document.size > maxFileSize) {
          throw new Error(`Document "${document.name}" is too large (${(document.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`);
        }
        
        // Check file type
        const fileExtension = document.name.toLowerCase().substring(document.name.lastIndexOf('.'));
        if (!supportedTypes.includes(fileExtension)) {
          console.warn(`Document "${document.name}" has unsupported file type "${fileExtension}". Only text-based files are recommended for best results.`);
        }
        
        // Check if file name is valid
        if (document.name.length > 100) {
          throw new Error(`Document name "${document.name}" is too long. Maximum length is 100 characters.`);
        }
      }
      
      console.log('Document validation completed successfully');
    }

    async createDatabricksVectorIndex(agentName) {
      let createdIndexName = null;
      
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Get current project folder path
        const folderDisplay = document.querySelector('.current-folder-display');
        if (!folderDisplay || folderDisplay.classList.contains('no-project')) {
          throw new Error('No project is currently open');
        }
        
        const projectPath = folderDisplay.textContent.startsWith('~/') 
          ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
          : folderDisplay.textContent;
        
        // Read credentials from .langsketch-credentials.json
        const credentialsPath = path.join(projectPath, '.langsketch-credentials.json');
        if (!fs.existsSync(credentialsPath)) {
          throw new Error('No credentials file found. Please configure Databricks credentials in app settings first.');
        }
        
        const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = JSON.parse(credentialsData);
        
        if (!credentials.databricksCredentials || credentials.databricksCredentials.length === 0) {
          throw new Error('No Databricks credentials found. Please configure Databricks credentials in app settings first.');
        }
        
        // Use the first available Databricks credential
        const databricksCredential = credentials.databricksCredentials[0];
        const workspaceUrl = databricksCredential.workspaceUrl;
        const personalToken = databricksCredential.personalToken;
        
        if (!workspaceUrl || !personalToken) {
          throw new Error('Invalid Databricks credentials. Please check your configuration.');
        }
        
        // Validate workspace URL format
        try {
          new URL(workspaceUrl);
        } catch (urlError) {
          throw new Error('Invalid Databricks workspace URL format. Please check your configuration.');
        }
        
        console.log('Creating Databricks vector index for agent:', agentName);
        console.log('Workspace URL:', workspaceUrl);
        
        // Test connection to Databricks workspace
        await this.testDatabricksConnection(workspaceUrl, personalToken);
        
        // Check if user has necessary permissions for vector search
        await this.checkVectorSearchPermissions(workspaceUrl, personalToken);
        
        // Check if the required embedding model is available
        await this.checkEmbeddingModelAvailability(workspaceUrl, personalToken);
        
        // Create the vector index using Databricks REST API
        createdIndexName = await this.createDatabricksIndex(workspaceUrl, personalToken, agentName);
        
        // Wait for the index to be ready
        await this.waitForIndexReady(workspaceUrl, personalToken, createdIndexName);
        
        // Process and upload documents to the index
        await this.uploadDocumentsToIndex(workspaceUrl, personalToken, agentName);
        
        console.log('Databricks vector index created and documents uploaded successfully');
        
      } catch (error) {
        console.error('Error creating Databricks vector index:', error);
        
        // Clean up resources if something went wrong
        if (createdIndexName) {
          try {
            await this.cleanupFailedIndex(workspaceUrl, personalToken, createdIndexName);
          } catch (cleanupError) {
            console.error('Failed to cleanup failed index:', cleanupError);
          }
        }
        
        throw new Error(`Failed to create Databricks vector index: ${error.message}`);
      }
    }

    async testDatabricksConnection(workspaceUrl, personalToken) {
      try {
        // Clean workspace URL (remove trailing slash if present)
        const cleanWorkspaceUrl = workspaceUrl.endsWith('/') ? workspaceUrl.slice(0, -1) : workspaceUrl;
        
        // Test connection using Databricks workspace info endpoint
        const testEndpoint = `${cleanWorkspaceUrl}/api/2.0/workspace/list`;
        
        const response = await fetch(testEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please check your Databricks personal access token.');
          } else if (response.status === 403) {
            throw new Error('Access denied. Please check your Databricks permissions.');
          } else {
            const errorText = await response.text();
            throw new Error(`Connection test failed: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }
        
        console.log('Databricks connection test successful');
        
      } catch (error) {
        console.error('Error testing Databricks connection:', error);
        throw new Error(`Connection test failed: ${error.message}`);
      }
    }

    async checkVectorSearchPermissions(workspaceUrl, personalToken) {
      try {
        // Clean workspace URL (remove trailing slash if present)
        const cleanWorkspaceUrl = workspaceUrl.endsWith('/') ? workspaceUrl.slice(0, -1) : workspaceUrl;
        
        // Check if user has access to vector search APIs
        const permissionsEndpoint = `${cleanWorkspaceUrl}/api/2.0/vector-search/indexes`;
        
        const response = await fetch(permissionsEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed when checking vector search permissions.');
          } else if (response.status === 403) {
            throw new Error('Access denied to vector search APIs. You may not have the necessary permissions to create vector indexes.');
          } else if (response.status === 404) {
            throw new Error('Vector search APIs not available in this workspace. Please ensure your Databricks workspace supports vector search.');
          } else {
            const errorText = await response.text();
            throw new Error(`Permission check failed: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }
        
        console.log('Vector search permissions check successful');
        
      } catch (error) {
        console.error('Error checking vector search permissions:', error);
        throw new Error(`Permission check failed: ${error.message}`);
      }
    }

    async checkEmbeddingModelAvailability(workspaceUrl, personalToken) {
      try {
        // Clean workspace URL (remove trailing slash if present)
        const cleanWorkspaceUrl = workspaceUrl.endsWith('/') ? workspaceUrl.slice(0, -1) : workspaceUrl;
        
        // Check if the databricks-bge-small embedding model is available
        const modelEndpoint = `${cleanWorkspaceUrl}/api/2.0/serving-endpoints`;
        
        const response = await fetch(modelEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed when checking embedding model availability.');
          } else if (response.status === 403) {
            throw new Error('Access denied to serving endpoints. You may not have the necessary permissions.');
          } else {
            const errorText = await response.text();
            throw new Error(`Model availability check failed: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }
        
        const result = await response.json();
        const endpoints = result.endpoints || [];
        
        // Check if databricks-bge-small endpoint exists
        const bgeEndpoint = endpoints.find(endpoint => endpoint.name === 'databricks-bge-small');
        
        if (!bgeEndpoint) {
          throw new Error('The required embedding model "databricks-bge-small" is not available in your workspace. Please contact your Databricks administrator to deploy this model.');
        }
        
        if (bgeEndpoint.state !== 'ACTIVE') {
          throw new Error(`The embedding model "databricks-bge-small" is not active (current state: ${bgeEndpoint.state}). Please wait for it to become active or contact your administrator.`);
        }
        
        console.log('Embedding model availability check successful');
        
      } catch (error) {
        console.error('Error checking embedding model availability:', error);
        throw new Error(`Model availability check failed: ${error.message}`);
      }
    }

    async createDatabricksIndex(workspaceUrl, personalToken, agentName) {
      try {
        // Clean workspace URL (remove trailing slash if present)
        const cleanWorkspaceUrl = workspaceUrl.endsWith('/') ? workspaceUrl.slice(0, -1) : workspaceUrl;
        
        // Create the index using Databricks Vector Search API
        const indexName = `${agentName}_vectordb`;
        const indexEndpoint = `${cleanWorkspaceUrl}/api/2.0/vector-search/indexes`;
        
        const indexPayload = {
          name: indexName,
          endpoint_name: `${agentName}_endpoint`,
          primary_key: "id",
          index_type: "DELTA_SYNC_INDEX",
          pipeline_type: "TRIGGERED",
          source_table_name: `${agentName}_documents`,
          source_schema_name: "default"
        };
        
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for index creation
        
        const response = await fetch(indexEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(indexPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed when creating index. Please check your Databricks token.');
          } else if (response.status === 403) {
            throw new Error('Access denied. You may not have permission to create vector search indexes in this workspace.');
          } else if (response.status === 409) {
            throw new Error(`Index "${indexName}" already exists. Please use a different agent name or delete the existing index.`);
          } else if (response.status === 400) {
            const errorText = await response.text();
            throw new Error(`Invalid request when creating index: ${errorText}`);
          } else {
            const errorText = await response.text();
            throw new Error(`Failed to create Databricks index: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }
        
        const result = await response.json();
        console.log('Databricks index created:', result);
        
        // Wait a moment for the index to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return indexName;
        
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Index creation timed out. Please try again.');
        }
        console.error('Error creating Databricks index:', error);
        throw new Error(`Failed to create Databricks index: ${error.message}`);
      }
    }

    async uploadDocumentsToIndex(workspaceUrl, personalToken, agentName) {
      try {
        if (!this.documents || this.documents.length === 0) {
          console.log('No documents to upload');
          return;
        }
        
        console.log(`Uploading ${this.documents.length} documents to Databricks index`);
        
        // Clean workspace URL
        const cleanWorkspaceUrl = workspaceUrl.endsWith('/') ? workspaceUrl.slice(0, -1) : workspaceUrl;
        
        let totalChunks = 0;
        let successfulChunks = 0;
        let failedChunks = 0;
        
        // For each document, we need to:
        // 1. Read the file content
        // 2. Chunk it according to the chunk_size (500 characters)
        // 3. Create embeddings using Databricks embedding model
        // 4. Upload to the vector index
        
        for (let i = 0; i < this.documents.length; i++) {
          const document = this.documents[i];
          console.log(`Processing document ${i + 1}/${this.documents.length}: ${document.name}`);
          
          try {
            // Read file content
            const fileContent = await this.readFileContent(document);
            
            // Chunk the content
            const chunks = this.chunkText(fileContent, 500);
            console.log(`Created ${chunks.length} chunks for document: ${document.name}`);
            
            totalChunks += chunks.length;
            
            // Process each chunk
            for (let j = 0; j < chunks.length; j++) {
              const chunk = chunks[j];
              const chunkId = `${agentName}_${document.name}_${i}_${j}`;
              
              try {
                // Create embedding using Databricks embedding model
                const embedding = await this.createEmbedding(cleanWorkspaceUrl, personalToken, chunk);
                
                // Upload chunk to vector index
                await this.uploadChunkToIndex(cleanWorkspaceUrl, personalToken, agentName, chunkId, chunk, embedding, document.name);
                
                successfulChunks++;
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
                
              } catch (chunkError) {
                console.error(`Failed to process chunk ${j} of document ${document.name}:`, chunkError);
                failedChunks++;
                
                // Continue with other chunks instead of failing completely
                continue;
              }
            }
            
          } catch (documentError) {
            console.error(`Failed to process document ${document.name}:`, documentError);
            // Continue with other documents instead of failing completely
            continue;
          }
        }
        
        console.log(`Document processing completed. Total chunks: ${totalChunks}, Successful: ${successfulChunks}, Failed: ${failedChunks}`);
        
        if (failedChunks > 0) {
          console.warn(`${failedChunks} chunks failed to process. The agent will still be created with the successful chunks.`);
        }
        
        if (successfulChunks === 0) {
          throw new Error('No document chunks were successfully processed. Please check your documents and try again.');
        }
        
      } catch (error) {
        console.error('Error uploading documents to index:', error);
        throw new Error(`Failed to upload documents: ${error.message}`);
      }
    }

    async readFileContent(file) {
      return new Promise((resolve, reject) => {
        // Check file type and handle accordingly
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          // Text files - read as text
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error(`Failed to read text file: ${file.name}`));
          reader.readAsText(file);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          // PDF files - for now, reject with helpful message
          reject(new Error(`PDF files are not yet supported. Please convert ${file.name} to text format first.`));
        } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
          // Word documents - for now, reject with helpful message
          reject(new Error(`Word documents are not yet supported. Please convert ${file.name} to text format first.`));
        } else {
          // Try to read as text anyway
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsText(file);
        }
      });
    }

    chunkText(text, chunkSize) {
      const chunks = [];
      let start = 0;
      
      // Handle empty or very short text
      if (!text || text.length === 0) {
        return [];
      }
      
      // If text is shorter than chunk size, return it as a single chunk
      if (text.length <= chunkSize) {
        return [text.trim()];
      }
      
      while (start < text.length) {
        let end = start + chunkSize;
        
        // Try to break at a word boundary
        if (end < text.length) {
          const lastSpace = text.lastIndexOf(' ', end);
          if (lastSpace > start + chunkSize * 0.8) { // Only break at space if we're not too far back
            end = lastSpace;
          }
        }
        
        const chunk = text.substring(start, end).trim();
        if (chunk.length > 0) {
          chunks.push(chunk);
        }
        
        start = end;
      }
      
      // Ensure we don't have empty chunks
      return chunks.filter(chunk => chunk.length > 0);
    }

    async createEmbedding(workspaceUrl, personalToken, text, retryCount = 0) {
      const maxRetries = 3;
      
      try {
        // Use Databricks embedding model endpoint
        const embeddingEndpoint = `${workspaceUrl}/api/2.0/serving-endpoints/databricks-bge-small/invocations`;
        
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(embeddingEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dataframe_records: [{
              input: text
            }]
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed when creating embedding. Please check your Databricks token.');
          } else if (response.status === 404) {
            throw new Error('Embedding model endpoint not found. Please ensure the databricks-bge-small model is deployed in your workspace.');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          } else {
            const errorText = await response.text();
            throw new Error(`Failed to create embedding: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }
        
        const result = await response.json();
        
        // Extract the embedding vector from the response
        if (result.predictions && result.predictions.length > 0) {
          const embedding = result.predictions[0];
          
          // Validate that we got a proper embedding vector
          if (Array.isArray(embedding) && embedding.length > 0) {
            return embedding;
          } else {
            throw new Error('Invalid embedding response format - expected array of numbers');
          }
        } else {
          throw new Error('Invalid embedding response format - no predictions found');
        }
        
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Embedding creation timed out. Please try again.');
        }
        
        // Retry logic for transient errors
        if (retryCount < maxRetries && this.isRetryableError(error)) {
          console.log(`Retrying embedding creation (attempt ${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return this.createEmbedding(workspaceUrl, personalToken, text, retryCount + 1);
        }
        
        console.error('Error creating embedding:', error);
        throw new Error(`Failed to create embedding: ${error.message}`);
      }
    }

    isRetryableError(error) {
      // Retry on network errors, timeouts, and rate limits
      const retryableMessages = [
        'timeout',
        'rate limit',
        'network error',
        'connection refused',
        'temporary failure'
      ];
      
      return retryableMessages.some(message => 
        error.message.toLowerCase().includes(message)
      );
    }

    async cleanupFailedIndex(workspaceUrl, personalToken, indexName) {
      try {
        console.log(`Cleaning up failed index: ${indexName}`);
        
        // Clean workspace URL (remove trailing slash if present)
        const cleanWorkspaceUrl = workspaceUrl.endsWith('/') ? workspaceUrl.slice(0, -1) : workspaceUrl;
        
        // Delete the failed index
        const deleteEndpoint = `${cleanWorkspaceUrl}/api/2.0/vector-search/indexes/${indexName}`;
        
        const response = await fetch(deleteEndpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`Successfully cleaned up failed index: ${indexName}`);
        } else {
          console.warn(`Failed to cleanup index ${indexName}: ${response.status} ${response.statusText}`);
        }
        
      } catch (error) {
        console.error('Error during index cleanup:', error);
        // Don't throw error during cleanup - this is just a best effort
      }
    }

    async waitForIndexReady(workspaceUrl, personalToken, indexName) {
      try {
        console.log(`Waiting for index ${indexName} to be ready...`);
        
        // Clean workspace URL (remove trailing slash if present)
        const cleanWorkspaceUrl = workspaceUrl.endsWith('/') ? workspaceUrl.slice(0, -1) : workspaceUrl;
        
        const maxWaitTime = 300000; // 5 minutes
        const checkInterval = 5000; // 5 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
          const statusEndpoint = `${cleanWorkspaceUrl}/api/2.0/vector-search/indexes/${indexName}`;
          
          const response = await fetch(statusEndpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${personalToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            const status = result.status;
            
            if (status === 'ACTIVE') {
              console.log(`Index ${indexName} is now ready`);
              return;
            } else if (status === 'FAILED') {
              throw new Error(`Index ${indexName} creation failed with status: ${status}`);
            } else {
              console.log(`Index ${indexName} status: ${status}, waiting...`);
            }
          }
          
          // Wait before checking again
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        throw new Error(`Index ${indexName} did not become ready within the expected time`);
        
      } catch (error) {
        console.error('Error waiting for index to be ready:', error);
        throw new Error(`Failed to wait for index readiness: ${error.message}`);
      }
    }

    async uploadChunkToIndex(workspaceUrl, personalToken, agentName, chunkId, text, embedding, sourceDocument) {
      try {
        const indexName = `${agentName}_vectordb`;
        const uploadEndpoint = `${workspaceUrl}/api/2.0/vector-search/indexes/${indexName}/upsert`;
        
        const payload = {
          vectors: [{
            id: chunkId,
            values: embedding,
            metadata: {
              text: text,
              source_document: sourceDocument,
              agent_name: agentName,
              chunk_size: text.length,
              timestamp: new Date().toISOString()
            }
          }]
        };
        
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for chunk upload
        
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${personalToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed when uploading chunk. Please check your Databricks token.');
          } else if (response.status === 404) {
            throw new Error('Vector index not found. The index may not be ready yet.');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded when uploading chunk. Please wait a moment and try again.');
          } else if (response.status === 400) {
            const errorText = await response.text();
            throw new Error(`Invalid request when uploading chunk: ${errorText}`);
          } else {
            const errorText = await response.text();
            throw new Error(`Failed to upload chunk: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }
        
        console.log(`Chunk ${chunkId} uploaded successfully`);
        
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Chunk upload timed out. Please try again.');
        }
        console.error('Error uploading chunk to index:', error);
        throw new Error(`Failed to upload chunk: ${error.message}`);
      }
    }

    createAgentConfig(agentName, agentColor, agentRole) {
      // Build the agent configuration according to the JSON schema
      const config = {
        agent: {
          name: agentName,
          description: agentRole || `Agent for ${agentName}`,
          color: agentColor,
          input: {
            is_array: this.inputVariables.length > 1,
            fields: this.inputVariables.map(variable => ({
              name: variable.name,
              type: variable.type,
              description: variable.description
            }))
          },
          output: {
            fields: this.outputVariables.map(variable => ({
              name: variable.name,
              type: variable.type,
              description: variable.description
            }))
          }
        },

        rag: {
          provider: "databricks",
          index_name: this.documents && this.documents.length > 0 ? `${agentName}_vectordb` : `${agentName}_vectordb`,
          description: this.documents && this.documents.length > 0 
            ? `Vector database for ${agentName} agent containing uploaded documents and embeddings`
            : `Vector database for ${agentName} agent (no documents uploaded yet)`,
          embedding_model: "databricks-bge-small",
          chunk_size: 500,
          top_k: 5
        },

        tools: this.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputs: {
            fields: tool.inputs.fields.map(field => ({
              name: field.name,
              type: field.type,
              description: field.description
            }))
          },
          output: {
            is_array: tool.output.is_array,
            fields: tool.output.fields.map(field => ({
              name: field.name,
              type: field.type,
              description: field.description
            }))
          },
          code_path: tool.code_path,
          function_name: tool.function_name
        })),

        utilities: this.selectedUtilities.map(utility => 
          utility.filename.replace('.png', '').replace(/-/g, '_')
        ),

        apis: this.apis.map(api => ({
          name: api.name,
          url: api.url,
          method: api.method,
          headers: api.headers || {},
          queries: api.queries || {},
          auth: {
            type: api.auth.type,
            in: api.auth.in,
            field: api.auth.field,
            api_key: api.auth.api_key
          },
          description: api.description
        })),

        scraping: this.scrapingItems.map(item => ({
          name: item.name,
          url: item.url,
          description: item.description
        }))
      };

      return config;
    }

    async saveAgentToFile(agentConfig, agentName) {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Get current project folder path
        const folderDisplay = document.querySelector('.current-folder-display');
        if (!folderDisplay || folderDisplay.classList.contains('no-project')) {
          throw new Error('No project is currently open');
        }
        
        const projectPath = folderDisplay.textContent.startsWith('~/') 
          ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
          : folderDisplay.textContent;
        
        // Create agents folder if it doesn't exist
        const agentsFolderPath = path.join(projectPath, 'agents');
        if (!fs.existsSync(agentsFolderPath)) {
          fs.mkdirSync(agentsFolderPath, { recursive: true });
        }
        
        // Create the agent file path
        const agentFilePath = path.join(agentsFolderPath, `${agentName}.json`);
        
        // Check if agent already exists
        if (fs.existsSync(agentFilePath)) {
          const overwrite = confirm(`Agent "${agentName}" already exists. Do you want to overwrite it?`);
          if (!overwrite) {
            return;
          }
        }
        
        // Write the agent configuration to file
        fs.writeFileSync(agentFilePath, JSON.stringify(agentConfig, null, 2), 'utf8');
        
        console.log(`Agent saved to: ${agentFilePath}`);
        
      } catch (error) {
        console.error('Error saving agent file:', error);
        throw new Error(`Failed to save agent file: ${error.message}`);
      }
    }

    showAgentsList() {
      // Re-render the agents listing page
      this.render();
      this.setupEventListeners();
      this.loadAgents();
    }

    openInputModal() {
      console.log('openInputModal called');
      const modal = document.getElementById('inputModal');
      if (modal) {
        console.log('Input modal found, opening...');
        // Clear any existing variables
        const container = document.getElementById('inputVariablesContainer');
        if (container) {
          container.innerHTML = '';
        }
        
        // Reset radio button to "Not Array"
        const singleRadio = document.querySelector('input[name="inputType"][value="single"]');
        if (singleRadio) {
          singleRadio.checked = true;
        }
        
        // Show the add variable button for both options
        const addVarBtn = document.getElementById('addInputVarBtn');
        if (addVarBtn) {
          addVarBtn.style.display = 'inline-block';
        }
        
        modal.style.display = 'flex';
      } else {
        console.error('Input modal not found!');
      }
    }

    setupInputModalEventListeners() {
      // Close modal
      const closeBtn = document.getElementById('inputModalCloseBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closeInputModal();
        });
      }

      // Cancel button
      const cancelBtn = document.getElementById('inputModalCancelBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.closeInputModal();
        });
      }

      // Save button
      const saveBtn = document.getElementById('inputModalSaveBtn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          this.saveInputVariables();
        });
      }

      // Add variable button
      const addVarBtn = document.getElementById('addInputVarBtn');
      if (addVarBtn) {
        addVarBtn.addEventListener('click', () => {
          this.addInputVariable();
        });
      }

      // Input type radio buttons
      const radioButtons = document.querySelectorAll('input[name="inputType"]');
      radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.handleInputTypeChange(e.target.value);
        });
      });
    }

    setupOutputModalEventListeners() {
      // Close modal
      const closeBtn = document.getElementById('outputModalCloseBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closeOutputModal();
        });
      }

      // Cancel button
      const cancelBtn = document.getElementById('outputModalCancelBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.closeOutputModal();
        });
      }

      // Save button
      const saveBtn = document.getElementById('outputModalSaveBtn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          this.saveOutputVariables();
        });
      }

      // Add variable button
      const addVarBtn = document.getElementById('addOutputVarBtn');
      if (addVarBtn) {
        addVarBtn.addEventListener('click', () => {
          this.addOutputVariable();
        });
      }
    }

    closeInputModal() {
      const modal = document.getElementById('inputModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    openOutputModal() {
      console.log('openOutputModal called');
      const modal = document.getElementById('outputModal');
      if (modal) {
        console.log('Output modal found, opening...');
        // Clear any existing variables
        const container = document.getElementById('outputVariablesContainer');
        if (container) {
          container.innerHTML = '';
        }
        
        modal.style.display = 'flex';
      } else {
        console.error('Output modal not found!');
      }
    }

    closeOutputModal() {
      const modal = document.getElementById('outputModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    handleInputTypeChange(inputType) {
      const addVarBtn = document.getElementById('addInputVarBtn');
      const container = document.getElementById('inputVariablesContainer');
      
      if (inputType === 'single') {
        // Single input - show add button but limit to 1 variable
        addVarBtn.style.display = 'inline-block';
        
        // Remove extra variable rows, keep only first if exists
        const rows = container.querySelectorAll('.input-variable-row');
        for (let i = 1; i < rows.length; i++) {
          rows[i].remove();
        }
      } else {
        // Array input - show add button for multiple variables
        addVarBtn.style.display = 'inline-block';
        
        // Don't auto-add first variable - let user decide
        // Container will show "None added..." when empty
      }
    }

    addInputVariable() {
      const container = document.getElementById('inputVariablesContainer');
      const inputType = document.querySelector('input[name="inputType"]:checked').value;
      
      // Check if we're in single mode and already have a variable
      if (inputType === 'single' && container.children.length >= 1) {
        alert('Single input mode only allows 1 variable maximum');
        return;
      }
      
      const newRow = document.createElement('div');
      newRow.className = 'input-variable-row';
      newRow.innerHTML = `
        <input type="text" class="var-name" placeholder="Variable name" />
        <div class="custom-select">
          <div class="select-selected" data-value="float">float</div>
          <div class="select-items select-hide">
            <div class="select-option" data-value="float">float</div>
            <div class="select-option" data-value="int">int</div>
            <div class="select-option" data-value="string">string</div>
            <div class="select-option" data-value="bool">bool</div>
          </div>
        </div>
        <input type="text" class="var-description" placeholder="Description" />
      `;

      // Setup custom dropdown functionality
      this.setupCustomDropdown(newRow);

      container.appendChild(newRow);
      
      console.log('Added variable row. Total rows:', container.children.length);
    }

    saveInputVariables() {
      const inputType = document.querySelector('input[name="inputType"]:checked').value;
      const variableRows = document.querySelectorAll('.input-variable-row');
      const variables = [];

      console.log('Found variable rows:', variableRows.length);

      variableRows.forEach((row, index) => {
        const nameInput = row.querySelector('.var-name');
        const typeElement = row.querySelector('.select-selected');
        const descriptionInput = row.querySelector('.var-description');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const type = typeElement ? typeElement.getAttribute('data-value') : 'string';
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        
        console.log(`Row ${index + 1}:`, { name, type, description, hasName: !!name, hasDescription: !!description });

        if (name) {
          variables.push({ name, type, description });
        } else {
          console.log(`Row ${index + 1} validation failed:`, { name: !!name });
        }
      });

      console.log('Input variables found:', variables.length);
      console.log('Variable rows found:', variableRows.length);

      if (variables.length === 0) {
        alert('Please add at least one input variable with a name');
        return;
      }

      console.log('Input variables:', { inputType, variables });
      
      // Store the input variables
      this.inputVariables = variables;
      
      console.log('Saved input variables:', this.inputVariables);
      
      // Update the UI to show the saved input variables
      this.updateInputPreview(inputType, variables);
      this.closeInputModal();
    }

    setupCustomDropdown(row) {
      const selectSelected = row.querySelector('.select-selected');
      const selectItems = row.querySelector('.select-items');
      const selectOptions = row.querySelectorAll('.select-option');

      console.log('Setting up dropdown for row:', { selectSelected, selectItems, selectOptions: selectOptions.length });

      // Toggle dropdown
      selectSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        
        if (selectItems.classList.contains('select-hide')) {
          // Show dropdown - calculate position and optimal width
          const rect = selectSelected.getBoundingClientRect();
          selectItems.style.top = (rect.bottom + 5) + 'px';
          selectItems.style.left = rect.left + 'px';
          
          // Calculate optimal width based on content
          const options = selectItems.querySelectorAll('.select-option');
          let maxWidth = rect.width; // Start with button width
          options.forEach(option => {
            const optionWidth = option.scrollWidth;
            if (optionWidth > maxWidth) {
              maxWidth = optionWidth;
            }
          });
          
          // Add some padding and ensure minimum width
          let optimalWidth = Math.max(maxWidth + 20, rect.width);
          
          // Ensure dropdown doesn't extend beyond viewport
          const viewportWidth = window.innerWidth;
          const maxAllowedWidth = viewportWidth - 40; // 20px padding on each side
          if (optimalWidth > maxAllowedWidth) {
            optimalWidth = maxAllowedWidth;
          }
          
          selectItems.style.width = optimalWidth + 'px';
          selectItems.classList.remove('select-hide');
          selectSelected.classList.add('select-arrow-active');
        } else {
          // Hide dropdown
          selectItems.classList.add('select-hide');
          selectSelected.classList.remove('select-arrow-active');
        }
      });

      // Handle option selection
      selectOptions.forEach(option => {
        option.addEventListener('click', function(e) {
          e.stopPropagation();
          const value = this.getAttribute('data-value');
          selectSelected.textContent = this.textContent;
          selectSelected.setAttribute('data-value', value);
          selectItems.classList.add('select-hide');
          selectSelected.classList.remove('select-arrow-active');
          console.log('Selected option:', value);
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function() {
        selectItems.classList.add('select-hide');
        selectSelected.classList.remove('select-arrow-active');
      });
    }

    updateInputPreview(inputType, variables) {
      console.log('updateInputPreview called with:', { inputType, variables });
      
      const previewContainer = document.getElementById('inputPreviewContainer');
      if (!previewContainer) {
        console.error('inputPreviewContainer not found!');
        return;
      }
      
      if (variables.length === 0) {
        previewContainer.innerHTML = '<div class="no-content-message">No input added...</div>';
        return;
      }

      let previewHTML = '';
      
      variables.forEach(variable => {
        const typeColor = this.getTypeColor(variable.type);
        console.log('Variable:', variable, 'Type color:', typeColor);
        previewHTML += `
          <div class="preview-item">
            <span class="preview-name">${variable.name}</span>
            <span class="input-type" style="color: ${typeColor}">${variable.type}</span>
          </div>
        `;
      });
      
      previewContainer.innerHTML = previewHTML;
      console.log('Updated input preview HTML:', previewHTML);
    }

    addOutputVariable() {
      const container = document.getElementById('outputVariablesContainer');
      
      const newRow = document.createElement('div');
      newRow.className = 'output-variable-row';
      newRow.innerHTML = `
        <input type="text" class="var-name" placeholder="Variable name" />
        <div class="custom-select">
          <div class="select-selected" data-value="float">float</div>
          <div class="select-items select-hide">
            <div class="select-option" data-value="float">float</div>
            <div class="select-option" data-value="int">int</div>
            <div class="select-option" data-value="string">string</div>
            <div class="select-option" data-value="bool">bool</div>
          </div>
        </div>
        <input type="text" class="var-description" placeholder="Description" />
      `;

      // Setup custom dropdown functionality
      this.setupCustomDropdown(newRow);

      container.appendChild(newRow);
      
      console.log('Added output variable row. Total rows:', container.children.length);
    }

    saveOutputVariables() {
      const variableRows = document.querySelectorAll('.output-variable-row');
      const variables = [];

      console.log('Found output variable rows:', variableRows.length);

      variableRows.forEach((row, index) => {
        const nameInput = row.querySelector('.var-name');
        const typeElement = row.querySelector('.select-selected');
        const descriptionInput = row.querySelector('.var-description');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const type = typeElement ? typeElement.getAttribute('data-value') : 'string';
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        
        console.log(`Output Row ${index + 1}:`, { name, type, description, hasName: !!name, hasDescription: !!description });

        if (name) {
          variables.push({ name, type, description });
        } else {
          console.log(`Output Row ${index + 1} validation failed:`, { name: !!name });
        }
      });

      console.log('Output variables found:', variables.length);

      if (variables.length === 0) {
        alert('Please add at least one output variable with a name');
        return;
      }

      console.log('Output variables:', variables);
      
      // Store the output variables
      this.outputVariables = variables;
      
      console.log('Saved output variables:', this.outputVariables);
      
      // Update the UI to show the saved output variables
      this.updateOutputPreview(variables);
      this.closeOutputModal();
    }

    updateOutputPreview(variables) {
      console.log('updateOutputPreview called with:', { variables });
      
      const previewContainer = document.getElementById('outputPreviewContainer');
      if (!previewContainer) {
        console.error('outputPreviewContainer not found!');
        return;
      }
      
      if (variables.length === 0) {
        previewContainer.innerHTML = '<div class="no-content-message">No output added...</div>';
        return;
      }

      let previewHTML = '';
      
      variables.forEach(variable => {
        const typeColor = this.getTypeColor(variable.type);
        console.log('Variable:', variable, 'Type color:', typeColor);
        previewHTML += `
          <div class="preview-item">
            <span class="preview-name">${variable.name}</span>
            <span class="output-type" style="color: ${typeColor}">${variable.type}</span>
          </div>
        `;
      });
      
      previewContainer.innerHTML = previewHTML;
      console.log('Updated output preview HTML:', previewHTML);
    }

    getTypeColor(type) {
      const colors = {
        'float': '#ff8c00',
        'int': '#007bff',
        'string': '#28a745',
        'bool': '#dc3545'
      };
      return colors[type] || '#666';
    }

    // Documents Methods
    handleDocumentsSelected(files) {
      console.log('handleDocumentsSelected called with files:', files);
      console.log('this context:', this);
      console.log('this.documents before:', this.documents);
      
      // Check if we already have the same files to prevent duplicate processing
      const newFiles = Array.from(files);
      const newFileNames = newFiles.map(file => file.name).sort().join(',');
      const existingFileNames = this.documents.map(file => file.name).sort().join(',');
      
      if (newFileNames === existingFileNames && this.documents.length > 0) {
        console.log('Same files already processed, skipping duplicate');
        return;
      }
      
      // Store the files in the documents array
      this.documents = newFiles;
      const fileNames = this.documents.map(file => file.name);
      
      console.log('Documents array updated:', this.documents);
      console.log('File names:', fileNames);
      console.log('this.documents after:', this.documents);
      
      // Update the preview first
      this.updateDocumentsPreview(fileNames);
      
      // Update the file count
      this.updateFileCount();
      
      // Update the click browse zone appearance
      const clickZone = document.getElementById('ragPreviewContainer');
      if (clickZone) {
        clickZone.classList.add('has-files');
      }
      
      console.log('handleDocumentsSelected completed, documents array now:', this.documents);
    }

    updateDocumentsPreview(fileNames) {
      console.log('updateDocumentsPreview called with fileNames:', fileNames);
      console.log('Current documents array before updateDocumentsPreview:', this.documents);
      
      const container = document.getElementById('ragPreviewContainer');
      
      if (fileNames.length === 0) {
        console.log('No files, resetting to empty state');
        container.innerHTML = `
          <div class="click-browse-content">
            <svg class="upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15V3" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="click-browse-text">Click to browse files. Or drag and drop.</div>
            <input type="file" id="ragFileInput" multiple accept=".pdf,.doc,.docx,.txt" class="file-input-hidden">
          </div>
        `;
        
        // Re-setup event listeners after updating HTML
        this.setupFileInputEventListeners();
        return;
      }

      console.log('Updating preview with files, keeping original interface');
      
      // Don't update the HTML if we already have files - just keep the existing interface
      // This prevents the file input from being reset and losing its files
      console.log('Skipping HTML update to preserve file input state');
      
      // Don't re-setup event listeners when we have files - this prevents duplicate event binding
      console.log('Skipping event listener setup to prevent duplicates');
      
      console.log('updateDocumentsPreview completed, documents array still:', this.documents);
    }

    handleClearDocuments() {
      console.log('handleClearDocuments called - clearing documents array');
      this.documents = [];
      this.updateDocumentsPreview([]);
      this.updateFileCount();
      const clickZone = document.getElementById('ragPreviewContainer');
      if (clickZone) {
        clickZone.classList.remove('has-files');
      }
    }

    // RAG Modal Methods (kept for compatibility)
    openRagModal() {
      const modal = document.getElementById('ragModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }

    setupRagModalEventListeners() {
      const closeBtn = document.getElementById('ragModalCloseBtn');
      const cancelBtn = document.getElementById('ragModalCancelBtn');
      const saveBtn = document.getElementById('ragModalSaveBtn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeRagModal());
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeRagModal());
      }
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveRagDocuments());
      }
    }

    closeRagModal() {
      const modal = document.getElementById('ragModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    saveRagDocuments() {
      const fileInput = document.getElementById('ragFileInput');
      const files = fileInput.files;
      
      if (files.length === 0) {
        alert('Please select at least one document file');
        return;
      }

      const fileNames = Array.from(files).map(file => file.name);
      this.updateRagPreview(fileNames);
      this.closeRagModal();
    }

    updateRagPreview(fileNames) {
      const container = document.getElementById('ragPreviewContainer');
      
      if (fileNames.length === 0) {
        container.innerHTML = '<div class="no-content-message">No documents added...</div>';
        return;
      }

      let previewHTML = '';
      fileNames.forEach(fileName => {
        previewHTML += `
          <div class="preview-item">
            <span class="preview-name">${fileName}</span>
            <span class="file-type">Document</span>
          </div>
        `;
      });
      
      container.innerHTML = previewHTML;
    }

    // Tools Modal Methods
    openToolsModal() {
      const modal = document.getElementById('toolsModal');
      if (modal) {
        this.loadAvailableTools();
        modal.style.display = 'flex';
      }
    }

    setupToolsModalEventListeners() {
      const closeBtn = document.getElementById('toolsModalCloseBtn');
      const cancelBtn = document.getElementById('toolsModalCancelBtn');
      const goUpBtn = document.getElementById('toolsGoUpBtn');
      const refreshBtn = document.getElementById('toolsRefreshBtn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeToolsModal());
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeToolsModal());
      }
      if (goUpBtn) {
        goUpBtn.addEventListener('click', () => this.toolsGoUp());
      }
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.toolsResetPath());
      }
    }

    closeToolsModal() {
      const modal = document.getElementById('toolsModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    loadAvailableTools() {
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
        
        this.loadToolsCurrentDirectory(projectPath);
        
      } catch (error) {
        console.error('Error loading tools:', error);
        alert('Error loading tools: ' + error.message);
      }
    }

    loadToolsCurrentDirectory(projectPath) {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const fullPath = path.join(projectPath, this.toolsCurrentPath);
        
        if (!fs.existsSync(fullPath)) {
          this.toolsCurrentPath = '/';
          this.loadToolsCurrentDirectory(projectPath);
          return;
        }
        
        // Clear function selection when loading new directory
        this.clearToolsFunctionSelection();
        
        const items = fs.readdirSync(fullPath);
        const fileList = document.getElementById('toolsFileList');
        const currentPathDisplay = document.getElementById('toolsCurrentPath');
        
        if (currentPathDisplay) {
          currentPathDisplay.textContent = this.toolsCurrentPath;
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
                  this.toolsCurrentPath = path.join(this.toolsCurrentPath, item);
                  this.loadToolsCurrentDirectory(projectPath);
                });
              } else if (item.endsWith('.py')) {
                fileItem.innerHTML = `<div class="file-icon"><img src="public/python.png" alt="Python" style="width: 20px; height: 20px;"></div><div class="file-name">${item}</div>`;
                fileItem.addEventListener('click', () => {
                  console.log('Python file clicked:', item);
                  this.showToolsFunctionSelection(item, itemPath);
                });
              }
              
              fileList.appendChild(fileItem);
            });
          }
        }
      } catch (error) {
        console.error('Error loading tools directory:', error);
        alert('Error loading directory: ' + error.message);
      }
    }

    toolsGoUp() {
      try {
        console.log('toolsGoUp called, current path:', this.toolsCurrentPath);
        
        if (this.toolsCurrentPath === '/') {
          console.log('Already at root, cannot go up');
          return; // Already at root
        }
        
        const path = require('path');
        const pathParts = this.toolsCurrentPath.split('/').filter(part => part);
        pathParts.pop(); // Remove last part
        this.toolsCurrentPath = '/' + pathParts.join('/');
        
        console.log('New path:', this.toolsCurrentPath);
        
        // Clear function selection
        this.clearToolsFunctionSelection();
        
        // Reload current directory
        const folderDisplay = document.querySelector('.current-folder-display');
        if (folderDisplay && !folderDisplay.classList.contains('no-project')) {
          const projectPath = folderDisplay.textContent.startsWith('~/') 
            ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
            : folderDisplay.textContent;
          this.loadToolsCurrentDirectory(projectPath);
        }
      } catch (error) {
        console.error('Error in toolsGoUp:', error);
      }
    }

    toolsResetPath() {
      try {
        console.log('toolsResetPath called, resetting to root');
        this.toolsCurrentPath = '/';
        
        // Clear function selection
        this.clearToolsFunctionSelection();
        
        // Reload current directory
        const folderDisplay = document.querySelector('.current-folder-display');
        if (folderDisplay && !folderDisplay.classList.contains('no-project')) {
          const projectPath = folderDisplay.textContent.startsWith('~/') 
            ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
            : folderDisplay.textContent;
          this.loadToolsCurrentDirectory(projectPath);
        }
      } catch (error) {
        console.error('Error in toolsResetPath:', error);
      }
    }

    clearToolsFunctionSelection() {
      try {
        console.log('Clearing tools function selection');
        
        // Hide the function selection area
        const functionSelection = document.getElementById('toolsFunctionSelection');
        if (functionSelection) {
          functionSelection.style.display = 'none';
        }
        
        // Clear the selected file name
        const selectedFile = document.getElementById('toolsSelectedFile');
        if (selectedFile) {
          selectedFile.textContent = '';
        }
        
        // Clear the function checkboxes
        const functionsCheckboxes = document.getElementById('toolsFunctionsCheckboxes');
        if (functionsCheckboxes) {
          functionsCheckboxes.innerHTML = '';
        }
        
        console.log('Function selection cleared');
      } catch (error) {
        console.error('Error clearing function selection:', error);
      }
    }

    showToolsFunctionSelection(fileName, filePath) {
      try {
        console.log('showToolsFunctionSelection called with:', fileName, filePath);
        
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
        const functions = [];
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
          functions.push(match[1]);
        }
        
        console.log('Found functions:', functions);
        
        if (functions.length === 0) {
          alert('No functions found in this Python file');
          return;
        }
        
        const functionSelection = document.getElementById('toolsFunctionSelection');
        const selectedFile = document.getElementById('toolsSelectedFile');
        const functionsCheckboxes = document.getElementById('toolsFunctionsCheckboxes');
        
        console.log('DOM elements found:', { functionSelection, selectedFile, functionsCheckboxes });
        
        if (selectedFile) {
          selectedFile.textContent = fileName;
        }
        
        if (functionsCheckboxes) {
          functionsCheckboxes.innerHTML = '';
          
          functions.forEach(funcName => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'function-checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'radio';
            checkbox.name = 'toolFunction';
            checkbox.id = `toolFunc_${funcName}`;
            checkbox.value = funcName;
            
            const label = document.createElement('label');
            label.htmlFor = `toolFunc_${funcName}`;
            label.textContent = funcName;
            
            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);
            
            // Add click handler for function selection
            const self = this; // Store reference to 'this'
            checkboxItem.addEventListener('click', () => {
              console.log('Function checkbox item clicked:', funcName);
              
              // Uncheck all other radio buttons
              document.querySelectorAll('input[name="toolFunction"]').forEach(radio => {
                radio.checked = false;
              });
              // Check this one
              checkbox.checked = true;
              
              // Get the selected function and proceed to configuration
              const selectedFunction = funcName;
              const selectedFilePath = filePath;
              console.log('Calling selectToolFunction with:', selectedFunction, selectedFilePath, fileName);
              self.selectToolFunction(selectedFunction, selectedFilePath, fileName);
            });
            
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





    saveTools() {
      // TODO: Implement saving selected tools
      this.closeToolsModal();
    }



    selectToolFunction(functionName, filePath, fileName) {
      try {
        console.log('selectToolFunction called with:', functionName, filePath, fileName);
        
        // Close tools selection modal
        this.closeToolsModal();
        
        // Get project path for relative path calculation
        const folderDisplay = document.querySelector('.current-folder-display');
        if (!folderDisplay || folderDisplay.classList.contains('no-project')) {
          alert('Project not open');
          return;
        }
        
        const path = require('path');
        const projectPath = folderDisplay.textContent.startsWith('~/') 
          ? path.join(process.env.HOME || process.env.USERPROFILE, folderDisplay.textContent.substring(2))
          : folderDisplay.textContent;
        
        const relativePath = path.relative(projectPath, filePath);
        console.log('Project path:', projectPath);
        console.log('File path:', filePath);
        console.log('Relative path:', relativePath);
        
        // Populate tool configuration modal
        const toolFunctionNameDisplay = document.getElementById('toolFunctionNameDisplay');
        const toolCodePathInput = document.getElementById('toolCodePathInput');
        
        if (toolFunctionNameDisplay) toolFunctionNameDisplay.value = functionName;
        if (toolCodePathInput) toolCodePathInput.value = relativePath;
        
        // Clear previous configuration
        const toolDescriptionInput = document.getElementById('toolDescriptionInput');
        const toolInputVariablesContainer = document.getElementById('toolInputVariablesContainer');
        const toolOutputVariablesContainer = document.getElementById('toolOutputVariablesContainer');
        
        if (toolDescriptionInput) toolDescriptionInput.value = '';
        if (toolInputVariablesContainer) toolInputVariablesContainer.innerHTML = '';
        if (toolOutputVariablesContainer) toolOutputVariablesContainer.innerHTML = '';
        
        // Store selected function data
        this.selectedFunctionData = {
          name: functionName,
          filename: fileName,
          path: filePath,
          relativePath: relativePath,
          extension: '.py'
        };
        
        console.log('Selected function data:', this.selectedFunctionData);
        
        // Open tool configuration modal
        this.openToolConfigModal();
        
      } catch (error) {
        console.error('Error in selectToolFunction:', error);
        alert('Error selecting tool function: ' + error.message);
      }
    }

    // Utilities Modal Methods
    openUtilitiesModal() {
      const modal = document.getElementById('utilitiesModal');
      if (modal) {
        this.loadAvailableUtilities();
        modal.style.display = 'flex';
      }
    }

    openToolConfigModal() {
      console.log('openToolConfigModal called');
      const modal = document.getElementById('toolConfigModal');
      if (modal) {
        console.log('Tool config modal found, opening...');
        modal.style.display = 'flex';
        
        // Clear form and add initial "no input/output" messages
        const descriptionInput = document.getElementById('toolDescriptionInput');
        const inputContainer = document.getElementById('toolInputVariablesContainer');
        const outputContainer = document.getElementById('toolOutputVariablesContainer');
        
        if (descriptionInput) descriptionInput.value = '';
        if (inputContainer) {
          inputContainer.innerHTML = '<div class="no-content-message">No input fields added...</div>';
        }
        if (outputContainer) {
          outputContainer.innerHTML = '<div class="no-content-message">No output fields added...</div>';
        }
        
        // Initialize button states based on output type
        const addOutputBtn = document.getElementById('addToolOutputVarBtn');
        if (addOutputBtn) {
          addOutputBtn.disabled = false;
          addOutputBtn.style.opacity = '1';
          addOutputBtn.style.cursor = 'pointer';
        }
        
        console.log('Tool config modal should now be visible');
      } else {
        console.error('Tool config modal not found!');
      }
    }

    setupUtilitiesModalEventListeners() {
      const closeBtn = document.getElementById('utilitiesModalCloseBtn');
      const cancelBtn = document.getElementById('utilitiesModalCancelBtn');
      const saveBtn = document.getElementById('utilitiesModalSaveBtn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeUtilitiesModal());
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeUtilitiesModal());
      }
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveUtilities());
      }
    }

    setupToolConfigModalEventListeners() {
      const closeBtn = document.getElementById('toolConfigModalCloseBtn');
      const cancelBtn = document.getElementById('toolConfigModalCancelBtn');
      const saveBtn = document.getElementById('toolConfigModalSaveBtn');
      const addInputBtn = document.getElementById('addToolInputVarBtn');
      const addOutputBtn = document.getElementById('addToolOutputVarBtn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeToolConfigModal());
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeToolConfigModal());
      }
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveToolConfiguration());
      }
      if (addInputBtn) {
        addInputBtn.addEventListener('click', () => this.addToolInputVariable());
      }
      if (addOutputBtn) {
        addOutputBtn.addEventListener('click', () => this.addToolOutputVariable());
      }

      // Add event listeners for output type radio buttons
      const outputTypeRadios = document.querySelectorAll('input[name="toolOutputType"]');
      outputTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.handleToolOutputTypeChange(e.target.value);
        });
      });
    }

    closeUtilitiesModal() {
      const modal = document.getElementById('utilitiesModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    closeToolConfigModal() {
      const modal = document.getElementById('toolConfigModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    addToolInputVariable() {
      const container = document.getElementById('toolInputVariablesContainer');
      
      // Clear "no input" message if it exists
      if (container.querySelector('.no-content-message')) {
        container.innerHTML = '';
      }
      
      const newRow = document.createElement('div');
      newRow.className = 'input-variable-row';
      newRow.innerHTML = `
        <input type="text" class="var-name" placeholder="Variable name" />
        <div class="custom-select">
          <div class="select-selected" data-value="string">string</div>
          <div class="select-items select-hide">
            <div class="select-option" data-value="float">float</div>
            <div class="select-option" data-value="int">int</div>
            <div class="select-option" data-value="string">string</div>
            <div class="select-option" data-value="bool">bool</div>
          </div>
        </div>
        <input type="text" class="var-description" placeholder="Description" />
      `;

      // Setup custom dropdown functionality
      this.setupCustomDropdown(newRow);

      container.appendChild(newRow);
    }

    addToolOutputVariable() {
      const container = document.getElementById('toolOutputVariablesContainer');
      
      // Check output type to limit fields
      const outputType = document.querySelector('input[name="toolOutputType"]:checked');
      if (outputType && outputType.value === 'single') {
        // If single result, only allow one output field
        const existingRows = container.querySelectorAll('.output-variable-row');
        if (existingRows.length >= 1) {
          alert('Single result mode only allows 1 output field maximum');
          return;
        }
      }
      
      // Clear "no output" message if it exists
      if (container.querySelector('.no-content-message')) {
        container.innerHTML = '';
      }
      
      const newRow = document.createElement('div');
      newRow.className = 'output-variable-row';
      newRow.innerHTML = `
        <input type="text" class="var-name" placeholder="Variable name" />
        <div class="custom-select">
          <div class="select-selected" data-value="string">string</div>
          <div class="select-items select-hide">
            <div class="select-option" data-value="float">float</div>
            <div class="select-option" data-value="int">int</div>
            <div class="select-option" data-value="string">string</div>
            <div class="select-option" data-value="bool">bool</div>
          </div>
        </div>
        <input type="text" class="var-description" placeholder="Description" />
      `;

      // Setup custom dropdown functionality
      this.setupCustomDropdown(newRow);

      container.appendChild(newRow);

      // Check if we need to disable the add button (for single result mode)
      if (outputType && outputType.value === 'single') {
        const addOutputBtn = document.getElementById('addToolOutputVarBtn');
        addOutputBtn.disabled = true;
        addOutputBtn.style.opacity = '0.5';
        addOutputBtn.style.cursor = 'not-allowed';
      }
    }

    handleToolOutputTypeChange(outputType) {
      const container = document.getElementById('toolOutputVariablesContainer');
      const addOutputBtn = document.getElementById('addToolOutputVarBtn');
      
      if (outputType === 'single') {
        // If switching to single result, remove extra output fields beyond the first one
        const existingRows = container.querySelectorAll('.output-variable-row');
        if (existingRows.length > 1) {
          // Keep only the first row, remove the rest
          for (let i = 1; i < existingRows.length; i++) {
            existingRows[i].remove();
          }
          alert('Switched to single result mode. Extra output fields have been removed. Only 1 output field is allowed.');
        }
        
        // Disable the add button if we already have one field
        if (existingRows.length >= 1) {
          addOutputBtn.disabled = true;
          addOutputBtn.style.opacity = '0.5';
          addOutputBtn.style.cursor = 'not-allowed';
        }
      } else {
        // If switching to array mode, re-enable the add button
        addOutputBtn.disabled = false;
        addOutputBtn.style.opacity = '1';
        addOutputBtn.style.cursor = 'pointer';
      }
    }

    saveToolConfiguration() {
      const description = document.getElementById('toolDescriptionInput').value.trim();
      const outputType = document.querySelector('input[name="toolOutputType"]:checked').value;
      const codePath = document.getElementById('toolCodePathInput').value.trim();
      
      if (!description) {
        alert('Please enter a description for the tool');
        return;
      }

      // Collect input variables
      const inputRows = document.querySelectorAll('#toolInputVariablesContainer .input-variable-row');
      const inputs = [];
      inputRows.forEach(row => {
        const nameInput = row.querySelector('.var-name');
        const typeElement = row.querySelector('.select-selected');
        const descriptionInput = row.querySelector('.var-description');
        
        const varName = nameInput ? nameInput.value.trim() : '';
        const varType = typeElement ? typeElement.getAttribute('data-value') : 'string';
        const varDescription = descriptionInput ? descriptionInput.value.trim() : '';
        
        if (varName) {
          inputs.push({ name: varName, type: varType, description: varDescription });
        }
      });

      // Collect output variables
      const outputRows = document.querySelectorAll('#toolOutputVariablesContainer .output-variable-row');
      const outputs = [];
      outputRows.forEach(row => {
        const nameInput = row.querySelector('.var-name');
        const typeElement = row.querySelector('.select-selected');
        const descriptionInput = row.querySelector('.var-description');
        
        const varName = nameInput ? nameInput.value.trim() : '';
        const varType = typeElement ? typeElement.getAttribute('data-value') : 'string';
        const varDescription = descriptionInput ? descriptionInput.value.trim() : '';
        
        if (varName) {
          outputs.push({ name: varName, type: varType, description: varDescription });
        }
      });

      // Create tool object
      const tool = {
        name: this.selectedFunctionData.name,
        description,
        inputs: { fields: inputs },
        output: {
          is_array: outputType === 'array',
          fields: outputs
        },
        code_path: codePath,
        function_name: this.selectedFunctionData.name
      };

      // Add to tools array
      this.tools.push(tool);
      
      // Update preview
      this.updateToolsPreview(this.tools);
      this.closeToolConfigModal();
    }

    updateToolsPreview(tools) {
      const container = document.getElementById('toolsPreviewContainer');
      
      if (tools.length === 0) {
        container.innerHTML = '<div class="no-content-message">No tools added...</div>';
        return;
      }

      let previewHTML = '';
      tools.forEach(tool => {
        // Truncate path to 30 characters with "..." if needed
        const truncatedPath = tool.code_path && tool.code_path.length > 30 
          ? tool.code_path.substring(0, 30) + '...' 
          : tool.code_path || 'No path set';
        
        previewHTML += `
          <div class="tool-preview-item">
            <div class="tool-preview-name">${tool.name}</div>
            <div class="tool-preview-path">${truncatedPath}</div>
          </div>
        `;
      });
      
      container.innerHTML = previewHTML;
    }

    loadAvailableUtilities() {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Get current project folder path (htn-large project)
        const currentProjectPath = __dirname || process.cwd();
        
        const utilitiesFolderPath = path.join(currentProjectPath, 'utilities');
        
        if (!fs.existsSync(utilitiesFolderPath)) {
          const container = document.getElementById('utilitiesGrid');
          container.innerHTML = '<div class="no-content-message">No utilities folder found in current project</div>';
          return;
        }
        
        const utilityFiles = fs.readdirSync(utilitiesFolderPath)
          .filter(file => file.endsWith('.png'))
          .map(file => {
            const utilityName = file.replace('.png', '').replace(/-/g, ' ');
            const imagePath = path.join(utilitiesFolderPath, file);
            return { name: utilityName, image: imagePath, filename: file };
          });
        
        this.renderUtilitiesGrid(utilityFiles);
        
      } catch (error) {
        console.error('Error loading utilities:', error);
        const container = document.getElementById('utilitiesGrid');
        container.innerHTML = '<div class="no-content-message">Error loading utilities</div>';
      }
    }

    renderUtilitiesGrid(utilities) {
      const container = document.getElementById('utilitiesGrid');
      
      if (utilities.length === 0) {
        container.innerHTML = '<div class="no-content-message">No utilities found.</div>';
        return;
      }

      let gridHTML = '';
      utilities.forEach(utility => {
        const isSelected = this.selectedUtilities.some(selected => selected.filename === utility.filename);
        gridHTML += `
          <div class="utility-option ${isSelected ? 'selected' : ''}" data-filename="${utility.filename}">
            <img src="file://${utility.image}" alt="${utility.name}" title="${utility.name}">
            <div class="utility-name">${utility.name}</div>
          </div>
        `;
      });
      
      container.innerHTML = gridHTML;
      
      // Add click handlers for utility selection
      const utilityOptions = container.querySelectorAll('.utility-option');
      utilityOptions.forEach(option => {
        option.addEventListener('click', () => {
          option.classList.toggle('selected');
        });
      });
    }

    saveUtilities() {
      const selectedUtilities = document.querySelectorAll('.utility-option.selected');
      const utilities = Array.from(selectedUtilities).map(option => ({
        name: option.querySelector('.utility-name').textContent,
        filename: option.getAttribute('data-filename')
      }));
      
      this.selectedUtilities = utilities;
      this.updateUtilitiesPreview(utilities);
      this.closeUtilitiesModal();
    }

    updateUtilitiesPreview(utilities) {
      const container = document.getElementById('utilitiesPreviewContainer');
      
      if (utilities.length === 0) {
        container.innerHTML = '<div class="no-content-message">No utilities selected...</div>';
        return;
      }

      let previewHTML = '';
      utilities.forEach(utility => {
        previewHTML += `
          <div class="utility-preview-item">
            <span class="utility-preview-name">${utility.name}</span>
          </div>
        `;
      });
      
      container.innerHTML = previewHTML;
    }

    // APIs Modal Methods
    openApisModal() {
      const modal = document.getElementById('apisModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }

    setupApisModalEventListeners() {
      const closeBtn = document.getElementById('apisModalCloseBtn');
      const cancelBtn = document.getElementById('apisModalCancelBtn');
      const saveBtn = document.getElementById('apisModalSaveBtn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeApisModal());
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeApisModal());
      }
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveApi());
      }

      // Handle auth type radio button changes
      const authTypeRadios = document.querySelectorAll('input[name="authType"]');
      authTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.handleAuthTypeChange(e.target.value);
        });
      });
    }

    closeApisModal() {
      const modal = document.getElementById('apisModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    handleAuthTypeChange(authType) {
      const authDetails = document.getElementById('authDetails');
      if (authDetails) {
        if (authType === 'api_key') {
          authDetails.style.display = 'block';
        } else {
          authDetails.style.display = 'none';
        }
      }
    }

    saveApi() {
      const name = document.getElementById('apiNameInput').value.trim();
      const url = document.getElementById('apiUrlInput').value.trim();
      const method = document.getElementById('apiMethodSelect').value;
      const authType = document.querySelector('input[name="authType"]:checked').value;
      const description = document.getElementById('apiDescriptionInput').value.trim();
      
      if (!name || !url) {
        alert('Please enter both API name and endpoint URL');
        return;
      }

      const api = {
        name,
        url,
        method,
        auth: {
          type: authType,
          in: authType === 'api_key' ? document.getElementById('authLocation').value : null,
          field: authType === 'api_key' ? document.getElementById('authField').value.trim() : null,
          api_key: authType === 'api_key' ? document.getElementById('apiKeyInput').value.trim() : null
        },
        description
      };

      // Add to APIs array
      this.apis.push(api);
      
      // Update preview
      this.updateApisPreview(this.apis);
      this.closeApisModal();
      
      // Clear inputs
      document.getElementById('apiNameInput').value = '';
      document.getElementById('apiUrlInput').value = '';
      document.getElementById('apiDescriptionInput').value = '';
      if (authType === 'api_key') {
        document.getElementById('authField').value = '';
        document.getElementById('apiKeyInput').value = '';
      }
    }

    updateApisPreview(apis) {
      const container = document.getElementById('apisPreviewContainer');
      
      if (apis.length === 0) {
        container.innerHTML = '<div class="no-content-message">No APIs added...</div>';
        return;
      }

      let previewHTML = '';
      apis.forEach(api => {
        const authStatus = api.auth.type === 'none' ? 'No Auth' : 'API Key';
        const authClass = api.auth.type === 'none' ? 'no-auth' : 'api-key';
        
        // Truncate URL to 20 characters with ellipsis
        const truncatedUrl = api.url.length > 20 ? api.url.substring(0, 20) + '...' : api.url;
        
        previewHTML += `
          <div class="api-preview-item">
            <div class="api-preview-name">${api.name}</div>
            <div class="api-preview-url" title="${api.url}">${truncatedUrl}</div>
            <div class="api-preview-auth ${authClass}">${authStatus}</div>
          </div>
        `;
      });
      
      container.innerHTML = previewHTML;
    }

    // Scraping Modal Methods
    openScrapingModal() {
      const modal = document.getElementById('scrapingModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }

    setupScrapingModalEventListeners() {
      const closeBtn = document.getElementById('scrapingModalCloseBtn');
      const cancelBtn = document.getElementById('scrapingModalCancelBtn');
      const saveBtn = document.getElementById('scrapingModalSaveBtn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeScrapingModal());
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeScrapingModal());
      }
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveScrapingUrl());
      }
    }

    closeScrapingModal() {
      const modal = document.getElementById('scrapingModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    saveScrapingUrl() {
      const name = document.getElementById('scrapingNameInput').value.trim();
      const url = document.getElementById('scrapingUrlInput').value.trim();
      const description = document.getElementById('scrapingDescriptionInput').value.trim();
      
      if (!name) {
        alert('Please enter a scraping name');
        return;
      }
      
      if (!url) {
        alert('Please enter a valid URL');
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch (e) {
        alert('Please enter a valid URL');
        return;
      }

      const scrapingItem = { name, url, description };
      this.scrapingItems.push(scrapingItem);
      this.updateScrapingPreview(this.scrapingItems);
      this.closeScrapingModal();
      
      // Clear inputs
      document.getElementById('scrapingNameInput').value = '';
      document.getElementById('scrapingUrlInput').value = '';
      document.getElementById('scrapingDescriptionInput').value = '';
    }

    updateScrapingPreview(scrapingItems) {
      const container = document.getElementById('scrapingPreviewContainer');
      
      if (scrapingItems.length === 0) {
        container.innerHTML = '<div class="no-content-message">No scraping items added...</div>';
        return;
      }

      let previewHTML = '';
      scrapingItems.forEach(item => {
        previewHTML += `
          <div class="scraping-preview-item">
            <span class="scraping-preview-url">${item.url}</span>
          </div>
        `;
      });
      
      container.innerHTML = previewHTML;
    }

    updateFileCount() {
      const countElement = document.getElementById('fileCountNumber');
      console.log('updateFileCount called, documents array length:', this.documents.length);
      console.log('Documents array:', this.documents);
      
      if (countElement) {
        const oldText = countElement.textContent;
        countElement.textContent = this.documents.length;
        console.log('File count updated in UI:', this.documents.length, 'files');
        console.log('Count element text content changed from:', oldText, 'to:', countElement.textContent);
        console.log('Count element found:', countElement);
        console.log('Count element parent:', countElement.parentElement);
        console.log('Count element visible:', countElement.offsetParent !== null);
        console.log('Count element styles:', window.getComputedStyle(countElement));
      } else {
        console.error('File count element not found');
        console.log('Available elements with similar IDs:');
        const allElements = document.querySelectorAll('[id*="file"], [id*="count"], [id*="File"], [id*="Count"]');
        allElements.forEach(el => console.log('Found element:', el.id, el));
      }
    }

    resetDocuments() {
      console.log('resetDocuments called - clearing documents array');
      // Clear the documents array
      this.documents = [];
      
      // Update the file counter to 0
      this.updateFileCount();
      
      // Reset the file input
      const fileInput = document.getElementById('ragFileInput');
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Reset the preview container to show the upload message
      const container = document.getElementById('ragPreviewContainer');
      if (container) {
        container.innerHTML = `
          <div class="click-browse-content">
            <svg class="upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15V3" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="click-browse-text">Click to browse files. Or drag and drop.</div>
            <input type="file" id="ragFileInput" multiple accept=".pdf,.doc,.docx,.txt" class="file-input-hidden">
          </div>
        `;
        
        // Remove the has-files class if it exists
        const clickZone = document.getElementById('ragPreviewContainer');
        if (clickZone) {
          clickZone.classList.remove('has-files');
        }
        
        // Reset the event listener setup flag so we can set up listeners again
        this.fileInputEventListenersSetup = false;
        
        // Re-setup the file input event listeners
        this.setupFileInputEventListeners();
      }
    }

    setupFileInputEventListeners() {
      // Prevent duplicate event listener setup
      if (this.fileInputEventListenersSetup) {
        console.log('File input event listeners already setup, skipping');
        return;
      }
      
      const documentsDropZone = document.getElementById('ragPreviewContainer');
      const ragFileInput = document.getElementById('ragFileInput');
      
      console.log('setupFileInputEventListeners called');
      console.log('documentsDropZone found:', documentsDropZone);
      console.log('ragFileInput found:', ragFileInput);
      
      if (documentsDropZone && ragFileInput) {
        // Click to browse
        documentsDropZone.addEventListener('click', () => {
          console.log('Click to browse triggered');
          console.log('File input element before click:', ragFileInput);
          console.log('File input files before click:', ragFileInput.files);
          console.log('File input value before click:', ragFileInput.value);
          
          ragFileInput.click();
          
          console.log('File input element after click:', ragFileInput);
          console.log('File input files after click:', ragFileInput.files);
          console.log('File input value after click:', ragFileInput.value);
        });

        // File input change
        ragFileInput.addEventListener('change', (e) => {
          console.log('File input change event fired with event:', e);
          console.log('Files in event:', e.target.files);
          console.log('Files length:', e.target.files.length);
          
          if (e.target.files.length > 0) {
            console.log('File input change event triggered with files:', e.target.files);
            this.handleDocumentsSelected(e.target.files);
          } else {
            console.log('File input change event fired but no files selected');
          }
        });
        
        // Mark as setup to prevent duplicates
        this.fileInputEventListenersSetup = true;
        console.log('File input event listeners attached successfully');
      } else {
        console.error('Could not find documentsDropZone or ragFileInput');
      }
    }

    showAgentsList() {
      console.log('showAgentsList called - this will clear documents array');
      console.log('Documents array before clearing:', this.documents);
      
      const agentsView = document.querySelector('.agents-view');
      if (!agentsView) return;

      // Clear form data when returning to agents list
      this.scrapingItems = [];
      this.selectedUtilities = [];
      this.documents = [];
      this.inputVariables = [];
      this.outputVariables = [];

      agentsView.innerHTML = this.render();
      this.setupEventListeners();
      this.loadAgents();
    }

    // Public method to refresh agents (called from main app)
    refresh() {
      this.scanForAgents();
    }

    // Public method to get agents data (called from main app)
    getAgents() {
      return this.S.agents;
    }

    // Cleanup method to remove styles when component is destroyed
    destroy() {
      const styleId = 'agents-tab-styles';
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    }
  }

  // Export to global
  global.AgentsTab = AgentsTab;
})(window);
