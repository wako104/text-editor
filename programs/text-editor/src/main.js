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

//save file in file explorer
ipcMain.on("createFile", (_event, _arg) => {
  dialog
    .showSaveDialog(win, {
      filters: [{ name: "text files", extensions: ["txt"] }],
    })
    .then(({ filePath }) => {
      console.log("file path: ", filePath);
      fs.writeFile(filePath, "", (error) => {
        if (error) {
          console.log("error");
          return;
        }
        win.webContents.send("file", filePath);
      });
    });
});

//open file from explorer
ipcMain.on("openFile", (_event, _arg) => {
  dialog
    .showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "text files", extensions: ["txt"] }],
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

      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) throw err;
        console.log("readfile: ", data);

        win.webContents.send("file", { filename: path.parse(filePath).base, data: data });
      });
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

ipcMain.on("value", (_event, value) => {
  console.log(value);
});

// close window mac version
// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });
