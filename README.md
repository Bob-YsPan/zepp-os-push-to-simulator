# zepp-os-push-to-simulator
Upload the zpk to the simulator by directly calling the function in the development CLI.

## How to use that?

1. Make sure the `@zeppos/zeus-cli` is installed.
2. Open the terminal, switch to the root folder of this repo, and link to the library by the command below:
   ```
   npm link @zeppos/zeus-cli
   ```
3. Create the `upload` folder at the same location, put the zpks you want to upload.
4. Open the simulator program, launch the device's simulator you want.
5. Extract the app.json from your zpk located at  `<zpk_package>/device.zip/app.json` (The zpk is a zip file that includes two zips)
6. Run the js script using this command:
   ```
   node ./push.js ./upload/<zpk_file>.zpk ./upload/app.json
   ```
   The output like this
   ```
   [ℹ] connecting to simulator on http://127.0.0.:7650 ...
   =========================================
   🚀 Preparing to push to the simulator
   📦 Project: 1A2B
   🆔 AppID: 1111884
   📱 Device: etna (Source: 8388864)
   =========================================
   ✅ Upload successful! Please check the simulator.
   [✔] simulator connected
   ```
7. If that zpk is built by the official CLI, you should see the app is in the simulator app's list, and the simulated device opens the app automatically.
   ![capture1](./cap1.png)

## Known issues

1. The app icon will gone if upload the zpk file use this upload method.
2. Can't upload the third-party watchface to the simulator, like the watchface on Amazfit Watchfaces site.
