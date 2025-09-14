# LangSketch

> A powerful desktop application for graphically orchestrating agentic AI systems with visual workflow design and analytics.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running (Development)](#running-development)
  - [Building / Packaging](#building--packaging)
- [API Endpoints](#api-endpoints)
- [Scripts](#scripts)
- [Configuration](#configuration-1)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)

## Overview

LangSketch is a cross-platform desktop application built with Electron that provides a visual interface for designing, orchestrating, and monitoring AI agent workflows. It combines a drag-and-drop canvas interface with powerful backend AI capabilities, including support for multiple LLM providers, vector search, and comprehensive analytics.

## Features

- **Visual Agent Orchestration**: Drag-and-drop canvas for building AI agent workflows
- **Multi-LLM Support**: Integration with OpenAI GPT, specialized models via Deimos Router
- **Analytics Dashboard**: Real-time monitoring with Chart.js visualizations
- **Databricks Integration**: Vector search and analytics capabilities
- **Cross-Platform**: Supports macOS, Windows, and Linux
- **Document Processing**: PDF processing with vector search indexing
- **Agent Runtime**: Sophisticated agent execution with LangChain/LangGraph
- **Credential Management**: Secure handling of API keys and tokens

## Architecture

### Frontend (Electron Renderer)
- **Main Interface**: HTML/CSS/JavaScript with custom canvas-based workflow designer
- **Entry Point**: `index.html` with modular JavaScript architecture
- **IPC Communication**: Secure renderer-to-main process communication
- **Analytics**: Chart.js integration for data visualization
- **Styling**: Custom CSS with Font Awesome icons and Google Fonts

### Electron Main Process
- **Main Entry**: `main.js` - handles window management, IPC, and Databricks initialization
- **Security**: Context isolation enabled for secure renderer communication
- **Cross-Platform**: Native window controls and platform-specific configurations

### Backend (FastAPI)
- **Framework**: Python FastAPI with uvicorn server
- **Key Routes**:
  - `GET /` - Health check endpoint
  - `POST /copy-agent-runner` - Agent deployment functionality
  - `POST /upload-docs` - Document processing and vector indexing
- **AI Integration**: LangChain/LangGraph for agent orchestration
- **Vector Search**: Databricks Vector Search for document retrieval

### Directory Structure
```
langsketch/
├── main.js                 # Electron main process
├── index.html             # Main application interface
├── package.json           # Node.js dependencies and scripts
├── js/                    # Frontend JavaScript modules
│   ├── canvas_core.js     # Canvas workflow engine
│   ├── agents-tab.js      # Agent management interface
│   ├── analytics-tab.js   # Analytics dashboard
│   └── analytics/         # Analytics utilities
├── backend/               # Python FastAPI backend
│   ├── pyproject.toml     # Python dependencies
│   └── src/               # Backend source code
│       ├── main.py        # FastAPI application
│       └── agent_runner/  # Agent execution framework
├── agents/                # Pre-built agent templates
├── public/                # Static assets and icons
├── css/                   # Stylesheets
└── utilities/             # Utility components
```

## Tech Stack

**Frontend**: JavaScript, HTML, CSS, Electron, Chart.js, Font Awesome
**Backend**: Python, FastAPI, Uvicorn
**AI/ML**: LangChain, LangGraph, OpenAI API, Deimos Router
**Data**: Databricks, Databricks Vector Search, PyPDF2
**Build Tools**: Electron Builder, npm
**Utilities**: dotenv, Pydantic, Requests

## Getting Started

### Prerequisites

- **Node.js**: Version compatible with Electron 37.2.6
- **Python**: 3.13 or higher
- **Package Manager**: npm (package-lock.json present)
- **Databricks Account**: For analytics and vector search functionality

### Installation

```bash
# Clone the repository
git clone git@github.com:rajshah6/langsketch.git
cd langsketch

# Install Node.js dependencies
npm install

# Set up Python backend
cd backend
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install Python dependencies
pip install -r src/requirements.txt
# Or with uv (if available):
# uv sync

cd ..
```

### Configuration

1. **Environment Variables**: Copy `.env` file and configure with your credentials:
   ```bash
   # Databricks Configuration
   DATABRICKS_SERVER_HOSTNAME=your-workspace-url
   DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/your-warehouse-id
   DATABRICKS_ACCESS_TOKEN=your-personal-access-token
   DATABRICKS_CATALOG=main
   DATABRICKS_SCHEMA=default
   AGENT_EXECUTIONS_TABLE=agent_executions
   ```

2. **Databricks Credentials**: Create `backend/src/.langsketch-credentials.json`:
   ```json
   {
     "databricksCredentials": [{
       "workspaceUrl": "your-workspace-url",
       "personalToken": "your-token"
     }]
   }
   ```

### Running (Development)

```bash
# Start the Electron application
npm start

# For backend development (separate terminal):
cd backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uvicorn src.main:app --reload
```

### Building / Packaging

```bash
# Build for current platform
npm run build

# Build for macOS specifically
npm run build:mac
```

The packaged application will be available in the `dist/` directory with platform-specific formats:
- **macOS**: DMG installer
- **Windows**: NSIS installer
- **Linux**: AppImage

## API Endpoints

- `GET /` - Health check and root endpoint
- `POST /copy-agent-runner` - Deploy and manage agent runners
- `POST /upload-docs` - Process and index documents for vector search

## Scripts

- `npm start` - Launch Electron application
- `npm run build` - Build application for current platform
- `npm run build:mac` - Build specifically for macOS
- `npm test` - Run tests (currently returns error - no tests specified)

## Troubleshooting

### Common Issues

1. **Databricks Connection Failures**:
   - Verify workspace URL and access token in `.env`
   - Check network connectivity to Databricks workspace
   - Application will fall back to mock data if connection fails

2. **Python Backend Issues**:
   - Ensure Python 3.13+ is installed
   - Verify virtual environment is activated
   - Check that all dependencies are installed

3. **Electron Launch Issues**:
   - Ensure Node.js version is compatible
   - Try clearing node_modules and running `npm install` again
   - Check for port conflicts if running backend simultaneously

### Platform-Specific Notes

- **macOS**: Application includes dark mode support and native dock icon
- **Windows**: Uses NSIS installer format
- **Linux**: Distributed as AppImage for broad compatibility

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- Built with [Electron](https://electronjs.org/) for cross-platform desktop development
- [FastAPI](https://fastapi.tiangolo.com/) for the Python backend
- [LangChain](https://langchain.com/) and [LangGraph](https://github.com/langchain-ai/langgraph) for AI orchestration
- [Chart.js](https://www.chartjs.org/) for analytics visualization
- [Databricks](https://databricks.com/) for vector search and analytics capabilities