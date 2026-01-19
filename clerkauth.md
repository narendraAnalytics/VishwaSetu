npm install @clerk/clerk-expo

EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=

//app/_layout.tsx

import { ClerkProvider } from '@clerk/clerk-expo'
import { Slot } from 'expo-router'

function RootLayoutNav() {
  return (
    <ClerkProvider>
      <Slot />
    </ClerkProvider>
  )
}

// terminal
npm install expo-secure-store

// terminal

npm install expo-secure-store

Update your root layout to use the secure token cache:
app/_layout.tsx

import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { Slot } from 'expo-router'

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <Slot />
    </ClerkProvider>
  )
}

//app/(auth)/_layout.tsx

import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href={'/'} />
  }

  return <Stack />
}

// app/(auth)/sign-up.tsx

import * as React from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSignUp } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        emailAddress,
        password,
      })

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      setPendingVerification(true)
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      })

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId })
        router.replace('/')
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signUpAttempt, null, 2))
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }

  if (pendingVerification) {
    return (
      <>
        <Text>Verify your email</Text>
        <TextInput
          value={code}
          placeholder="Enter your verification code"
          onChangeText={(code) => setCode(code)}
        />
        <TouchableOpacity onPress={onVerifyPress}>
          <Text>Verify</Text>
        </TouchableOpacity>
      </>
    )
  }

  return (
    <View>
      <>
        <Text>Sign up</Text>
        <TextInput
          autoCapitalize="none"
          value={emailAddress}
          placeholder="Enter email"
          onChangeText={(email) => setEmailAddress(email)}
        />
        <TextInput
          value={password}
          placeholder="Enter password"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
        />
        <TouchableOpacity onPress={onSignUpPress}>
          <Text>Continue</Text>
        </TouchableOpacity>
        <View style={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
          <Text>Already have an account?</Text>
          <Link href="/sign-in">
            <Text>Sign in</Text>
          </Link>
        </View>
      </>
    </View>
  )
}

// /app/(auth)/sign-in.tsx

import { useSignIn } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import React from 'react'

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        router.replace('/')
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps.
        console.error(JSON.stringify(signInAttempt, null, 2))
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }

  return (
    <View>
      <Text>Sign in</Text>
      <TextInput
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Enter email"
        onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
      />
      <TextInput
        value={password}
        placeholder="Enter password"
        secureTextEntry={true}
        onChangeText={(password) => setPassword(password)}
      />
      <TouchableOpacity onPress={onSignInPress}>
        <Text>Continue</Text>
      </TouchableOpacity>
      <View style={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
        <Link href="/sign-up">
          <Text>Sign up</Text>
        </Link>
      </View>
    </View>
  )
}

// app/components/SignOutButton.tsx

import { useClerk } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { Text, TouchableOpacity } from 'react-native'

export const SignOutButton = () => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk()
  const handleSignOut = async () => {
    try {
      await signOut()
      // Redirect to your desired page
      Linking.openURL(Linking.createURL('/'))
    } catch (err) {
      // See <https://clerk.com/docs/custom-flows/error-handling>
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }
  return (
    <TouchableOpacity onPress={handleSignOut}>
      <Text>Sign out</Text>
    </TouchableOpacity>
  )
}

steps :

1 . 1
Install @clerk/clerk-expo
The Clerk Expo SDK gives you access to prebuilt components, hooks, and helpers to make user authentication easier.

Run the following command to install the SDK: npm install @clerk/clerk-expo

2 . 2
Set your Clerk API keys
Add your Clerk Publishable Key to your .env file or create the file if it doesn't exist. Retrieve these keys anytime from the API keys page.

3 . Add <ClerkProvider> to your root layout
The ClerkProvidercomponent provides session and user context to Clerk's hooks and components. It's recommended to wrap your entire app at the entry point with ClerkProvider to make authentication globally accessible. See the reference docs for other configuration options.

4 .Configure the Token Cache with Expo
Clerk stores the active user's session token in memory by default. In Expo apps, the recommended way to store sensitive data, such as tokens, is by using expo-secure-store which encrypts the data before storing it.

5 . Protect your auth routes in the layout
Clerk currently only supports control components for Expo native. UI components are only available for Expo web. Instead, you must build custom flows using Clerk's API. The following sections demonstrate how to build custom email/password sign-up and sign-in flows. If you want to use different authentication methods, such as passwordless or OAuth, see the dedicated custom flow guides.

First, protect your sign-up and sign-in pages. Create a new route group (auth) with a _layout.tsx file with the following code. The useAuth() hook is used to access the user's authentication state. If the user is already signed in, they will be redirected to the home page.

6 .  Add sign-up page
In the (auth) route group, create a sign-up.tsx file with the following code. The useSignUp() hook is used to create a sign-up flow. The user can sign up using their email and password and will receive an email verification code to confirm their email.

 7 . Add a sign-in page
In the (auth) route group, create a sign-in.tsx file with the following code. The useSignIn() hook is used to create a sign-in flow. The user can sign in using their email and password.

