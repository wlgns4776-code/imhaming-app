const { app, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const packedApp = process.env.IMHAMING_QA_PACKED_APP;
if (!packedApp || !process.env.IMHAMING_QA_USER_DATA) throw new Error('An isolated packaged-app test directory is required.');

app.setPath('userData', process.env.IMHAMING_QA_USER_DATA);
app.setLoginItemSettings = () => {};
app.getVersion = () => JSON.parse(fs.readFileSync(path.join(packedApp, 'package.json'), 'utf8')).version;
global.desktopTestLinks = [];
shell.openExternal = async (url) => { global.desktopTestLinks.push(url); };
app.on('browser-window-created', (_, window) => window.hide());

require(path.join(packedApp, 'electron', 'main.cjs'));
