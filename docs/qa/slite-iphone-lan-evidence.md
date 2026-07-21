# S-Lite iPhone LAN Evidence

Date: 2026-07-20

## Verdict

Pass for initial iPhone subscription, retained-link restart recovery,
capability rotation, revocation, explicit reactivation, and normal subscription
of the latest active URL on the trusted LAN profile.

This completes the S-Lite capability lifecycle drill. The host-side same-URL
601→602 update is also proven, but display of that new event through an iPhone
background poll, cancellation propagation, and measured refresh latency remain
unverified on the iPhone.

## Validation Boundary

- Client: one operator-controlled iPhone; model and iOS version were not
  captured in this run.
- Network: the iPhone and NoticePilot host were on the same trusted private LAN.
- Transport: the checked-in LAN Caddy profile exposed only the calendar read
  path over HTTPS on the reserved private host address.
- Trust: the Caddy local root certificate was installed as a configuration
  profile and full certificate trust was enabled on the iPhone.
- Feed: one active SQLite-backed S-Lite feed containing the fixed 601-event
  Foundation.25.1 snapshot plus one allowlisted Policy.15 source event.
- Evidence form: operator-observed client results plus host-side protocol and
  persistence checks. No screenshot or screen recording was captured.

The capability URL, raw token, token-derived identifiers, private host address,
administrator key, and Caddy private key are intentionally excluded from this
record.

## Observed Results

| Check | Result | Evidence |
| --- | --- | --- |
| CA profile installation and full trust | Pass | The iPhone accepted the Caddy root profile and enabled full trust. |
| Initial calendar subscription | Pass | The iPhone accepted the HTTPS subscription URL after trust configuration. |
| Calendar data display | Pass | The subscribed Foundation snapshot loaded in the iPhone calendar client. |
| Host protocol response | Pass | Trusted host requests returned `200`, `text/calendar`, and an `ETag`; conditional refresh returned `304`. |
| Node and Caddy restart | Pass | The persisted URL and Caddy CA remained unchanged and the feed returned `200` after both processes restarted. |
| Delete and register the same URL again | Pass | The original iPhone subscription was removed, the same retained URL was registered again, and the calendar loaded. |
| Capability rotation | Pass | The previous URL returned a generic `404`; the replacement URL returned `200` and was accepted as a new iPhone subscription. |
| Capability revocation | Pass | The active URL returned a generic `404`; after deleting the cached iPhone subscription, registration with that revoked URL failed. |
| Explicit reactivation | Pass | Rotating the revoked feed preserved its feed identity, issued another URL, kept the revoked URL at `404`, and restored successful iPhone subscription. |
| Latest active URL retry | Pass | After an earlier failed registration attempt, the operator confirmed that the latest active URL could be subscribed to normally. |
| Host-side same-URL content update | Pass | The retained URL file stayed unchanged while the source refresh changed the feed from 601 to 602 events; restart preserved the new ETag, UID, and sequence. |
| Secret-file permissions | Pass | The local administrator key, SQLite database, retained URL file, and Caddy CA private key were mode `0600`. |

## Remaining Client QA

1. Leave the current iPhone subscription registered and verify that its
   background poll displays the newly added source event without deleting or
   re-registering the URL; record the observed latency.
2. Cancel that event and verify cancellation behavior in the client.
3. Capture the iPhone model, iOS version, calendar app, timestamps, and observed
   refresh latency in the final device matrix.

Superseded and revoked URLs must not be reused or published. The local runtime
retains only the currently active URL needed for the next same-URL update drill.
