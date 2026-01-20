import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type OAuthButtonProps = {
  provider: 'google' | 'github' | 'linkedin';
  onPress: () => void;
  loading?: boolean;
};

export function OAuthButton({ provider, onPress, loading }: OAuthButtonProps) {
  const config = {
    google: {
      label: 'Continue with Google',
      icon: 'google' as const,
      bgColor: '#FFFFFF',
      textColor: '#11181C',
      iconColor: '#4285F4',
    },
    github: {
      label: 'Continue with GitHub',
      icon: 'github' as const,
      bgColor: '#24292E',
      textColor: '#FFFFFF',
      iconColor: '#FFFFFF',
    },
    linkedin: {
      label: 'Continue with LinkedIn',
      icon: 'linkedin' as const,
      bgColor: '#0A66C2',
      textColor: '#FFFFFF',
      iconColor: '#FFFFFF',
    },
  }[provider];

  return (
    <Pressable
      style={[styles.button, { backgroundColor: config.bgColor }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={config.textColor} />
      ) : (
        <>
          <MaterialCommunityIcons
            name={config.icon}
            size={24}
            color={config.iconColor}
          />
          <Text style={[styles.buttonText, { color: config.textColor }]}>
            {config.label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
