# Sumz

Sumz is a React Native Android app for AI chat and document-based conversations. It includes Firebase sign-in, local AI model support, conversation memory, profiles, and light/dark themes.

## Requirements

- Node.js 22.11 or newer and npm
- JDK 17
- Android Studio with Android SDK 36, Build Tools 36.0.0, and NDK 27.1.12297006
- An Android 7.0+ device with USB debugging enabled, or a 64-bit Android emulator

## Run on Android

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/gofywi/ProjectMM12.git
   cd ProjectMM12
   npm ci
   ```

2. Obtain the Firebase Android configuration for package `astrax.sumz` and save it as `android/app/google-services.json`. This local file is excluded from Git. Enable the project's authentication providers and register your debug signing certificate fingerprints for Google sign-in.
3. Set `ANDROID_HOME` to your Android SDK location, or configure `sdk.dir` in `android/local.properties`.
4. Start an emulator or connect your Android device.
5. Start Metro:

   ```sh
   npm start
   ```

6. In a second terminal, install and launch the app:

   ```sh
   npm run android
   ```

## Useful commands

```sh
npm test
npm run lint
```
