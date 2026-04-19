// push.js
const path = require('path');
const fs = require('fs');

// Define base path
const utilsDistPath = '@zeppos/zeus-cli/private-modules/zeppos-app-utils/dist';

// 1. Get core components
const { config, Simulator } = require(`${utilsDistPath}/index`);
const { getDeviceInfoFromAppJson } = require(`${utilsDistPath}/tools/index`);
const getDeviceConf = config.getDeviceConf;

async function run(zpkfile, jsonfile) {

    const url = "http://127.0.0.1:7650"; // Simulator default listening address
    
    try {
        // --- Read and process JSON ---
        const fullJsonPath = path.resolve(jsonfile);
        if (!fs.existsSync(fullJsonPath)) throw new Error(`JSON file not found: ${fullJsonPath}`);

        const rawData = fs.readFileSync(fullJsonPath, 'utf8');
        
        // Removed the UTF-8 BOM (\uFEFF) that could cause a SyntaxError.
        const cleanData = rawData.replace(/^\uFEFF/, '');
        
        let appConfig;
        try {
            appConfig = JSON.parse(cleanData);
        } catch (parseErr) {
            throw new Error(`JSON parsing failed. Please check if the file content format is correct.`);
        }

        // --- Extract parameters ---
        const appId = appConfig.app.appId;
        const projectName = appConfig.app.appName;
        const deviceSourceArr = appConfig.platforms.map(p => p.deviceSource);
        const primaryDeviceSource = deviceSourceArr[0] || 229;

        // --- Look up the device's internal code name ---
        const { deviceInternalCodeName } = getDeviceConf();
        const targetDeviceInternalName = deviceInternalCodeName[primaryDeviceSource];

        // --- Preparing ZPK ---
        const fullZpkPath = path.resolve(zpkfile);
        if (!fs.existsSync(fullZpkPath)) throw new Error(`ZPK file not found: ${fullZpkPath}`);
        const zpkBuffer = fs.readFileSync(fullZpkPath);

        // --- Ready to upload ---
        const simulator = new Simulator(url);
        
        console.log("=========================================");
        console.log(`🚀 Preparing to push to the simulator`);
        console.log(`📦 Project: ${projectName}`);
        console.log(`🆔 AppID: ${appId}`);
        console.log(`📱 Device: ${targetDeviceInternalName} (Source: ${primaryDeviceSource})`);
        console.log("=========================================");
        
        await simulator.upload(
            zpkBuffer, 
            projectName, 
            targetDeviceInternalName, 
            appId, 
            deviceSourceArr
        );
        
        console.log("✅ Upload successful! Please check the simulator.");
    } catch (err) {
        console.error("❌ An error occurred during execution:");
        console.error(err.message);
    }
}

module.exports = { run };

if (require.main === module) {
    const zpkPath = process.argv[2]; 
    const buildAppJsonPath = process.argv[3]; 

    if (!zpkPath || !buildAppJsonPath) {
        console.error("❌ Error: Insufficient parameters");
        console.error("Usage: node push.js <zpk path> <compiled app.json path>");
        process.exit(1);
    }

    run(zpkPath, buildAppJsonPath);
}