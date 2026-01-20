app /auth/sign-in.tsx:

import OAuthButton from '@/components/OAuthButton';
import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import *as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import* as WebBrowser from 'expo-web-browser';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const googleOAuth = useOAuth({ strategy: 'oauth_google' });
  const githubOAuth = useOAuth({ strategy: 'oauth_github' });
  const linkedinOAuth = useOAuth({ strategy: 'oauth_linkedin_oidc' });
  const router = useRouter();

  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loadingProvider, setLoadingProvider] = React.useState<'google' | 'github' | 'linkedin' | null>(null);

  React.useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const signInAttempt = await signIn.create({
        identifier,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Error', 'Sign-in incomplete. Please try again.');
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to sign in');
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github' | 'linkedin') => {
    try {
      setLoadingProvider(provider);

      const oauthFlow = provider === 'google' ? googleOAuth
        : provider === 'github' ? githubOAuth
          : linkedinOAuth;

      const { createdSessionId, setActive: oauthSetActive, signIn: oauthSignIn } = await oauthFlow.startOAuthFlow({
        redirectUrl: Linking.createURL('/(auth)/sign-in', { scheme: 'skinveda' }),
      });

      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Error', 'OAuth sign-in incomplete');
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'OAuth sign-in failed');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={identifier}
            placeholder="Email or Username"
            placeholderTextColor="rgba(232, 180, 184, 0.5)"
            onChangeText={setIdentifier}
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            value={password}
            placeholder="Password"
            placeholderTextColor="rgba(232, 180, 184, 0.5)"
            secureTextEntry={true}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={onSignInPress}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <OAuthButton
            provider="google"
            onPress={() => handleOAuthSignIn('google')}
            disabled={loadingProvider !== null}
            loading={loadingProvider === 'google'}
          />
          <OAuthButton
            provider="github"
            onPress={() => handleOAuthSignIn('github')}
            disabled={loadingProvider !== null}
            loading={loadingProvider === 'github'}
          />
          <OAuthButton
            provider="linkedin"
            onPress={() => handleOAuthSignIn('linkedin')}
            disabled={loadingProvider !== null}
            loading={loadingProvider === 'linkedin'}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#E8B4B8',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A7C8C',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#E8B4B8',
    borderWidth: 1,
    borderColor: 'rgba(232, 180, 184, 0.2)',
  },
  button: {
    backgroundColor: '#E8B4B8',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 35,
    marginTop: 10,
    shadowColor: '#E8B4B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: 'rgba(232, 180, 184, 0.7)',
    fontSize: 14,
  },
  link: {
    color: '#E8B4B8',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(232, 180, 184, 0.3)',
  },
  dividerText: {
    color: '#4A7C8C',
    fontSize: 14,
    marginHorizontal: 10,
  },
})
--------------------------------------

app /auth/layout.tsx

import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}

-----------------------------------------------

app/auth/signup.tsx

