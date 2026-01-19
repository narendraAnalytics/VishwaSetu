import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Flower component with falling animation
function FallingFlower({ iconName, color, delay, duration, startX }: {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  delay: number;
  duration: number;
  startX: number;
}) {
  const translateY = useSharedValue(-50);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Start animation after delay
    setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(height + 50, {
          duration: duration,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      rotate.value = withRepeat(
        withTiming(360, {
          duration: duration * 0.8,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.flowerContainer,
        { left: startX },
        animatedStyle,
      ]}
    >
      <MaterialCommunityIcons name={iconName} size={32} color={color} />
    </Animated.View>
  );
}

export function CustomSplashScreen({
  onFadeComplete,
}: {
  onFadeComplete?: () => void;
}) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const splashOpacity = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 10 });
    logoOpacity.value = withTiming(1, { duration: 800 });

    // Fade out after 2.5 seconds
    setTimeout(() => {
      splashOpacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished && onFadeComplete) {
          runOnJS(onFadeComplete)();
        }
      });
    }, 2500);
  }, [onFadeComplete]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  // Generate flowers with random positions and speeds
  const flowers = [
    { iconName: 'flower' as const, color: '#FF69B4', delay: 0, duration: 5000, startX: width * 0.1 },
    { iconName: 'flower-tulip' as const, color: '#FF1493', delay: 500, duration: 6000, startX: width * 0.25 },
    { iconName: 'spa' as const, color: '#FFB6C1', delay: 1000, duration: 5500, startX: width * 0.5 },
    { iconName: 'flower-outline' as const, color: '#FF69B4', delay: 1500, duration: 6500, startX: width * 0.7 },
    { iconName: 'flower' as const, color: '#FF1493', delay: 2000, duration: 5800, startX: width * 0.85 },
    { iconName: 'flower-tulip' as const, color: '#FFB6C1', delay: 2500, duration: 6200, startX: width * 0.4 },
  ];

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Falling flowers background */}
      {flowers.map((flower, index) => (
        <FallingFlower
          key={index}
          iconName={flower.iconName}
          color={flower.color}
          delay={flower.delay}
          duration={flower.duration}
          startX={flower.startX}
        />
      ))}

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../public/images/splashscreen.png')}
          style={styles.logo}
          contentFit="cover"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F0FFF4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  flowerContainer: {
    position: 'absolute',
    top: -50,
  },
});