8 . Add a sign-out button
At this point, your users can sign up or in, but they need a way to sign out. In the components/ folder, create a SignOutButton.tsx file with the following code. The useClerk() hook is used to access the signOut() function, which is called when the user clicks the "Sign out" button.

9 . Conditionally render content
You can control which content signed-in and signed-out users can see with Clerk's prebuilt components. For this quickstart, you'll use:

<SignedIn>: Children of this component can only be seen while signed in.
<SignedOut>: Children of this component can only be seen while signed out.
To get started, create a (home) route group with a _layout.tsx file with the following code.

------------------------------------------------------------------------------------------------------------------------

---

title: Protect content and read user data
description: Learn how to use Clerk's hooks to protect content and read user
  data in your Expo application.
metadata:
  title: Read session and user data in your Expo app with Clerk
sdk: nextjs, expo, react-router, remix, tanstack-react-start, astro, nuxt
sdkScoped: "true"
canonical: /docs/:sdk:/guides/users/reading
lastUpdated: 2026-01-05T20:10:45.000Z
availableSdks: nextjs,expo,react-router,remix,tanstack-react-start,astro,nuxt
notAvailableSdks: react,js-frontend,chrome-extension,android,ios,expressjs,fastify,go,vue,ruby,js-backend
activeSdk: expo
sourceFile: /docs/guides/users/reading.expo.mdx
---

Clerk offers a comprehensive suite of hooks that expose low-level access to authentication, session management, and multi-tenancy. With Clerk hooks, you can access and manage user data, handle sign-in and sign-up flows, control session management, and implement advanced flows like session reverification for sensitive actions. By using these hooks, you can extend or replace Clerk's built-in components and customize how authentication behaves in your application.

This guide demonstrates how to use the `useAuth()` and `useUser()` hooks to protect content and read user data in your Expo application.

## Session data example

{/*TODO: Keep in sync with _partials/hooks/use-auth*/}

The <SDKLink href="/docs/:sdk:/reference/hooks/use-auth" sdks={["astro","chrome-extension","expo","nextjs","react","react-router","tanstack-react-start"]} code={true}>useAuth()</SDKLink>{{ target: '_blank' }} hook provides information about the current auth state, as well as helper methods to manage the current session.

The following example demonstrates how to use the available properties of the `useAuth()` hook.

```tsx {{ filename: 'components/UseAuthExample.tsx' }}
import { useAuth } from '@clerk/clerk-expo'
import { Text, View, TouchableOpacity } from 'react-native'

export default function UseAuthExample() {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth()

  const fetchExternalData = async () => {
    // Use `getToken()` to get the current user's session token
    const token = await getToken()

    // Use `token` to fetch data from an external API
    const response = await fetch('https://api.example.com/data', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.json()
  }

  // Use `isLoaded` to check if Clerk is loaded
  if (!isLoaded) {
    return <Text>Loading...</Text>
  }

  // Use `isSignedIn` to check if the user is signed in
  if (!isSignedIn) {
    // You could also add a redirect to the sign-in page here
    return <Text>Sign in to view this page</Text>
  }

  return (
    <View>
      <Text>
        Hello, {userId}! Your current active session is {sessionId}.
      </Text>
      <TouchableOpacity onPress={fetchExternalData}>
        <Text>Fetch Data</Text>
      </TouchableOpacity>
    </View>
  )
}
```

## User data example

{/*TODO: Keep in sync with _partials/hooks/use-user*/}

The <SDKLink href="/docs/:sdk:/reference/hooks/use-user" sdks={["chrome-extension","expo","nextjs","react","react-router","tanstack-react-start"]} code={true}>useUser()</SDKLink>{{ target: '_blank' }} hook enables you to access the <SDKLink href="/docs/reference/javascript/user" sdks={["js-frontend"]} code={true}>User</SDKLink> object, which contains the current user's data such as their full name.

The following example demonstrates how to use `useUser()` to check if the user is signed in and display their first name.

```tsx {{ filename: 'src/Example.tsx' }}
import { useUser } from '@clerk/clerk-expo'
import { Text } from 'react-native'

export default function Example() {
  const { isSignedIn, user, isLoaded } = useUser()

  // Use `isLoaded` to check if Clerk is loaded
  if (!isLoaded) {
    return <Text>Loading...</Text>
  }

  // Use `isSignedIn` to protect the content
  if (!isSignedIn) {
    return <Text>Sign in to view this page</Text>
  }

  // Use `user` to access the current user's data
  return <Text>Hello {user.firstName}!</Text>
}
```

----------------------------------------------------------------------------------------------------------

### Authentication System (Clerk)

**Setup:**

- Clerk provider initialized in `app/_layout.tsx` with token caching via `expo-secure-store`
- Backend validates JWT tokens using `@clerk/clerk-sdk-node` middleware
- Environment variables:
  - Frontend: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Backend: `CLERK_SECRET_KEY`
- Deep linking scheme: `skinveda` (for OAuth redirects)

**Supported Authentication Methods:**

1. Email/password with email verification code
2. OAuth providers: Google, GitHub, LinkedIn OIDC

**Critical OAuth Implementation Detail:**

