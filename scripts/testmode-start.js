const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const userDir = path.join(repoRoot, 'test', 'node-red');
const binName = process.platform === 'win32' ? 'node-red.cmd' : 'node-red';
const nodeRedBin = path.join(repoRoot, 'node_modules', '.bin', binName);

if (!fs.existsSync(nodeRedBin)) {
  process.stderr.write(
    'Node-RED is not installed locally. Run `npm install` before starting test mode.\n',
  );
  process.exit(1);
}

const port = process.env.NODE_RED_PORT || '1880';
const args = ['--userDir', userDir, '--flowFile', 'flows.json', '--port', port];

const child = spawn(nodeRedBin, args, {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
