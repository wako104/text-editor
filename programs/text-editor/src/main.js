const { app, Menu, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { error } = require("console");
let win;

const isMac = process.platform === "darwin";

if (process.env.NODE_ENV === "development") {
  require("electron-reloader")(module);
}

// create main window
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

//-------------------------------------------------------------------------------------------------
// ipc processes
//-------------------------------------------------------------------------------------------------

// save file in file explorer
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
  openFile();
});

const openFile = () => {
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
          path: filePathObj,
          data: data,
          depth: 0,
        });
      });
    })
    .catch((err) => {
      console.error(err);
    });
};

// open folder from explorer
ipcMain.on("open-folder", (_event, _arg) => {
  openFolder();
});

function openFolder() {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((result) => {
      if (result.canceled) {
        console.log("canceled");
        return;
      }

      const folderPath = result.filePaths[0];
      console.log("folder selected: ", folderPath);

      // create new window --------------------------------- IF CURRENT WINDOW NOT EMPTY
      createWindow();

      // make sure window is loaded before sending data
      win.webContents.on("did-finish-load", () => {
        contents = getFolderContents(folderPath);

        let folderPathObj = path.parse(folderPath);
        folderPathObj["fullpath"] = folderPathObj.dir + "/" + folderPathObj.base;

        win.webContents.send("folder", {
          path: folderPathObj,
          data: contents,
          depth: 0,
        });
      });
    })
    .catch((err) => {
      console.error(err);
    });
}

const getFolderContents = (folderPath, depth = 1) => {
  let contents = [];

  const files = fs.readdirSync(folderPath);

  // for each file in directory
  files.forEach((file) => {
    // exclude hidden files
    if (file.startsWith(".")) {
      return;
    }
    const fullPath = path.join(folderPath, file);
    const stats = fs.statSync(fullPath);
    const filePathObj = path.parse(fullPath);
    filePathObj["fullpath"] = filePathObj.dir + "/" + filePathObj.base;

    // if the file is a directory
    if (stats.isDirectory()) {
      // use recursion for contents inside subfolder
      const subFolderContents = getFolderContents(fullPath, depth + 1);

      // push folder to contents
      contents.push({
        type: "folder",
        path: filePathObj,
        data: subFolderContents,
        depth,
      });
    } else {
      // get file contents
      const data = fs.readFileSync(fullPath, "utf-8");

      // push file to contents
      contents.push({ type: "file", path: filePathObj, data, depth });
    }
  });

  return contents;
};

const saveFile = () => {
  window.ipc.send("get-save");
};

// save file
ipcMain.on("save-file", (_event, filePath, fileContent) => {
  let path = filePath.fullpath;
  console.log(path);
  if (fs.existsSync(path)) {
    // if file exists, save to file
    fs.writeFile(path, fileContent, (error) => {
      if (error) {
        console.err("couldn't save file");
      }
    });
    win.webContents.send("file", {
      path: filePath,
      data: fileContent,
    });
  } else {
    // if file doesn't exist, open dialog to save as new file
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
          depth: 0,
        });
      });
    });
};

//-------------------------------------------------------------------------------------------------
// App is ready
//-------------------------------------------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();

  // implement window
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

//-------------------------------------------------------------------------------------------------
// Menu Template
//-------------------------------------------------------------------------------------------------

const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
            },
          ],
        },
      ]
    : []),
  {
    label: "File",
    submenu: [
      {
        label: "Open File...",
        click: () => {
          openFile();
        },
      },
      {
        label: "Open Folder...",
        click: () => {
          openFolder();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Save As",
      },
    ],
  },
  {
    role: "editMenu",
  },
  {
    role: "viewMenu",
  },
  {
    role: "windowMenu",
  },
];

// close window mac version
// app.on("window-all-closed", () => {
//   if (!isMac) {
//     app.quit();
//   }
// });
