import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect, useState } from 'react';

export default function HomeScreen() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // During sign-out, show a loading state
  if (isSigningOut) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Signing out...</Text>
      </View>
    );
  }

  // After sign-out completes and auth state updates, redirect to sign-in
  if (!isSignedIn) {
    router.replace('/(auth)/sign-in');
    return null;
  }

  const username = user?.username || user?.firstName || 'Learner';
  const initials = username.substring(0, 2).toUpperCase();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      // Wait a moment for Clerk to update, then reset flag to trigger redirect
      setTimeout(() => {
        setIsSigningOut(false);
      }, 100);
    } catch (err) {
      console.error('Sign out error:', err);
      setIsSigningOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome {username}!</Text>
        </View>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={24} color="#10B981" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Explore Features</Text>

        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <MaterialCommunityIcons name="google-classroom" size={32} color="#10B981" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Live Classroom</Text>
            <Text style={styles.featureDescription}>
              Real-time voice interaction for job-specific language learning
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <MaterialCommunityIcons name="earth" size={32} color="#10B981" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Cultural Knowledge Hub</Text>
            <Text style={styles.featureDescription}>
              Learn workplace norms and cultural etiquette for your destination
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <MaterialCommunityIcons name="camera" size={32} color="#10B981" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Visual Sign Bridge</Text>
            <Text style={styles.featureDescription}>
              Camera-based translation for signs, manuals, and labels
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <MaterialCommunityIcons name="alert-circle" size={32} color="#10B981" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Emergency Quick-Help</Text>
            <Text style={styles.featureDescription}>
              Critical phrases for safety and urgent situations
            </Text>
          </View>
        </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#11181C',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  signOutText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    color: '#687076',
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FFF4',
    borderWidth: 3,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
  },
  featuresContainer: {
    gap: 16,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 8,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
  },
});
