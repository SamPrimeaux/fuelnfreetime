# Admin Profile Popup

Shared account-menu behavior for admin shells. The host owns its account and
store routes; this package owns open/close state, keyboard behavior, focus, and
viewport-safe placement.

```js
import { mountProfilePopups } from "@inneranimalmedia/admin-profile-popup";
mountProfilePopups(document);
```

Triggers use `data-profile-menu-toggle` and reference a `data-profile-menu`
element in the same `data-profile-popup-root` container.
