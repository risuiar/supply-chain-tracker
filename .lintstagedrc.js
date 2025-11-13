const path = require('path');
const { execSync } = require('child_process');

// Detectar si estamos en Windows
const isWindows = process.platform === 'win32';
const cmdSeparator = isWindows ? '; ' : ' && ';

module.exports = {
  'web/src/**/*.{ts,tsx}': (filenames) => {
    const relativePaths = filenames.map((filename) =>
      path.relative(path.join(process.cwd(), 'web'), filename).replace(/\\/g, '/')
    );
    
    const commands = [
      `cd web${cmdSeparator}npx prettier --write ${relativePaths.join(' ')}`,
      `cd web${cmdSeparator}npx eslint --fix ${relativePaths.join(' ')}`,
    ];
    
    return commands;
  },
  'web/src/**/*.css': (filenames) => {
    const relativePaths = filenames.map((filename) =>
      path.relative(path.join(process.cwd(), 'web'), filename).replace(/\\/g, '/')
    );
    
    return `cd web${cmdSeparator}npx prettier --write ${relativePaths.join(' ')}`;
  },
};

