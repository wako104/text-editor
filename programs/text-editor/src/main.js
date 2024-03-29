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
ipcMain.on("new-file", (_event, _arg) => {
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
        win.webContents.send("file", { filepath: path.parse(filePath) });
      });
    });
});

//open file from explorer
ipcMain.on("open-file", (_event, _arg) => {
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

        let filePathObj = path.parse(filePath);
        filePathObj["fullpath"] = filePathObj.dir + "/" + filePathObj.base;
        win.webContents.send("file", {
          filepath: filePathObj,
          data: data,
        });
      });
    })
    .catch((err) => {
      console.error(err);
    });
});

//save file
ipcMain.on("save-file", (_event, filePath, fileContent) => {
  let path = filePath.fullpath;
  console.log(path);
  if (fs.existsSync(path)) {
    //if file exists, save to file
    fs.writeFile(path, fileContent, (error) => {
      if (error) {
        console.err("couldn't save file");
      }
    });
    win.webContents.send("file", {
      filepath: filePath,
      data: fileContent,
    });
  } else {
    //if file doesn't exist, open dialog to save as new file
    saveAs(fileContent);
  }
});

// save as button
ipcMain.on("save-as-file", (_event, fileContent) => {
  saveAs(fileContent);
});

// save as function
const saveAs = (fileContent) => {
  dialog
    .showSaveDialog(win, {
      filters: [{ name: "text files", extensions: ["txt"] }],
    })
    .then(({ filePath }) => {
      fs.writeFile(filePath, fileContent, (error) => {
        if (error) {
          console.log("error");
          return;
        }
        let filePathObj = path.parse(filePath);
        filePathObj["fullpath"] = filePathObj.dir + "/" + filePathObj.base;
        win.webContents.send("file", {
          filepath: filePathObj,
          data: fileContent,
        });
      });
    });
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// close window mac version
// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });
