// Mocha `--require` hook: the real 'vscode' module only exists inside the extension host.
// For plain mocha runs, resolve it to our shunt instead.
const Module = require('module');
const path = require('path');

const originalLoad = Module._load;
Module._load = function(request: string, ...rest: any[]) {
  if(request === 'vscode')
    return originalLoad.call(this, path.join(__dirname, 'vscode-shunt'), ...rest);
  return originalLoad.call(this, request, ...rest);
};
