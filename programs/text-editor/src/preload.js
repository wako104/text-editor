const { ipcRenderer, contextBridge } = require("electron");

console.log("preload");
module.exports = IPC = {
  onFileReady: (callback) => ipcRenderer.on("file", callback),
  openFile: () => ipcRenderer.send("open-file"),
  newFile: () => ipcRenderer.send("new-file"),
  saveFile: (filePath, fileContent) => ipcRenderer.send("save-file", filePath, fileContent),
};

contextBridge.exposeInMainWorld("ipc", IPC);
