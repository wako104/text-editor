const { ipcRenderer, contextBridge } = require("electron");

console.log("preload");
module.exports = IPC = {
  onFileReady: (callback) => ipcRenderer.on("file", callback),
  requestFile: () => ipcRenderer.send("openFile"),
  createFile: () => ipcRenderer.send("createFile"),
};

contextBridge.exposeInMainWorld("ipc", IPC);