import OAuthButton from '@/components/OAuthButton';
import { useOAuth, useSignUp } from '@clerk/clerk-expo';
import *as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import* as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const googleOAuth = useOAuth({ strategy: 'oauth_google' });
  const githubOAuth = useOAuth({ strategy: 'oauth_github' });
  const linkedinOAuth = useOAuth({ strategy: 'oauth_linkedin_oidc' });
  const router = useRouter();

  const [username, setUsername] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [loadingProvider, setLoadingProvider] = React.useState<'google' | 'github' | 'linkedin' | null>(null);
  const [oauthSignUpData, setOauthSignUpData] = React.useState<any>(null);
  const [showUsernameModal, setShowUsernameModal] = React.useState(false);
  const [oauthUsername, setOauthUsername] = React.useState('');

  React.useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        username,
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to sign up');
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Error', 'Verification incomplete. Please try again.');
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Verification failed');
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github' | 'linkedin') => {
    try {
      setLoadingProvider(provider);

      const oauthFlow = provider === 'google' ? googleOAuth
        : provider === 'github' ? githubOAuth
          : linkedinOAuth;

      const { createdSessionId, setActive: oauthSetActive, signUp: oauthSignUp } = await oauthFlow.startOAuthFlow({
        redirectUrl: Linking.createURL('/(auth)/sign-up', { scheme: 'skinveda' }),
      });

      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId });
        router.replace('/');
      } else if (oauthSignUp) {
        // Store signUp object and show username modal
        setOauthSignUpData(oauthSignUp);
        setShowUsernameModal(true);
      } else {
        Alert.alert('Error', 'OAuth sign-up incomplete');
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'OAuth sign-up failed');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoadingProvider(null);
    }
  };

  const completeOAuthSignUp = async () => {
    if (!oauthSignUpData) return;

    try {
      // Update sign-up with username
      const result = await oauthSignUpData.update({
        username: oauthUsername,
      });

      // Check if signup is complete
      if (result?.status === 'complete' && result.createdSessionId && setActive) {
        await setActive({ session: result.createdSessionId });
        setShowUsernameModal(false);
        router.replace('/');
      } else {
        Alert.alert('Error', 'Failed to complete sign-up');
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to complete profile');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoadingProvider(null);
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.formContainer}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            Enter the verification code sent to {emailAddress}
          </Text>
          <TextInput
            style={styles.input}
            value={code}
            placeholder="Enter verification code"
            placeholderTextColor="rgba(232, 180, 184, 0.5)"
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.button} onPress={onVerifyPress}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Skinveda today</Text>

          <OAuthButton
            provider="google"
            onPress={() => handleOAuthSignUp('google')}
            disabled={loadingProvider !== null}
            loading={loadingProvider === 'google'}
          />
          <OAuthButton
            provider="github"
            onPress={() => handleOAuthSignUp('github')}
            disabled={loadingProvider !== null}
            loading={loadingProvider === 'github'}
          />
          <OAuthButton
            provider="linkedin"
            onPress={() => handleOAuthSignUp('linkedin')}
            disabled={loadingProvider !== null}
            loading={loadingProvider === 'linkedin'}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={username}
            placeholder="Username"
            placeholderTextColor="rgba(232, 180, 184, 0.5)"
            onChangeText={setUsername}
          />

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Email"
            placeholderTextColor="rgba(232, 180, 184, 0.5)"
            onChangeText={setEmailAddress}
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            value={password}
            placeholder="Password"
            placeholderTextColor="rgba(232, 180, 184, 0.5)"
            secureTextEntry={true}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={onSignUpPress}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>

      {/* OAuth Username Modal */}
      <Modal
        visible={showUsernameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Prevent closing by back button while loading
          if (loadingProvider === null) {
            setShowUsernameModal(false);
            setOauthUsername('');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Your Profile</Text>
            <Text style={styles.modalSubtitle}>
              Choose a username for your account
            </Text>

            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={oauthUsername}
              placeholder="Username"
              placeholderTextColor="rgba(232, 180, 184, 0.5)"
              onChangeText={setOauthUsername}
              editable={loadingProvider === null}
              maxLength={30}
            />

            <TouchableOpacity
              style={[styles.button, loadingProvider !== null && styles.buttonLoading]}
              onPress={completeOAuthSignUp}
              disabled={!oauthUsername.trim() || loadingProvider !== null}
            >
              {loadingProvider !== null ? (
                <ActivityIndicator size="small" color="#E8B4B8" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {loadingProvider === null && (
              <TouchableOpacity onPress={() => {
                setShowUsernameModal(false);
                setOauthUsername('');
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#E8B4B8',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A7C8C',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#E8B4B8',
    borderWidth: 1,
    borderColor: 'rgba(232, 180, 184, 0.2)',
  },
  button: {
    backgroundColor: '#E8B4B8',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 35,
    marginTop: 10,
    shadowColor: '#E8B4B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: 'rgba(232, 180, 184, 0.7)',
    fontSize: 14,
  },
  link: {
    color: '#E8B4B8',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(232, 180, 184, 0.3)',
  },
  dividerText: {
    color: '#4A7C8C',
    fontSize: 14,
    marginHorizontal: 10,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#F5F3EF',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#E8B4B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4A7C8C',
    marginBottom: 20,
    textAlign: 'center',
  },
  cancelText: {
    color: 'rgba(232, 180, 184, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
  },
  buttonLoading: {
    opacity: 0.7,
  },
});
