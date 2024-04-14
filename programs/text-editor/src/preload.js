const { ipcRenderer, contextBridge } = require("electron");
const { amdLoader } = require("monaco-editor");

contextBridge.exposeInMainWorld("ipc", {
  send: (channel, data) => {
    let validChannels = ["open-file", "open-folder", "new-file", "save-file", "save-file-as"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, value) => {
    let validChannels = ["file", "folder", "get-save"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => value(...args));
    }
  },
});
