import { useUser } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as NavigationBar from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  // Handle redirection in useEffect to avoid render warnings
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  const username = user?.username || user?.firstName || 'Learner';
  const initials = username.substring(0, 2).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Pressable
        style={styles.avatarContainer}
        onPress={() => router.push('/(tabs)/profile')}
      >
        {user?.imageUrl ? (
          <Image
            source={{ uri: user.imageUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </Pressable>

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
