#!/usr/bin/env node

const { spawn } = require('child_process')
const electron = require('electron')
const path = require('path')

const proc = spawn(String(electron), [path.join(__dirname, '../out/main/index.js')], {
  stdio: 'inherit',
  windowsHide: false
})

proc.on('close', (code) => process.exit(code ?? 0))
