import { exec } from "child_process";
import fs from "fs";

console.log("🚀 Starting Comprehensive App Testing...");

const runCommand = (command) => {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            resolve({
                command,
                error: error ? error.message : null,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                success: !error
            });
        });
    });
};

async function testApp() {
    const results = [];

    // 1. TypeScript Types Check
    console.log("Checking TypeScript Types...");
    const tscResult = await runCommand("npx tsc --noEmit");
    results.push(tscResult);

    // 2. ESLint Check
    console.log("Running Linter...");
    const lintResult = await runCommand("npx eslint .");
    results.push(lintResult);

    // 3. Vite Build Check
    console.log("Running Build Check...");
    const buildResult = await runCommand("npm run build");
    results.push(buildResult);

    // Generate Report
    console.log("\n=============================");
    console.log("📋 APP DISPATCHER TEST REPORT");
    console.log("=============================\n");

    let totalErrors = 0;

    for (const res of results) {
        if (res.success) {
            console.log(`✅ Passed: ${res.command}`);
        } else {
            console.log(`❌ Failed: ${res.command}`);
            console.log("-----------------------------");
            if (res.stdout) console.log(res.stdout);
            if (res.stderr) console.log(res.stderr);
            console.log("-----------------------------\n");
            totalErrors++;
        }
    }

    if (totalErrors === 0) {
        console.log("🎉 ALL TESTS PASSED! No errors found.");
    } else {
        console.log(`⚠️ Found errors in ${totalErrors} test phases.`);
    }

    // Write to diagnostic file
    fs.writeFileSync("diagnostics-report.txt", JSON.stringify(results, null, 2));
    console.log("Detailed report saved to diagnostics-report.txt");
}

testApp();
