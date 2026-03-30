const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const userDir = path.join(repoRoot, 'test', 'node-red');
const nodeModulesDir = path.join(userDir, 'node_modules');
const linkPath = path.join(nodeModulesDir, 'node-red-contrib-tahoma');
const flowsPath = path.join(userDir, 'flows.json');

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFlowsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]\n', 'utf8');
  }
}

function removeIfExists(targetPath) {
  const entry = fs.lstatSync(targetPath, { throwIfNoEntry: false });
  if (entry) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function recreatePluginSymlink(targetPath, destinationPath) {
  const relativeTarget = path.relative(path.dirname(destinationPath), targetPath);
  removeIfExists(destinationPath);
  fs.symlinkSync(
    relativeTarget,
    destinationPath,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}

function main() {
  ensureDirectory(nodeModulesDir);
  ensureFlowsFile(flowsPath);
  recreatePluginSymlink(repoRoot, linkPath);
  process.stdout.write(`Test mode prepared in ${userDir}\n`);
}

main();
