/**
 * Node-RED test script
 * 
 * This script tests the compatibility of the package with Node-RED:
 * 1. Creates a temporary Node-RED instance
 * 2. Installs the package
 * 3. Verifies that the package can be loaded
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
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epi-bluetooth-node-red-test-'));
    console.log(`${colors.green}✓ Created temporary directory: ${tempDir}${colors.reset}`);
    return tempDir;
  } catch (error) {
    console.error(`${colors.red}Failed to create temporary directory: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Set up a Node-RED instance
 */
function setupNodeRed(tempDir) {
  console.log(`\n${colors.cyan}Setting up Node-RED instance...${colors.reset}`);
  
  try {
    // Create package.json in temporary directory
    const packageJson = {
      name: 'epi-bluetooth-node-red-test',
      version: '1.0.0',
      description: 'Node-RED test for @episensor/epi-bluetooth',
      private: true,
      dependencies: {
        'node-red': '^3.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Install Node-RED
    runCommand('npm install', { 
      cwd: tempDir,
      silent: false
    });
    
    // Create settings.js
    const settingsJs = `
      module.exports = {
        flowFile: 'flows.json',
        userDir: '${tempDir}',
        functionGlobalContext: {},
        logging: {
          console: {
            level: 'info',
            metrics: false,
            audit: false
          }
        }
      };
    `;
    
    fs.writeFileSync(
      path.join(tempDir, 'settings.js'),
      settingsJs
    );
    
    // Create empty flows.json
    fs.writeFileSync(
      path.join(tempDir, 'flows.json'),
      '[]'
    );
    
    console.log(`${colors.green}✓ Node-RED instance set up successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to set up Node-RED instance: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Install the package in the Node-RED instance
 */
function installPackage(tempDir) {
  console.log(`\n${colors.cyan}Installing package in Node-RED instance...${colors.reset}`);
  
  try {
    // Link the package
    runCommand('npm link', { 
      cwd: ROOT_DIR,
      silent: false
    });
    
    runCommand('npm link @episensor/epi-bluetooth', { 
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
    // Create a script to run Node-RED
    const runScript = `
      const path = require('path');
      const RED = require('node-red');
      
      // Load settings
      const settings = require('./settings.js');
      
      // Initialize Node-RED
      RED.init(settings);
      
      // Start the runtime
      RED.start().then(() => {
        console.log('Node-RED started');
        
        // Check if our nodes are registered
        const registeredTypes = Object.keys(RED.nodes.registry.nodeConstructors);
        const packageJson = require('@episensor/epi-bluetooth/package.json');
        const nodeRedConfig = packageJson['node-red'] || {};
        const nodes = nodeRedConfig.nodes || {};
        const nodeNames = Object.keys(nodes);
        
        console.log('Registered node types:', registeredTypes);
        console.log('Expected node types:', nodeNames);
        
        // Check if all our nodes are registered
        const missingNodes = nodeNames.filter(nodeName => {
          // Node-RED adds the module name as a prefix to the node type
          const fullNodeName = '@episensor/epi-bluetooth/' + nodeName;
          return !registeredTypes.includes(fullNodeName);
        });
        
        if (missingNodes.length > 0) {
          console.error('Missing nodes:', missingNodes);
          process.exit(1);
        }
        
        console.log('All nodes registered successfully');
        
        // Stop Node-RED after a short delay
        setTimeout(() => {
          console.log('Stopping Node-RED');
          RED.stop().then(() => {
            console.log('Node-RED stopped');
            process.exit(0);
          });
        }, 2000);
      }).catch(error => {
        console.error('Failed to start Node-RED:', error);
        process.exit(1);
      });
    `;
    
    fs.writeFileSync(
      path.join(tempDir, 'run.js'),
      runScript
    );
    
    // Run the script
    runCommand('node run.js', { 
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
function cleanup(tempDir) {
  console.log(`\n${colors.cyan}Cleaning up...${colors.reset}`);
  
  try {
    // Unlink the package
    runCommand('npm unlink @episensor/epi-bluetooth', { 
      cwd: tempDir,
      silent: true,
      ignoreError: true
    });
    
    runCommand('npm unlink', { 
      cwd: ROOT_DIR,
      silent: true,
      ignoreError: true
    });
    
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
  console.log(`${colors.magenta}Running Node-RED compatibility test for @episensor/epi-bluetooth${colors.reset}`);
  
  let tempDir = null;
  
  try {
    // Create temporary directory
    tempDir = createTempDir();
    
    // Set up Node-RED instance
    setupNodeRed(tempDir);
    
    // Install the package
    installPackage(tempDir);
    
    // Verify the package can be loaded in Node-RED
    verifyPackageLoading(tempDir);
    
    // Clean up
    cleanup(tempDir);
    
    console.log(`\n${colors.green}Node-RED compatibility test completed successfully!${colors.reset}`);
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Node-RED compatibility test failed: ${error.message}${colors.reset}`);
    
    // Clean up on error
    if (tempDir) {
      cleanup(tempDir);
    }
    
    process.exit(1);
  }
}

// Run the main function
main(); 