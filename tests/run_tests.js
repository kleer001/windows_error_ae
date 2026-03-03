// run_tests.js — Simple test runner for WindowsErrorFX pure logic tests

console.log("╔══════════════════════════════════════════╗");
console.log("║  WindowsErrorFX.jsx — Test Suite         ║");
console.log("╚══════════════════════════════════════════╝\n");

var totalPassed = 0;
var totalFailed = 0;

var testFiles = [
    "./test_prng",
    "./test_utilities",
    "./test_scheduler"
];

for (var i = 0; i < testFiles.length; i++) {
    try {
        var result = require(testFiles[i]);
        totalPassed += result.passed;
        totalFailed += result.failed;
    } catch (e) {
        console.error("\nERROR running " + testFiles[i] + ":");
        console.error(e.message);
        console.error(e.stack);
        totalFailed++;
    }
    console.log("");
}

console.log("══════════════════════════════════════════");
console.log("TOTAL: " + totalPassed + " passed, " + totalFailed + " failed");
console.log("══════════════════════════════════════════");

if (totalFailed > 0) {
    process.exit(1);
}
