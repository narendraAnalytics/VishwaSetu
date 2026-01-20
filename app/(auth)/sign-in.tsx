import { View, Text, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { OAuthButton } from '@/components/auth/OAuthButton';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startGitHubOAuth } = useOAuth({ strategy: 'oauth_github' });
  const { startOAuthFlow: startLinkedInOAuth } = useOAuth({ strategy: 'oauth_linkedin_oidc' });

  const handleOAuthSignIn = async (
    startOAuthFlow: any,
    provider: string
  ) => {
    try {
      setLoadingProvider(provider);
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(tabs)/home', { scheme: 'vishwasetu' }),
      });

      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace('/(tabs)/home');
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

  return (
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
        <Link href="/(auth)/sign-up">
          <Text style={styles.linkText}>Sign up</Text>
        </Link>
      </View>
    </ScrollView>
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
