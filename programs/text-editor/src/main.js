const { app, Menu, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const pty = require("node-pty");

let win;
// all currently opened items (folders and files)
let openItems = [];
// has a folder been opened? - treat folder like a workspace
let isFolder = false;
let ptyProcess;
const isMac = process.platform === "darwin";
var shell = os.platform() === "win32" ? "powershell.exe" : "zsh";

if (process.env.NODE_ENV === "development") {
  require("electron-reloader")(module);
}

// create main window
function createWindow() {
  win = new BrowserWindow({
    width: 925,
    height: 600,
    minWidth: 925,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.webContents.openDevTools();
  win.loadFile(path.join(__dirname, "index.html"));
}

//-------------------------------------------------------------------------------------------------
// File functions
//-------------------------------------------------------------------------------------------------

// save file in file explorer
ipcMain.on("new-file", (_event, _arg) => {
  dialog
    .showSaveDialog(win, {
      filters: [{ name: "All Files", extensions: ["*"] }],
    })
    .then(({ filePath }) => {
      console.log("file path: ", filePath);
      fs.writeFile(filePath, "", (error) => {
        if (error) {
          console.log("error");
          return;
        }
        let filePathObj = path.parse(filePath);
        filePathObj["fullpath"] = filePathObj.dir + "/" + filePathObj.base;
        win.webContents.send("file", { path: filePathObj });
      });
    });
});

const openFile = () => {
  dialog
    .showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "All Files", extensions: ["*"] }],
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
          data,
        });
      });
    })
    .catch((err) => {
      console.error(err);
    });
};

const saveFile = () => {
  win.webContents.send("get-save");
};

// save file
ipcMain.on("save-file", (_event, data) => {
  filePath = data.filePathActive;
  fileContent = data.content;
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
ipcMain.on("save-file-as", (_event, data) => {
  saveAs(data);
});

// save as function
const saveAs = (fileContent) => {
  dialog
    .showSaveDialog(win, {
      filters: [{ name: "All Files", extensions: ["*"] }],
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
// Folder functions
//-------------------------------------------------------------------------------------------------

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
  isFolder = true;

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

//-------------------------------------------------------------------------------------------------
// Terminal functions
//-------------------------------------------------------------------------------------------------

ipcMain.on("terminal-data", (_event, data) => {
  ptyProcess.write(data);
});

const newTerminal = () => {
  win.webContents.send("open-terminal");

  ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 10,
    cwd: process.env.HOME,
    env: process.env,
  });

  ptyProcess.on("data", (data) => {
    win.webContents.send("terminal-output", data);
  });
};

const closeTerminal = () => {
  ptyProcess.kill();
  ptyProcess = null;
  console.log(ptyProcess);

  win.webContents.send("close-terminal");
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
    label: "Terminal",
    submenu: [
      {
        label: "New Terminal",
        click: () => {
          if (ptyProcess) {
            closeTerminal();
          }
          newTerminal();
        },
      },
      {
        label: "Close Terminal",
        click: () => {
          closeTerminal();
        },
      },
    ],
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
