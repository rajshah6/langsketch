const { ipcRenderer } = require("electron");

class DrawingApp {
  constructor() {
    this.canvas = document.getElementById("drawing-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.isDrawing = false;
    this.currentTool = "pen";
    this.currentColor = "#000000";
    this.brushSize = 5;
    this.lastX = 0;
    this.lastY = 0;

    this.initializeCanvas();
    this.setupEventListeners();
    this.setupMenuHandlers();
  }

  initializeCanvas() {
    // Set canvas background to white
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Set default drawing properties
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  setupEventListeners() {
    // Tool selection
    document.querySelectorAll(".tool-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".tool-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentTool = e.target.dataset.tool;
      });
    });

    // Color selection
    document.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        this.currentColor = e.target.dataset.color;
        this.ctx.strokeStyle = this.currentColor;
        document.getElementById("custom-color").value = this.currentColor;
      });
    });

    // Custom color picker
    document.getElementById("custom-color").addEventListener("change", (e) => {
      this.currentColor = e.target.value;
      this.ctx.strokeStyle = this.currentColor;
    });

    // Brush size
    const brushSizeSlider = document.getElementById("brush-size");
    const brushSizeValue = document.getElementById("brush-size-value");

    brushSizeSlider.addEventListener("input", (e) => {
      this.brushSize = parseInt(e.target.value);
      this.ctx.lineWidth = this.brushSize;
      brushSizeValue.textContent = `${this.brushSize}px`;
    });

    // Canvas drawing events
    this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e));
    this.canvas.addEventListener("mousemove", (e) => this.draw(e));
    this.canvas.addEventListener("mouseup", () => this.stopDrawing());
    this.canvas.addEventListener("mouseout", () => this.stopDrawing());

    // Mouse position tracking
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      document.getElementById(
        "mouse-position"
      ).textContent = `x: ${x}, y: ${y}`;
    });

    // Button handlers
    document
      .getElementById("new-sketch")
      .addEventListener("click", () => this.newSketch());
    document
      .getElementById("open-file")
      .addEventListener("click", () => this.openFile());
    document
      .getElementById("save-file")
      .addEventListener("click", () => this.saveFile());
  }

  setupMenuHandlers() {
    // Handle menu events from main process
    ipcRenderer.on("menu-new-file", () => this.newSketch());
    ipcRenderer.on("menu-open-file", () => this.openFile());
  }

  startDrawing(e) {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;

    if (this.currentTool === "pen" || this.currentTool === "brush") {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
    }
  }

  draw(e) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    switch (this.currentTool) {
      case "pen":
      case "brush":
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        this.lastX = currentX;
        this.lastY = currentY;
        break;

      case "eraser":
        this.ctx.globalCompositeOperation = "destination-out";
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = "source-over";
        this.lastX = currentX;
        this.lastY = currentY;
        break;
    }
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.ctx.beginPath();
    }
  }

  newSketch() {
    if (
      confirm(
        "Are you sure you want to start a new sketch? This will clear the current canvas."
      )
    ) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.initializeCanvas();
    }
  }

  openFile() {
    // This would typically open a file dialog
    // For now, we'll just show an alert
    alert("File open functionality would be implemented here");
  }

  saveFile() {
    // Create a download link for the canvas
    const link = document.createElement("a");
    link.download = `sketch-${Date.now()}.png`;
    link.href = this.canvas.toDataURL();
    link.click();
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new DrawingApp();
});

// Handle window resize
window.addEventListener("resize", () => {
  // Update canvas size display
  const canvasSize = document.getElementById("canvas-size");
  canvasSize.textContent = `${window.innerWidth} x ${window.innerHeight}`;
});
