import { View, Text, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter, Link } from 'expo-router';
import { useState, useEffect } from 'react';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { UsernameModal } from '@/components/auth/UsernameModal';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [oauthSignUpData, setOAuthSignUpData] = useState<any>(null);
  const [oauthSetActive, setOAuthSetActive] = useState<any>(null);
  const [oauthUsername, setOAuthUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startGitHubOAuth } = useOAuth({ strategy: 'oauth_github' });
  const { startOAuthFlow: startLinkedInOAuth } = useOAuth({ strategy: 'oauth_linkedin_oidc' });

  useEffect(() => {
    if (showUsernameModal) {
      console.log('Username modal is now visible');
    }
  }, [showUsernameModal]);

  const handleOAuthSignUp = async (
    startOAuthFlow: any,
    provider: string
  ) => {
    try {
      setLoadingProvider(provider);
      const { createdSessionId, signUp, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(tabs)/home', { scheme: 'vishwasetu' }),
      });

      console.log('OAuth Response:', {
        hasCreatedSessionId: !!createdSessionId,
        hasSignUp: !!signUp,
      });

      // NEW USER: If signUp exists, this is a first-time sign-up
      // ALWAYS show username modal for new users
      if (signUp) {
        console.log('NEW USER DETECTED - Showing username modal');
        setOAuthSignUpData(signUp);
        setOAuthSetActive(setActive);
        setShowUsernameModal(true);
        return;
      }

      // EXISTING USER: If createdSessionId exists but no signUp
      // This is a returning user signing in
      if (createdSessionId) {
        console.log('EXISTING USER DETECTED - Signing in directly');
        await setActive!({ session: createdSessionId });
        router.replace('/(tabs)/home');
        return;
      }

      console.log('UNEXPECTED STATE - No signUp and no createdSessionId');
    } catch (err: any) {
      console.error(`OAuth sign-up error (${provider}):`, err);
      Alert.alert('Sign Up Failed', 'Please try again or use a different method.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const completeOAuthSignUp = async () => {
    if (!oauthSignUpData || !oauthUsername.trim()) return;

    try {
      setUsernameLoading(true);
      const result = await oauthSignUpData.update({
        username: oauthUsername.trim(),
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await oauthSetActive!({ session: result.createdSessionId });
        setShowUsernameModal(false);
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      console.error('Username update error:', err);
      if (err.errors?.[0]?.code === 'form_identifier_exists') {
        Alert.alert('Username Taken', 'Please choose a different username.');
      } else {
        Alert.alert('Error', 'Failed to save username. Please try again.');
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleCancelUsername = () => {
    setShowUsernameModal(false);
    setOAuthUsername('');
    setOAuthSignUpData(null);
    setOAuthSetActive(null);
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
            onPress={() => handleOAuthSignUp(startGoogleOAuth, 'google')}
            loading={loadingProvider === 'google'}
          />
          <OAuthButton
            provider="github"
            onPress={() => handleOAuthSignUp(startGitHubOAuth, 'github')}
            loading={loadingProvider === 'github'}
          />
          <OAuthButton
            provider="linkedin"
            onPress={() => handleOAuthSignUp(startLinkedInOAuth, 'linkedin')}
            loading={loadingProvider === 'linkedin'}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.linkText}>Sign in</Text>
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
