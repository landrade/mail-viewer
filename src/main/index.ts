import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { runMigrations } from './db/migrations'
import { closePool } from './db/client'
import { closeAllConnections } from './imap/connectionManager'
import { registerAccountHandlers } from './ipc/accountHandlers'
import { registerFolderHandlers } from './ipc/folderHandlers'
import { registerMessageHandlers } from './ipc/messageHandlers'
import { registerImportHandlers } from './ipc/importHandlers'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(async () => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.mailviewer.app')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Run database migrations before registering handlers
  try {
    await runMigrations()
  } catch (err) {
    console.error('[main] Failed to run migrations:', err)
  }

  // Register all IPC handlers
  registerAccountHandlers()
  registerFolderHandlers()
  registerMessageHandlers()
  registerImportHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await closeAllConnections()
  await closePool()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
