const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
let win;

if (process.env.NODE_ENV === "development") {
    require("electron-reloader")(module);
  }

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.webContents.openDevTools()
  win.loadFile(path.join(__dirname, 'index.html'))

}

ipcMain.on("openFile", (_event, _arg) => {
  console.log("sendFile")
  win.webContents.send("file", "Hello World!");
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// close window mac version
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})