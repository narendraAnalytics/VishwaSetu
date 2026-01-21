import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as NavigationBar from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export default function HomeScreen() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();

  // Auto-hide home icon state
  const homeIconVisible = useSharedValue(0); // 0 = hidden, 1 = visible
  const hideTimerRef = useRef<number | null>(null);

  // Feature icon animations (staggered entrance)
  const icon1Scale = useSharedValue(0);
  const icon2Scale = useSharedValue(0);
  const icon3Scale = useSharedValue(0);
  const icon4Scale = useSharedValue(0);

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  // Handle redirection in useEffect to avoid render warnings
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show icon on touch
  const handleTouchStart = useCallback(() => {
    // Show icon
    homeIconVisible.value = withTiming(1, { duration: 300 });

    // Clear existing timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Set new auto-hide timer (3 seconds)
    hideTimerRef.current = setTimeout(() => {
      homeIconVisible.value = withTiming(0, { duration: 300 });
    }, 3000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Trigger staggered entrance animations for feature icons
  useEffect(() => {
    if (isSignedIn) {
      // Reset all icons to invisible/scaled down
      icon1Scale.value = 0;
      icon2Scale.value = 0;
      icon3Scale.value = 0;
      icon4Scale.value = 0;

      // Trigger staggered animations using withDelay
      icon1Scale.value = withTiming(1, { duration: 400 });
      icon2Scale.value = withDelay(150, withTiming(1, { duration: 400 }));
      icon3Scale.value = withDelay(300, withTiming(1, { duration: 400 }));
      icon4Scale.value = withDelay(450, withTiming(1, { duration: 400 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Animated style for home icon
  const homeIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: homeIconVisible.value,
    transform: [
      {
        translateY: withTiming(homeIconVisible.value === 1 ? 0 : 60, {
          duration: 300,
        }),
      },
    ],
  }));

  // Animated styles for feature icons (scale + opacity)
  const icon1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: icon1Scale.value,
    transform: [{ scale: icon1Scale.value }],
  }));

  const icon2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: icon2Scale.value,
    transform: [{ scale: icon2Scale.value }],
  }));

  const icon3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: icon3Scale.value,
    transform: [{ scale: icon3Scale.value }],
  }));

  const icon4AnimatedStyle = useAnimatedStyle(() => ({
    opacity: icon4Scale.value,
    transform: [{ scale: icon4Scale.value }],
  }));

  // Navigate to landing page
  const handleHomePress = useCallback(() => {
    router.push('/(tabs)');
  }, [router]);

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
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        onTouchStart={handleTouchStart}
      >
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
            <Animated.View style={[styles.featureIconContainer, icon1AnimatedStyle]}>
              <MaterialCommunityIcons name="google-classroom" size={32} color="#10B981" />
            </Animated.View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Live Classroom</Text>
              <Text style={styles.featureDescription}>
                Real-time voice interaction for job-specific language learning
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Animated.View style={[styles.featureIconContainer, icon2AnimatedStyle]}>
              <MaterialCommunityIcons name="earth" size={32} color="#10B981" />
            </Animated.View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Cultural Knowledge Hub</Text>
              <Text style={styles.featureDescription}>
                Learn workplace norms and cultural etiquette for your destination
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Animated.View style={[styles.featureIconContainer, icon3AnimatedStyle]}>
              <MaterialCommunityIcons name="camera" size={32} color="#10B981" />
            </Animated.View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Visual Sign Bridge</Text>
              <Text style={styles.featureDescription}>
                Camera-based translation for signs, manuals, and labels
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Animated.View style={[styles.featureIconContainer, icon4AnimatedStyle]}>
              <MaterialCommunityIcons name="alert-circle" size={32} color="#10B981" />
            </Animated.View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Emergency Quick-Help</Text>
              <Text style={styles.featureDescription}>
                Critical phrases for safety and urgent situations
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Auto-hiding Navigation Icons */}
      <Animated.View style={[styles.iconsContainer, homeIconAnimatedStyle]}>
        <Pressable style={styles.iconButton} onPress={handleHomePress}>
          <Ionicons name="home" size={28} color="#FFFFFF" />
        </Pressable>

        <Pressable style={styles.iconButton}>
          <MaterialCommunityIcons name="clock-outline" size={28} color="#FFFFFF" />
        </Pressable>

        <Pressable style={styles.iconButton}>
          <MaterialCommunityIcons name="phone" size={28} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
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
    color: '#10B981',
    marginBottom: 8,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FFFB',
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
    color: '#10B981',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
  },
  wrapper: {
    flex: 1,
    backgroundColor: '#F0FFF4',
  },
  iconsContainer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    alignSelf: 'center',
    zIndex: 100,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',  // Emerald Green
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
