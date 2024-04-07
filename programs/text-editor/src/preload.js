const { ipcRenderer, contextBridge } = require("electron");

module.exports = IPC = {
  onFileReady: (callback) => ipcRenderer.on("file", callback),
  openFile: () => ipcRenderer.send("open-file"),
  onFolderReady: (callback) => ipcRenderer.on("folder", callback),
  openFolder: () => ipcRenderer.send("open-folder"),
  newFile: () => ipcRenderer.send("new-file"),
  saveFile: (filePath, fileContent) => ipcRenderer.send("save-file", filePath, fileContent),
};

contextBridge.exposeInMainWorld("ipc", IPC);