When users sign up via OAuth, Clerk may require additional fields (like username). The custom implementation in `app/(auth)/sign-up.tsx` handles this:

```typescript
// Lines 117-142: completeOAuthSignUp function
// IMPORTANT: After collecting missing fields, call update() directly
const result = await oauthSignUpData.update({ username: oauthUsername });

// Check result.status === 'complete'
// DO NOT call prepareEmailAddressVerification or attemptEmailAddressVerification
// OAuth providers already verify email - additional verification calls will fail
```

**Authentication Hooks:**

- `useUser()` from `@clerk/clerk-expo` - Access user data and `isSignedIn` state
- `useAuth()` from `@clerk/clerk-expo` - Access `signOut()` and `getToken()` methods

**Layout Redirect Patterns:**

```typescript
// app/(auth)/_layout.tsx - Redirect authenticated users home
const { isSignedIn } = useAuth();
useEffect(() => {
  if (isSignedIn) router.replace('/');
}, [isSignedIn]);

// app/(wizard)/_layout.tsx - Redirect unauthenticated users to sign-in
if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

-------------------------------------------------------------------------------------------------------
Protect content and read user data

---
title: Protect content and read user data
description: Learn how to use Clerk's hooks to protect content and read user
  data in your Expo application.
metadata:
  title: Read session and user data in your Expo app with Clerk
sdk: nextjs, expo, react-router, remix, tanstack-react-start, astro, nuxt
sdkScoped: "true"
canonical: /docs/:sdk:/guides/users/reading
lastUpdated: 2026-01-14T13:12:41.000Z
availableSdks: nextjs,expo,react-router,remix,tanstack-react-start,astro,nuxt
notAvailableSdks: react,js-frontend,chrome-extension,android,ios,expressjs,fastify,go,vue,ruby,js-backend
activeSdk: expo
sourceFile: /docs/guides/users/reading.expo.mdx
---

Clerk offers a comprehensive suite of hooks that expose low-level access to authentication, session management, and multi-tenancy. With Clerk hooks, you can access and manage user data, handle sign-in and sign-up flows, control session management, and implement advanced flows like session reverification for sensitive actions. By using these hooks, you can extend or replace Clerk's built-in components and customize how authentication behaves in your application.

This guide demonstrates how to use the `useAuth()` and `useUser()` hooks to protect content and read user data in your Expo application.

## Session data example

{/* TODO: Keep in sync with _partials/hooks/use-auth */}

The <SDKLink href="/docs/:sdk:/reference/hooks/use-auth" sdks={["astro","chrome-extension","expo","nextjs","react","react-router","tanstack-react-start"]} code={true}>useAuth()</SDKLink>{{ target: '_blank' }} hook provides information about the current auth state, as well as helper methods to manage the current session.

The following example demonstrates how to use the available properties of the `useAuth()` hook.

```tsx {{ filename: 'components/UseAuthExample.tsx' }}
import { useAuth } from '@clerk/clerk-expo'
import { Text, View, TouchableOpacity } from 'react-native'

export default function UseAuthExample() {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth()

  const fetchExternalData = async () => {
    // Use `getToken()` to get the current user's session token
    const token = await getToken()

    // Use `token` to fetch data from an external API
    const response = await fetch('https://api.example.com/data', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.json()
  }

  // Use `isLoaded` to check if Clerk is loaded
  if (!isLoaded) {
    return <Text>Loading...</Text>
  }

  // Use `isSignedIn` to check if the user is signed in
  if (!isSignedIn) {
    // You could also add a redirect to the sign-in page here
    return <Text>Sign in to view this page</Text>
  }

  return (
    <View>
      <Text>
        Hello, {userId}! Your current active session is {sessionId}.
      </Text>
      <TouchableOpacity onPress={fetchExternalData}>
        <Text>Fetch Data</Text>
      </TouchableOpacity>
    </View>
  )
}
```

## User data example

{/*TODO: Keep in sync with _partials/hooks/use-user*/}

The <SDKLink href="/docs/:sdk:/reference/hooks/use-user" sdks={["chrome-extension","expo","nextjs","react","react-router","tanstack-react-start"]} code={true}>useUser()</SDKLink>{{ target: '_blank' }} hook enables you to access the <SDKLink href="/docs/reference/javascript/user" sdks={["js-frontend"]} code={true}>User</SDKLink> object, which contains the current user's data such as their full name.

The following example demonstrates how to use `useUser()` to check if the user is signed in and display their first name.

```tsx {{ filename: 'src/Example.tsx' }}
import { useUser } from '@clerk/clerk-expo'
import { Text } from 'react-native'

export default function Example() {
  const { isSignedIn, user, isLoaded } = useUser()

  // Use `isLoaded` to check if Clerk is loaded
  if (!isLoaded) {
    return <Text>Loading...</Text>
  }

  // Use `isSignedIn` to protect the content
  if (!isSignedIn) {
    return <Text>Sign in to view this page</Text>
  }

  // Use `user` to access the current user's data
  return <Text>Hello {user.firstName}!</Text>
}
```
