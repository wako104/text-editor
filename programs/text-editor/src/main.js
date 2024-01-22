const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs-extra");
let win;

if (process.env.NODE_ENV === "development") {
  require("electron-reloader")(module);
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.webContents.openDevTools();
  win.loadFile(path.join(__dirname, "index.html"));
}

//open file from explorer
ipcMain.on("openFile", (_event, _arg) => {
  console.log("sendFile");
  let filepath = openFileDialog();
  console.log(filepath);
  win.webContents.send("file", "Hello World!");
});

function openFileDialog() {
  dialog
    .showOpenDialog(win, {
      properties: ["openFile"],
    })
    .then((result) => {
      if (result.canceled) {
        console.log("canceled");
        return;
      }
      if (result.filePaths.length != 1) {
        console.error("choose one file");
        return;
      }

      console.log("file selected");
      return result.filePaths[0];
    })
    .catch((err) => {
      console.error(err);
    });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// close window mac version
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
