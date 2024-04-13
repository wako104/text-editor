const { app, Menu, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const cm = require("codemirror");
const { error } = require("console");
let win;

// all currently opened items (folders and files)
let openItems = [];
// has a folder been opened? - treat folder like a workspace
let isFolder = false;

const isMac = process.platform === "darwin";

if (process.env.NODE_ENV === "development") {
  require("electron-reloader")(module);
}

// create main window
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
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
        win.webContents.send("file", { filepath: path.parse(filePath) }); //-------------------- FIX
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

        let filePathObj = parse(filePath);
        filePathObj["fullpath"] = filePathObj.dir + "/" + filePathObj.base;
        win.webContents.send("file", {
          path: filePathObj,
          data: data,
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

      // create new window if current window is not empty
      if (openItems.length > 0) {
        createWindow();
        win.webContents.on("did-finish-load", () => {
          sendFolderContents(folderPath);
        });
      } else {
        sendFolderContents(folderPath);
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

const sendFolderContents = (folderPath) => {
  contents = getFolderContents(folderPath);

  let folderPathObj = path.parse(folderPath);
  folderPathObj["fullpath"] = folderPathObj.dir + "/" + folderPathObj.base;

  contents = getFolderContents(folderPath);
  let folderContents = {
    path: folderPathObj,
    data: contents,
  };

  openItems.push(folderContents);
  isFolder = true;

  win.webContents.send("folder", folderContents);
};

const getFolderContents = (folderPath) => {
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
      const subFolderContents = getFolderContents(fullPath);

      // push folder to contents
      contents.push({
        type: "folder",
        path: filePathObj,
        data: subFolderContents,
      });
    } else {
      // get file contents
      const data = fs.readFileSync(fullPath, "utf-8");

      // push file to contents
      contents.push({ type: "file", path: filePathObj, data });
    }
  });

  return contents;
};

const saveFile = () => {
  win.webContents.send("get-save");
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
ipcMain.on("save-file-as", (_event, fileContent) => {
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

//-------------------------------------------------------------------------------------------------
// CodeMirror
//-------------------------------------------------------------------------------------------------

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
        accelerator: isMac ? "Cmd+O" : "Ctrl+O",
        click: () => {
          openFolder();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Save",
        accelerator: isMac ? "Cmd+S" : "Ctrl+S",
        click: () => {
          saveFile();
        },
      },
      {
        label: "Save-As",
        accelerator: isMac ? "Cmd+Shift+S" : "Ctrl+Shift+S",
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
