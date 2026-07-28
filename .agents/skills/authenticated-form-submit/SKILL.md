---
name: authenticated-form-submit
description: Implement authenticated React form submissions in this repository with Firebase ID tokens, duplicate-submit protection, accessible pending and error states, input preservation, success-result routing, and focused Red-to-Green tests. Use when adding or changing a create, update, accept, or AI form flow that calls a protected backend API.
---

# Authenticated Form Submit

Implement the smallest complete authenticated submission flow by reusing the repository's API client, authentication context, form state, routing, and test patterns.

## Workflow

1. Read the applicable `AGENTS.md` guidance and use `$preserve-product-intent`.
2. Inspect the existing API module, authentication context, form component, route owner, and nearest focused tests.
3. Confirm the backend request, success, and error contracts before changing the frontend.
4. Confirm the success destination and which returned identifier or state must survive navigation.
5. Write focused failing tests before implementation.
6. Add the minimum API and UI changes needed to make the tests pass.
7. Run the repository's actual test, lint, and build scripts, then review the diff against the requested completion criteria.

## Red Contract

Cover only the boundaries introduced by the task:

- the API module sends the expected path, method, Firebase token, and complete request body;
- rapid repeated submission produces one request;
- pending controls and text communicate progress;
- validation and network failures remain on the form, expose an accessible error, and preserve edited values;
- success preserves the backend result required by the next screen and navigates only to an implemented route.

Run the smallest targeted command that proves the new tests fail for missing behavior. Stop if Red fails for an unrelated setup or test-isolation problem.

## Green Implementation

### API boundary

- Add the request to the existing feature API module through the shared API client.
- Obtain the Firebase ID token through the existing authentication boundary.
- Send only fields defined by the server contract. Never send server-owned identity, ownership, permission, or type fields.
- Reuse the shared error type and stable error codes; do not branch on message text.

### Form state

- Keep edited values in the existing local form state.
- Set the pending guard before awaiting token or network work. Use a ref only when React state alone leaves a same-tick duplicate window.
- Disable submit and unsafe cancellation while pending, expose `aria-busy`, and use action text such as `저장 중…`.
- Clear the previous request error when a new request begins.
- Catch server and network failures at the screen that owns submission. Render the error with `role="alert"` and restore retry controls without resetting the form.

### Success state

- Use the backend response as the source of the created or updated identifier.
- Preserve the identifier in the route or state contract needed by the next implemented screen.
- Provide concise success feedback. Do not invent a destination whose API or screen is not ready.

## Guardrails

- Do not introduce a generic form hook, state library, request wrapper, or shared component unless an existing repository abstraction already owns that responsibility.
- Do not clear or reconstruct user input after a failed request.
- Do not rely on disabled buttons as the backend authorization boundary.
- Do not claim manual or live API verification when only mocks ran.
- Keep unrelated validation, visual redesign, and destination features out of scope.
