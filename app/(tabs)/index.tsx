import { useAuth, useUser } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as NavigationBar from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Banner images
const BANNERS = [
  require('../../public/images/bannerimage.png'),
  require('../../public/images/bannerimage1.png'),
  require('../../public/images/bannerimage2.png'),
  require('../../public/images/bannerimage3.png'),
];

// Button language translations with pastel backgrounds and readable text
const LANGUAGES = [
  {
    text: 'Join the World',
    backgroundColor: '#E0F2FE',  // Light Sky Blue
    textColor: '#0C4A6E',        // Dark Blue
  },
  {
    text: 'Rejoignez le Monde',
    backgroundColor: '#FEF3C7',  // Light Amber/Cream
    textColor: '#92400E',        // Dark Amber/Brown
  },
  {
    text: 'Únete al Mundo',
    backgroundColor: '#FCE7F3',  // Light Pink/Rose
    textColor: '#9F1239',        // Dark Rose/Red
  },
  {
    text: 'Присоединяйтесь к Миру',
    backgroundColor: '#EDE9FE',  // Light Lavender
    textColor: '#5B21B6',        // Dark Purple
  },
  {
    text: '加入世界',
    backgroundColor: '#FFEDD5',  // Light Peach/Orange
    textColor: '#C2410C',        // Dark Orange
  },
];

export default function LandingScreen() {
  // State for current image index and pagination dots
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State for current language index
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);

  // Router for navigation
  const router = useRouter();

  // Auth check
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  // Shared value for button text fade animation
  const textOpacity = useSharedValue(1);

  // Shared values for welcome message animation
  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateX = useSharedValue(-50);

  // Animated style for fade transition
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  // Animated style for welcome message
  const welcomeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [{ translateX: welcomeTranslateX.value }],
  }));

  // Hide navigation bar on mount
  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  // Animate welcome message when user signs in (repeats 3 times, then stays visible)
  useEffect(() => {
    if (isSignedIn) {
      // Repeat slide in/out 2 times, then final slide in (stays visible)
      welcomeOpacity.value = withSequence(
        withRepeat(
          withTiming(1, { duration: 600 }),
          2, // repeat 2 times (in/out/in/out = 4 phases)
          true // reverse (fade out after fade in)
        ),
        withTiming(1, { duration: 600 }) // final fade in (stays)
      );

      welcomeTranslateX.value = withSequence(
        withRepeat(
          withTiming(0, { duration: 600 }),
          2, // repeat 2 times (in/out/in/out = 4 phases)
          true // reverse (slide back after slide in)
        ),
        withTiming(0, { duration: 600 }) // final slide in (stays)
      );
    } else {
      // Reset animation when user signs out
      welcomeOpacity.value = 0;
      welcomeTranslateX.value = -50;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Transition to next image
  const transitionToNext = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % 4);
  }, []);

  // Handle button press - navigate to dashboard if signed in, else to sign-in
  const handleJoinPress = useCallback(() => {
    if (isSignedIn) {
      router.push('/(tabs)/home');
    } else {
      router.push('/(auth)/sign-in');
    }
  }, [router, isSignedIn]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      transitionToNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [transitionToNext]);

  // Fade animation when language changes
  useEffect(() => {
    // Fade out
    textOpacity.value = withTiming(0, { duration: 200 }, () => {
      // After fade out completes, fade back in
      textOpacity.value = withTiming(1, { duration: 200 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguageIndex]);

  // Auto-advance button language every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLanguageIndex((prev) => (prev + 1) % 5);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Full-screen banner images */}
      {BANNERS.map((banner, index) => (
        <Animated.View
          key={index}
          style={[
            styles.imageContainer,
            {
              opacity: currentImageIndex === index ? 1 : 0,
            },
          ]}
        >
          <Image
            source={banner}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      ))}

      {/* Sign Out Button - Top Right (only when authenticated) */}
      {isSignedIn && (
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={28} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Welcome Message - Center Left (only when authenticated) */}
      {isSignedIn && (
        <Animated.View style={[styles.welcomeContainer, welcomeAnimatedStyle]}>
          <Text style={styles.welcomeText}>
            Welcome {user?.username || user?.firstName || 'Learner'}!
          </Text>
        </Animated.View>
      )}

      {/* Join the World Button */}
      <Pressable
        style={[
          styles.joinButton,
          { backgroundColor: LANGUAGES[currentLanguageIndex].backgroundColor },
        ]}
        onPress={handleJoinPress}
      >
        <MaterialCommunityIcons
          name="translate"
          size={24}
          color={LANGUAGES[currentLanguageIndex].textColor}
        />
        <Animated.Text
          style={[
            styles.joinButtonText,
            animatedTextStyle,
            { color: LANGUAGES[currentLanguageIndex].textColor },
          ]}
        >
          {LANGUAGES[currentLanguageIndex].text}
        </Animated.Text>
      </Pressable>

      {/* Pagination dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  currentImageIndex === index
                    ? '#10B981'
                    : 'rgba(16, 185, 129, 0.3)',
                width: currentImageIndex === index ? 10 : 8,
                height: currentImageIndex === index ? 10 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFF4',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },
  joinButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  welcomeContainer: {
    position: 'absolute',
    left: 20,
    top: '35%',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F0FFF4',  // Fresh Mint - matches app background
  },
});
