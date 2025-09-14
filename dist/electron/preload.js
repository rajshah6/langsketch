"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose the API to the renderer process
const electronAPI = {
    minimize: () => electron_1.ipcRenderer.invoke('minimize-window'),
    maximize: () => electron_1.ipcRenderer.invoke('maximize-window'),
    close: () => electron_1.ipcRenderer.invoke('close-window'),
    getWindowState: () => electron_1.ipcRenderer.invoke('get-window-state'),
    openFolderDialog: () => electron_1.ipcRenderer.invoke('open-folder-dialog'),
    onWindowStateChanged: (_callback) => {
        electron_1.ipcRenderer.on('window-state-changed', (_event, _state) => _callback(_state));
    },
    removeWindowStateListener: () => {
        electron_1.ipcRenderer.removeAllListeners('window-state-changed');
    }
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
