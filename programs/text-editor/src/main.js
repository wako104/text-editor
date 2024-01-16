const { app, BrowserWindow } = require('electron')
const path = require('path')

if (process.env.NODE_ENV === "development") {
    require("electron-reloader")(module);
  }

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile(path.join(__dirname, 'index.html'))
}

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