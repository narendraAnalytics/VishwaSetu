import { OAuthButton } from '@/components/auth/OAuthButton';
import { UsernameModal } from '@/components/auth/UsernameModal';
import { useAuth, useOAuth, useSignUp } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signUp, isLoaded: isSignUpLoaded, setActive: setSignUpActive } = useSignUp();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [oauthSetActive, setOauthSetActive] = useState<any>(null);

  // States for Username Modal (New User Flow)
  const [oauthUsername, setOAuthUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startGitHubOAuth } = useOAuth({ strategy: 'oauth_github' });
  const { startOAuthFlow: startLinkedInOAuth } = useOAuth({ strategy: 'oauth_linkedin_oidc' });

  // Redirect if already signed in
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthLoaded, isSignedIn]);

  const handleOAuthSignIn = async (
    startOAuthFlow: any,
    provider: string
  ) => {
    try {
      setLoadingProvider(provider);
      const { createdSessionId, signUp: oauthSignUp, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(auth)/sign-in', { scheme: 'vishwasetu' }),
      });

      // EXISTING USER: If createdSessionId exists, they are logged in
      if (createdSessionId && setActive) {
        console.log('EXISTING USER DETECTED - Activating session');
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)/home');
        return;
      }

      // NEW USER: If no session but signUp exists, they need to complete profile
      if (oauthSignUp) {
        console.log('NEW USER DETECTED - Showing username modal');
        setOauthSetActive(() => setActive);
        setShowUsernameModal(true);
        return;
      }
    } catch (err: any) {
      console.error(`OAuth error (${provider}):`, err);
      if (err.code === 'session_exists') {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Sign In Failed', 'Please try again or use a different method.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const completeOAuthSignUp = async () => {
    if (!isSignUpLoaded || !signUp || !oauthUsername.trim()) {
      Alert.alert('Error', 'Sign-up session not found. Please try again.');
      return;
    }

    try {
      setUsernameLoading(true);
      console.log('Attempting to update username:', oauthUsername.trim());

      const result = await signUp.update({
        username: oauthUsername.trim(),
      });

      console.log('Update result status:', result.status);
      console.log('Update result session:', result.createdSessionId);
      console.log('Main signUp hook status:', signUp.status);
      console.log('Main signUp hook session:', signUp.createdSessionId);

      // Check for completion in either the result or the main hook
      const isComplete = result.status === 'complete' || signUp.status === 'complete';
      const sessionId = result.createdSessionId || signUp.createdSessionId;

      if (isComplete && sessionId) {
        console.log('Sign-up complete. Activating session:', sessionId);

        // Use the most reliable setActive function
        const activeFn = oauthSetActive || setSignUpActive;

        if (activeFn) {
          await activeFn({ session: sessionId });
          setShowUsernameModal(false);
          router.replace('/(tabs)/home');
        } else {
          console.error('No setActive function available');
          Alert.alert('Success', 'Profile created! Please sign in now.');
          setShowUsernameModal(false);
          router.replace('/(auth)/sign-in');
        }
      } else {
        const finalStatus = result.status || signUp.status;
        console.log('Sign-up incomplete. Final Status:', finalStatus);

        Alert.alert(
          'Incomplete Profile',
          `Status: ${finalStatus || 'unknown'}. Please try again.`
        );
      }
    } catch (err: any) {
      console.error('Username update error:', err);
      const errorMessage = err.errors?.[0]?.message || 'Failed to save username. Please try again.';

      if (err.errors?.[0]?.code === 'form_identifier_exists') {
        Alert.alert('Username Taken', 'Please choose a different username.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleCancelUsername = () => {
    setShowUsernameModal(false);
    setOAuthUsername('');
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Image
            source={require('../../public/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Join the World - Learn Global Languages</Text>
        </View>

        <View style={styles.buttonContainer}>
          <OAuthButton
            provider="google"
            onPress={() => handleOAuthSignIn(startGoogleOAuth, 'google')}
            loading={loadingProvider === 'google'}
          />
          <OAuthButton
            provider="github"
            onPress={() => handleOAuthSignIn(startGitHubOAuth, 'github')}
            loading={loadingProvider === 'github'}
          />
          <OAuthButton
            provider="linkedin"
            onPress={() => handleOAuthSignIn(startLinkedInOAuth, 'linkedin')}
            loading={loadingProvider === 'linkedin'}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={styles.linkText}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>

      <UsernameModal
        visible={showUsernameModal}
        username={oauthUsername}
        onChangeUsername={setOAuthUsername}
        onSubmit={completeOAuthSignUp}
        onCancel={handleCancelUsername}
        loading={usernameLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFF4',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 133,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 30,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#687076',
  },
  linkText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
});
