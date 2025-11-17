// docs/PUSH_NOTIFICATIONS.md

# Push Notifications Setup

## Important: Expo Go Limitations

Push notifications are **not supported in Expo Go** on SDK 53+. You need to create a development build.

### Option 1: Create Development Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure your project
eas build:configure

# Create development build for Android
eas build --profile development --platform android

# Create development build for iOS
eas build --profile development --platform ios