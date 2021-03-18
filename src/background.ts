'use strict'

import { BrowserWindow, Menu, Tray, app, nativeTheme, protocol, session } from 'electron'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'

import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import { loadPreferences } from '@/utils/db/preferences'
import path from 'path'
import { registerIpcChannels } from '@/utils/ipc/main' // Import for side effects

const isDevelopment = process.env.NODE_ENV !== 'production'
export var mainWindow: BrowserWindow

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true } }])
protocol.registerSchemesAsPrivileged([{ scheme: 'media', privileges: { corsEnabled: true, supportFetchAPI: true } }])

let isQuitting = false
let tray: Tray

function interceptHttp() {
  // Since youtube embeds are blocked on custom protocols like file:// or app://
  // We'll load the app on http://localhost
  // Which will then be intercepted here and normal files will be delivered
  // Essentially spoofing window.location.origin to become http://localhost
  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    session.defaultSession.protocol.interceptFileProtocol('http', (request, callback) => {
      let pathName = new URL(request.url).pathname
      pathName = decodeURI(pathName)

      const filePath = path.join(__dirname, pathName)

      // deregister intercept after we handle index.js
      // Reregister on page refresh
      if (request.url.includes('index.js')) {
        session.defaultSession.protocol.uninterceptProtocol('http')
      }

      try {
        callback(filePath)
      } catch (e) {
        console.log(e)
      }
    })
  }
}

export async function createPreferenceWindow() {
  const win = new BrowserWindow({
    width: 840,
    height: 653,
    minHeight: 653,
    minWidth: 840,
    backgroundColor: '#212121',
    show: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: (process.env.ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL((process.env.WEBPACK_DEV_SERVER_URL + 'preferenceWindow') as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    // Load the index.html when not in development
    win.loadURL('app://./preferenceWindow.html')
  }
  win.removeMenu()
  return win
}

function initializeTray() {
  tray = new Tray(path.join(__static, 'logo.png'))
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: function () {
          tray.destroy()
          mainWindow.show()
        },
      },
      {
        label: 'Quit',
        click: function () {
          isQuitting = true
          app.quit()
        },
      },
    ])
  )

  tray.on('double-click', () => {
    mainWindow.show()
    tray.destroy()
  })
}

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1016,
    height: 653,
    minHeight: 653,
    minWidth: 1016,
    backgroundColor: '#212121',
    titleBarStyle: 'hidden',
    parent: mainWindow,
    modal: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: (process.env.ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    // Load the index.html when not in development
    win.loadURL('http://localhost/./index.html')
  }
  win.removeMenu()

  win.on('close', function (event) {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      initializeTray()
    }
  })
  return win
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', function () {
  isQuitting = true
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  const protocolName = 'media'
  protocol.registerFileProtocol(protocolName, (request, callback) => {
    const url = request.url.replace(`${protocolName}://`, '')
    try {
      return callback(decodeURIComponent(url))
    } catch (error) {
      // Handle the error as needed
      console.error(error)
    }
  })

  interceptHttp()
  createProtocol('app')
  nativeTheme.themeSource = 'dark'
  await loadPreferences()
  mainWindow = await createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

registerIpcChannels()
