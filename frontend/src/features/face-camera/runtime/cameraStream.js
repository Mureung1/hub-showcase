export function requestUserCamera(mediaDevices = navigator.mediaDevices) {
  return mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });
}

export async function attachCameraStream(video, stream) {
  if (!video) return;
  video.srcObject = stream;
  await video.play();
}

export function stopCameraStream(stream, video) {
  stream?.getTracks().forEach((track) => track.stop());

  if (video) {
    video.srcObject = null;
  }
}
