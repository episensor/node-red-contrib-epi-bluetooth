/**
 * Verify package script
 * 
 * This script verifies that the package can be installed and loaded in Node-RED:
 * 1. Creates a temporary directory
 * 2. Packs the current package
 * 3. Installs the package in the temporary directory
 * 4. Attempts to load the package in a Node-RED environment
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Run a command and return its output
 */
function runCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) {
      return error.stdout || '';
    }
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    console.error(error.stdout || error.message);
    process.exit(1);
  }
}

/**
 * Create a temporary directory
 */
function createTempDir() {
  console.log(`\n${colors.cyan}Creating temporary directory...${colors.reset}`);
  
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epi-bluetooth-test-'));
    console.log(`${colors.green}✓ Created temporary directory: ${tempDir}${colors.reset}`);
    return tempDir;
  } catch (error) {
    console.error(`${colors.red}Failed to create temporary directory: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Pack the current package
 */
function packPackage() {
  console.log(`\n${colors.cyan}Packing package...${colors.reset}`);
  
  try {
    const packOutput = runCommand('npm pack', { silent: true });
    const packageFile = packOutput.trim();
    
    if (!fs.existsSync(packageFile)) {
      console.error(`${colors.red}Package file not found: ${packageFile}${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}✓ Package created: ${packageFile}${colors.reset}`);
    return packageFile;
  } catch (error) {
    console.error(`${colors.red}Failed to pack package: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Install the package in a temporary directory
 */
function installPackage(tempDir, packageFile) {
  console.log(`\n${colors.cyan}Installing package in temporary directory...${colors.reset}`);
  
  try {
    // Create package.json in temporary directory
    const packageJson = {
      name: 'epi-bluetooth-test',
      version: '1.0.0',
      description: 'Test package for @episensor/epi-bluetooth',
      private: true
    };
    
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Install the package
    const packagePath = path.resolve(ROOT_DIR, packageFile);
    runCommand(`npm install --no-save ${packagePath}`, { 
      cwd: tempDir,
      silent: false
    });
    
    console.log(`${colors.green}✓ Package installed successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to install package: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Verify the package can be loaded in Node-RED
 */
function verifyPackageLoading(tempDir) {
  console.log(`\n${colors.cyan}Verifying package can be loaded in Node-RED...${colors.reset}`);
  
  try {
    // Create a simple Node-RED test script
    const testScript = `
      const RED = {
        nodes: {
          registerType: (name, constructor) => {
            console.log('Registered node type: ' + name);
          }
        }
      };
      
      // Try to load the package
      try {
        const packageJson = require('./node_modules/@episensor/epi-bluetooth/package.json');
        console.log('Package loaded: ' + packageJson.name + '@' + packageJson.version);
        
        // Load each node defined in the package
        const nodeRedConfig = packageJson['node-red'] || {};
        const nodes = nodeRedConfig.nodes || {};
        
        for (const [nodeName, nodePath] of Object.entries(nodes)) {
          try {
            const nodeModule = require('./node_modules/@episensor/epi-bluetooth/' + nodePath);
            console.log('Node loaded: ' + nodeName);
          } catch (error) {
            console.error('Failed to load node ' + nodeName + ': ' + error.message);
            process.exit(1);
          }
        }
        
        console.log('All nodes loaded successfully');
        process.exit(0);
      } catch (error) {
        console.error('Failed to load package: ' + error.message);
        process.exit(1);
      }
    `;
    
    fs.writeFileSync(
      path.join(tempDir, 'test.js'),
      testScript
    );
    
    // Run the test script
    const result = runCommand('node test.js', { 
      cwd: tempDir,
      silent: false
    });
    
    console.log(`${colors.green}✓ Package can be loaded in Node-RED${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to verify package loading: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Clean up temporary files
 */
function cleanup(tempDir, packageFile) {
  console.log(`\n${colors.cyan}Cleaning up...${colors.reset}`);
  
  try {
    // Remove package file
    if (fs.existsSync(packageFile)) {
      fs.unlinkSync(packageFile);
    }
    
    // Remove temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      runCommand(`rm -rf ${tempDir}`, { silent: true });
    }
    
    console.log(`${colors.green}✓ Cleanup completed${colors.reset}`);
    return true;
  } catch (error) {
    console.warn(`${colors.yellow}Warning: Failed to clean up: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.magenta}Verifying package for @episensor/epi-bluetooth${colors.reset}`);
  
  let tempDir = null;
  let packageFile = null;
  
  try {
    // Create temporary directory
    tempDir = createTempDir();
    
    // Pack the package
    packageFile = packPackage();
    
    // Install the package in the temporary directory
    installPackage(tempDir, packageFile);
    
    // Verify the package can be loaded in Node-RED
    verifyPackageLoading(tempDir);
    
    // Clean up
    cleanup(tempDir, packageFile);
    
    console.log(`\n${colors.green}Package verification completed successfully!${colors.reset}`);
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Package verification failed: ${error.message}${colors.reset}`);
    
    // Clean up on error
    if (tempDir || packageFile) {
      cleanup(tempDir, packageFile);
    }
    
    process.exit(1);
  }
}

// Run the main function
main(); 