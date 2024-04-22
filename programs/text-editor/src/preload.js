const { ipcRenderer, contextBridge } = require("electron");

contextBridge.exposeInMainWorld("ipc", {
  send: (channel, data) => {
    let validChannels = [
      "open-file",
      "open-folder",
      "new-file",
      "save-file",
      "save-file-as",
      "terminal-data",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, value) => {
    let validChannels = ["file", "folder", "get-save", "open-terminal", "terminal-output"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => value(...args));
    }
  },
});
