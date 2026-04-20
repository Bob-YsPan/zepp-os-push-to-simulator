// push_qr.js
// Need to install extra module first: npm install jimp jsqr adm-zip
// And link back the CLI: npm link @zeppos/zeus-cli

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const { Jimp } = require('jimp');
const jsQR = require('jsqr');
const AdmZip = require('adm-zip');

const { downloadFile } = require('./downloader'); 
const { run } = require('./push');

async function main() {
    const qrImagePath = process.argv[2];
    if (!qrImagePath) {
        console.error("Usage: node push_qr.js <QR file path>");
        return;
    }

    const tempDir = path.join(__dirname, 'upload');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    let zpkPath, fileName;
    try {
        ext = path.extname(qrImagePath)
        if (ext === ".zip" || ext === ".zpk") {
            zpkPath = qrImagePath;
            fileName = path.basename(qrImagePath, ext)
            console.log("ℹ️ You are provides a zip/zpk file, jumps to the extract step");
        }
        else {
            // 1. Reading QR Code
            console.log(`🔍 Reading QR Code: ${qrImagePath}`);
            const image = await Jimp.read(qrImagePath);
            const qrCode = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
            if (!qrCode) throw new Error("Cannot read the QR Code");
            
            let targetUrl = qrCode.data.replace("zpkd1://", "https://");
            console.log(`🔗 Got URL: ${targetUrl}`);

            // 2. Download file
            fileName = path.basename(new URL(targetUrl).pathname) || 'download.zpk';
            zpkPath = path.join(tempDir, fileName);
            await downloadFile(targetUrl, zpkPath);
        }

        // Checking file
        const stats = fs.statSync(zpkPath);
        if (stats.size < 3072) {
            const content = fs.readFileSync(zpkPath, 'utf8');
            throw new Error(`File too small, maybe you downloads the denied message from the server?\n${content}`);
        }

        // 3. Extract the ZPK
        const extractDir = path.join(tempDir, fileName.replace(/\.[^/.]+$/, ""));
        console.log(`📦 Extracted to: ${extractDir}`);
        const zip = new AdmZip(zpkPath);
        zip.extractAllTo(extractDir, true);

        // 4. Extract the device.zip
        const deviceZipPath = path.join(extractDir, 'device.zip');
        const deviceDir = path.join(extractDir, 'device');
        const deviceZip = new AdmZip(deviceZipPath);
        deviceZip.extractAllTo(deviceDir, true);

        // 5. Remove app.json's extra header (0xEF, 0xBB, 0xBF)
        const appJsonPath = path.join(deviceDir, 'app.json');
        let content = fs.readFileSync(appJsonPath);
        if (content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
            console.log("🧹 Clean the app.json...");
            content = content.slice(3);
            fs.writeFileSync(appJsonPath, content);
        }

        // 6. Opens the json and wait user
        console.log("📝 Please editing the device source and converts the image, process will continue when close the notepad...");
        const editorCmd = process.platform === 'win32' ? 'notepad' : 'open -t'; 
        // You can switches your prefer editor here:
        // EX. VSCode use 'code --wait'
        execSync(`${editorCmd} "${appJsonPath}"`);

        // 7. Repack
        console.log("🏗️ Repacking...");
        const newDeviceZip = new AdmZip();
        newDeviceZip.addLocalFolder(deviceDir);
        
        // Backup old device.zip
        fs.renameSync(deviceZipPath, deviceZipPath + '.old');
        newDeviceZip.writeZip(deviceZipPath);

        const modZpkName = `${fileName.replace(/\.[^/.]+$/, "")}-mod.zip`;
        const modZpkPath = path.join(tempDir, modZpkName);
        const finalZip = new AdmZip();
        // Add new device.zip and another files (like app-size.zip)
        fs.readdirSync(extractDir).forEach(file => {
            const filePath = path.join(extractDir, file);
            if (fs.lstatSync(filePath).isFile() && file !== 'device.zip.old') {
                finalZip.addLocalFile(filePath);
            }
        });
        finalZip.writeZip(modZpkPath);

        // 8. push to simulator
        console.log("🚀 Pushing to simulator...");
        await run(modZpkPath, appJsonPath);

    } catch (err) {
        console.error("❌ Error occured:", err.message);
    }
}

main();