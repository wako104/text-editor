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

      const filePath = result.filePaths[0];
      console.log("file selected: ", filePath);

      //send file to renderer
      // fs.open(filePath, "r", (err, data) => {
      //   if (err) {
      //     console.error(err);
      //     return;
      //   }

      //   const buffer = Buffer.alloc(1024);

      //   fs.read(data, buffer, 0);
      // });

      fs.readFile(filePath, (err, data) => {
        if (err) throw err;
        console.log(data);
      });

      win.webContents.send(data);
    })
    .catch((err) => {
      console.error(err);
    });
});

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
