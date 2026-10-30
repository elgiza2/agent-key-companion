# Reference: expo-dynamic-notifications (rit3zh)

Source: https://github.com/rit3zh/expo-dynamic-notifications (MIT, v2026-09)
React Native library — "Dynamic Island style" in-app notifications. Our web port
lives in `src/components/notifications/DynamicNotifications.tsx`.

## Design geometry (from the library README)
- islandWidth 126, islandHeight 37.33, islandTop from safe area
- gap 34 between island and card
- cardHeight 74, cardRadius = cardHeight / 2 (= 37)
- cardWidth = min(width - 32, 396)
- shadowColor rgba(16, 19, 28, 0.20)
- goo strength 0.62 -> blur radius; alpha gain 22; alpha threshold 0.43
- default duration 3600 ms (null = stays until dismissed)
- anatomy: Gooey (Skia island + neck + droplet) -> Content (card, blur, gesture) -> Body

## API we mirrored
- `<DynamicNotifications duration onDismiss accent>` wrapping the app
- `useDynamicNotifications()` -> `{ trigger, dismiss, isVisible, notification }`
- notification fields: title, message, avatar, symbol, accent, duration, onPress, render, id
