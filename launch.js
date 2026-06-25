// Clears ELECTRON_RUN_AS_NODE before spawning Electron,
// because that env var causes Electron to behave as plain Node.js.
const { spawn } = require('child_process');
const electronPath = require('./node_modules/electron');

delete process.env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: process.env,
  windowsHide: false,
});

child.on('close', (code) => process.exit(code || 0));
