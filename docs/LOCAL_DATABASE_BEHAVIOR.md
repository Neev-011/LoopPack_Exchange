# Why Local JSON Files Change

Your website is connected to Neon, confirmed by `/api/v1/health`:

```json
"neonDatabaseConnected": true
```

But the code still intentionally writes local JSON files:

- [authService.js](../backend/src/services/authService.js): registration, profile updates, and password changes always save to `backend/data/users.json`, even when Neon is connected.
- [app.js](../backend/src/app.js): creating a truck always calls `saveLocalTruck()`, so `backend/data/trucks.json` is updated as a local mirror.
- Listings and orders use local JSON only when Neon is unavailable or the request uses a fallback path.

So the local files changing is expected from the current implementation, not proof that Neon is disconnected. The recent timestamps confirm this: `users.json` and `trucks.json` were modified while the API reported Neon active.

To make Neon the only persistent database, the local writes in the authentication and truck creation paths need to be removed or restricted to `if (!client)` fallback branches.
