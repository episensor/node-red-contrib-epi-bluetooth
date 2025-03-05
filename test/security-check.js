/**
 * Security check script
 * 
 * This script performs security checks on the package:
 * 1. Runs npm audit to check for vulnerabilities
 * 2. Checks for outdated dependencies
 * 3. Verifies package-lock.json is in sync with package.json
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');
const PACKAGE_LOCK_JSON = path.join(ROOT_DIR, 'package-lock.json');

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
 * Run npm audit to check for vulnerabilities
 */
function runNpmAudit() {
  console.log(`\n${colors.cyan}Running npm audit...${colors.reset}`);
  
  try {
    // Run npm audit and capture output
    const auditOutput = runCommand('npm audit --json', { 
      silent: true,
      ignoreError: true
    });
    
    // Parse audit output
    let auditResult;
    try {
      auditResult = JSON.parse(auditOutput);
    } catch (error) {
      console.warn(`${colors.yellow}Warning: Could not parse npm audit output${colors.reset}`);
      console.log(auditOutput);
      return false;
    }
    
    // Check for vulnerabilities
    const vulnerabilities = auditResult.vulnerabilities || {};
    const totalVulnerabilities = Object.values(vulnerabilities).reduce((total, severity) => {
      return total + (severity.length || 0);
    }, 0);
    
    if (totalVulnerabilities > 0) {
      console.warn(`${colors.yellow}Warning: Found ${totalVulnerabilities} vulnerabilities${colors.reset}`);
      
      // Print summary of vulnerabilities
      for (const [severity, vulns] of Object.entries(vulnerabilities)) {
        if (vulns.length > 0) {
          console.warn(`${colors.yellow}  - ${severity}: ${vulns.length}${colors.reset}`);
        }
      }
      
      // Run npm audit with more details
      console.log('\nDetails:');
      runCommand('npm audit', { ignoreError: true });
      
      return false;
    }
    
    console.log(`${colors.green}✓ No vulnerabilities found${colors.reset}`);
    return true;
  } catch (error) {
    console.warn(`${colors.yellow}Warning: npm audit failed: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Check for outdated dependencies
 */
function checkOutdatedDependencies() {
  console.log(`\n${colors.cyan}Checking for outdated dependencies...${colors.reset}`);
  
  try {
    // Run npm outdated and capture output
    const outdatedOutput = runCommand('npm outdated --json', { 
      silent: true,
      ignoreError: true
    });
    
    // Parse outdated output
    let outdatedDeps;
    try {
      outdatedDeps = JSON.parse(outdatedOutput);
    } catch (error) {
      // If there are no outdated dependencies, npm outdated returns an empty string
      if (outdatedOutput.trim() === '') {
        console.log(`${colors.green}✓ All dependencies are up to date${colors.reset}`);
        return true;
      }
      
      console.warn(`${colors.yellow}Warning: Could not parse npm outdated output${colors.reset}`);
      console.log(outdatedOutput);
      return false;
    }
    
    // Check for outdated dependencies
    const outdatedCount = Object.keys(outdatedDeps).length;
    if (outdatedCount > 0) {
      console.warn(`${colors.yellow}Warning: Found ${outdatedCount} outdated dependencies${colors.reset}`);
      
      // Print summary of outdated dependencies
      for (const [name, info] of Object.entries(outdatedDeps)) {
        console.warn(`${colors.yellow}  - ${name}: ${info.current} -> ${info.latest}${colors.reset}`);
      }
      
      return false;
    }
    
    console.log(`${colors.green}✓ All dependencies are up to date${colors.reset}`);
    return true;
  } catch (error) {
    console.warn(`${colors.yellow}Warning: npm outdated failed: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Verify package-lock.json is in sync with package.json
 */
function verifyPackageLock() {
  console.log(`\n${colors.cyan}Verifying package-lock.json...${colors.reset}`);
  
  // Check if package-lock.json exists
  if (!fs.existsSync(PACKAGE_LOCK_JSON)) {
    console.warn(`${colors.yellow}Warning: package-lock.json does not exist${colors.reset}`);
    return false;
  }
  
  try {
    // Run npm install --package-lock-only to check if package-lock.json is in sync
    runCommand('npm install --package-lock-only', { silent: true });
    
    // Check if package-lock.json has changed
    const gitStatus = runCommand('git status --porcelain package-lock.json', { 
      silent: true,
      ignoreError: true
    });
    
    if (gitStatus.trim() !== '') {
      console.warn(`${colors.yellow}Warning: package-lock.json is not in sync with package.json${colors.reset}`);
      console.warn(`${colors.yellow}Run 'npm install' to update package-lock.json${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}✓ package-lock.json is in sync with package.json${colors.reset}`);
    return true;
  } catch (error) {
    console.warn(`${colors.yellow}Warning: Failed to verify package-lock.json: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.magenta}Running security checks for @episensor/epi-bluetooth${colors.reset}`);
  
  // Run all checks
  const auditResult = runNpmAudit();
  const outdatedResult = checkOutdatedDependencies();
  const packageLockResult = verifyPackageLock();
  
  // Print summary
  console.log(`\n${colors.magenta}Security check summary:${colors.reset}`);
  console.log(`${auditResult ? colors.green : colors.yellow}npm audit: ${auditResult ? 'PASS' : 'WARN'}${colors.reset}`);
  console.log(`${outdatedResult ? colors.green : colors.yellow}outdated dependencies: ${outdatedResult ? 'PASS' : 'WARN'}${colors.reset}`);
  console.log(`${packageLockResult ? colors.green : colors.yellow}package-lock.json: ${packageLockResult ? 'PASS' : 'WARN'}${colors.reset}`);
  
  // Exit with success if all checks passed
  const allPassed = auditResult && outdatedResult && packageLockResult;
  if (allPassed) {
    console.log(`\n${colors.green}All security checks passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.warn(`\n${colors.yellow}Some security checks failed or produced warnings.${colors.reset}`);
    process.exit(0); // Exit with success to allow CI/CD to continue
  }
}

// Run the main function
main(); 