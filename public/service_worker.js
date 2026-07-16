/* global self */

const shareTargetPath = '/share-target';
const maximumSharedFieldLength = 8192;
const sharedFieldNames = ['shared_title', 'shared_text', 'shared_url'];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== 'POST' ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname !== shareTargetPath
  ) {
    return;
  }

  event.respondWith(createShareTargetResponse(event.request));
});

async function createShareTargetResponse(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return createRedirectResponse('/');
  }

  const query = new URLSearchParams();
  for (const fieldName of sharedFieldNames) {
    const fieldValue = formData.get(fieldName);
    if (
      typeof fieldValue === 'string' &&
      fieldValue.length <= maximumSharedFieldLength
    ) {
      query.set(fieldName, fieldValue);
    }
  }

  const encodedFields = query.toString();
  const destination = encodedFields
    ? `/#share-target?${encodedFields}`
    : '/#share-target';
  return createRedirectResponse(destination);
}

function createRedirectResponse(destination) {
  return Response.redirect(
    new URL(destination, self.location.origin).href,
    303
  );
}
