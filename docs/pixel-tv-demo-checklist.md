# Pixel TV Demo Checklist

Last updated: 2026-07-30

## Scope

This checklist covers the deployed Pixel TV demo flow on a second laptop:

- webcam permission allowed
- webcam permission denied or unavailable
- local file fallback, if enabled in the current build
- Pixel TV photo capture
- Pixel TV watching manager reaction

## Privacy Baseline

- Webcam frames must stay in the browser and be drawn only to local canvas.
- The app must not upload raw webcam frames or captured photos.
- Photo capture should download a local PNG unless a separately approved sharing flow exists.
- Do not store API keys, email credentials, or user secrets in the repository.

## Environment Checks

1. Open the deployed HTTPS URL or a local `localhost` URL.
2. Confirm the OS camera privacy setting allows the browser to use the camera.
3. Use Chrome or Edge for the primary demo.
4. Before denial testing, reset the site camera permission from browser settings.

## Webcam Allowed Flow

1. Launch the app and open Pixel TV.
2. Accept the browser camera permission prompt.
3. Confirm the TV screen shows a live pixelized webcam stream.
4. Confirm the stream is mostly grayscale with a subtle warm sepia tone.
5. Confirm edges remain visible in the low-resolution sample.
6. Confirm the pink manager stage-2 watching animation appears beside Pixel TV.
7. Confirm a speech balloon appears above the manager with a heart animation inside it.
8. Drag Pixel TV by the TV frame and confirm the manager reaction stays aligned near the TV.
9. Click the TV capture button and confirm a local PNG downloads.

## Webcam Denied Flow

1. Reset camera permission and reopen Pixel TV.
2. Deny the camera permission prompt.
3. Confirm the TV screen reports the blocked/no-signal state without exposing hidden debug UI.
4. If the current build includes file fallback, choose a local image and confirm it appears pixelized in the TV.
5. If file fallback is not yet enabled, record that as a known demo limitation and use the allowed-camera flow for the live demo.

## Photo Capture Checks

1. Click the TV capture button while a drawable TV frame is visible.
2. Confirm the downloaded file name follows `pixel-tv-photo-YYYYMMDD-HHMMSS.png`.
3. Open the PNG locally.
4. Confirm the image combines the TV screen and manager sprite in one composition.
5. Confirm the image is not uploaded or shared automatically.

## Projection Smoke Check

1. Right-click Pixel TV and open properties.
2. Connect projection mode.
3. Launch the connected Pixel TV icon.
4. Confirm the hidden `?projection=pepper` route opens the single-plane Pepper projection view.
5. Return to the desktop flow and confirm Pixel TV can still open normally.

## Notes For Demo Hosts

- Camera permission can fail even after browser approval if the OS camera privacy setting blocks the browser.
- Some laptops expose multiple cameras; use the browser site settings if the wrong camera is selected.
- The Pixel TV window intentionally closes quest-flow windows according to the compatibility policy.
- Email sharing is intentionally out of scope until a privacy-reviewed server flow is approved.
