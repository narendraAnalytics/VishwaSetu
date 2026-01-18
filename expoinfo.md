# SplashScreen

_A library that provides access to controlling the visibility behavior of native splash screen._

Available on platforms android, ios, tvos

The `SplashScreen` module from the `expo-splash-screen` library provides control over the native splash screen behavior. By default, the splash screen will automatically hide when your app is ready, but you can also manually control its visibility for advanced use cases.

> From **SDK 52**, due to changes supporting the latest Android splash screen API, Expo Go and development builds cannot fully replicate the splash screen experience your users will see in your [standalone app](https://docs.expo.dev/more/glossary-of-terms/#standalone-app). Expo Go will show your app icon instead of the splash screen, and the splash screen on development builds will not reflect all properties set in the config plugin. **It is highly recommended that you test your splash screen on a release build to ensure it looks as expected.**

Also, see the guide on [creating a splash screen image](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/#splash-screen), or [quickly generate an icon and splash screen using your browser](https://buildicon.netlify.app/).

## Installation

```bash
npx expo install expo-splash-screen
```

If you are installing this in an existing React Native app, make sure to install `expo` in your project.

## Usage

For most apps, you don't need to do anything special with the splash screen. It will automatically hide when your app is ready. You can optionally configure animation options:

```tsx app/_layout.tsx
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function RootLayout() {
  return <Stack />;
}
```

```tsx App.tsx
import { Text, View } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import * as SplashScreen from 'expo-splash-screen';

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>SplashScreen Demo! 👋</Text>
      <Entypo name="rocket" size={30} />
    </View>
  );
}
```

### Delay hiding the splash screen

In some cases, it may be necessary to delay hiding the splash screen until certain resources are loaded. For example, if you need to load API data before displaying the app content, you can use `preventAutoHideAsync()` to manually control when the splash screen hides. The goal should be to hide the splash screen as soon as possible.

```tsx app/_layout.tsx
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function doAsyncStuff() {
      try {
        // do something async here
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    doAsyncStuff();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hide();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <Stack />;
}
```

```tsx App.tsx
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function doAsyncStuff() {
      try {
        // do something async here
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    doAsyncStuff();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>SplashScreen Demo! 👋</Text>
      <Entypo name="rocket" size={30} />
    </View>
  );
}
```

## Configuration

You can configure `expo-splash-screen` using its built-in [config plugin](https://docs.expo.dev/config-plugins/introduction/) if you use config plugins in your project ([Continuous Native Generation (CNG)](https://docs.expo.dev/workflow/continuous-native-generation/)). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect. If your app does **not** use CNG, then you'll need to manually configure the library.

**Using the config plugin, as shown below, is the recommended method for configuring the splash screen.** The other methods are now considered legacy and will be removed in the future.

```json app.json
{
  "expo": {
    "plugins": [
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#232323",
          "image": "./assets/splash-icon.png",
          "dark": {
            "image": "./assets/splash-icon-dark.png",
            "backgroundColor": "#000000"
          },
          "imageWidth": 200
        }
      ]
    ],
  }
}
```

### Configurable properties

| Name | Default | Description |
| --- | --- | --- |
| `backgroundColor` | `#ffffff` | A hex color string representing the background color of the splash screen. |
| `image` | `undefined` | The path to the image file that will be displayed on the splash screen. This should be your app icon or logo. |
| `enableFullScreenImage_legacy` | `false` | Only for: ios. Enabling this property allows using a full screen image as the splashscreen. This is to help with the transition from the legacy splash screen configuration and will be removed in the future. |
| `dark` | `undefined` | An object containing properties for configuring the splash screen when the device is in dark mode. |
| `imageWidth` | `100` | The width to make the image. |
| `android` | `undefined` | An object containing properties for configuring the splash screen on Android. |
| `ios` | `undefined` | An object containing properties for configuring the splash screen on iOS. |
| `resizeMode` | `undefined` | Determines how the image is scaled to fit the container defined by `imageWidth`. Possible values: `contain`, `cover`, or `native`. |

You can also configure `expo-splash-screen`, using the following [app config](https://docs.expo.dev/workflow/configuration/) properties but the config plugin should be preferred.

- [`splash`](../config/app/#splash)
- [`android.splash`](../config/app/#splash-2)
- [`ios.splash`](../config/app/#splash-1)

<ConfigReactNative>

See how to configure the native projects in the [installation instructions in the `expo-splash-screen` repository](https://github.com/expo/expo/tree/main/packages/expo-splash-screen#-installation-in-bare-react-native-projects).

</ConfigReactNative>

### Animating the splash screen

`SplashScreen` provides an out-of-the-box fade animation. It can be configured using the `setOptions` method.

```tsx
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});
```

If you prefer to use custom animation, see the [`with-splash-screen`](https://github.com/expo/examples/tree/master/with-splash-screen) example on how to apply any arbitrary animations to your splash screen. You can initialize a new project from this example by running `npx create-expo-app --example with-splash-screen`.

## API

```tsx
import * as SplashScreen from 'expo-splash-screen';
```

## API: expo-splash-screen

### SplashScreen Methods

#### hide (_Function_)

- `hide()`
  Hides the native splash screen immediately. Be careful to ensure that your app has content ready
  to display when you hide the splash screen, or you may see a blank screen briefly. See the
  ["Usage"](#usage) section for an example.

#### hideAsync (_Function_)

- `hideAsync(): Promise<void>`
  Hides the native splash screen immediately. This method is provided for backwards compatability. See the
  ["Usage"](#usage) section for an example.

#### preventAutoHideAsync (_Function_)

- `preventAutoHideAsync(): Promise<boolean>`
  Makes the native splash screen (configured in `app.json`) remain visible until `hideAsync` is called.

  > **Important note**: It is recommended to call this in global scope without awaiting, rather than
  > inside React components or hooks, because otherwise this might be called too late,
  > when the splash screen is already hidden.
  Example:

  ```ts
  import * as SplashScreen from 'expo-splash-screen';

  SplashScreen.preventAutoHideAsync();

  export default function App() {
   // ...
  }
  ```

#### setOptions (_Function_)

- `setOptions(options: SplashScreenOptions)`
  Configures the splashscreens default animation behavior.

  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` | SplashScreenOptions | - |

### Types

#### SplashScreenOptions (_Type_)

| Property | Type | Description |
| --- | --- | --- |
| `duration` _(optional)_ | number | The duration of the fade out animation in milliseconds. Default: `400` |
| `fade` _(optional)_ | boolean | Whether to hide the splash screen with a fade out animation. Default: `false` Available on platform: ios |
