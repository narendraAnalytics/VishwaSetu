import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type UsernameModalProps = {
  visible: boolean;
  username: string;
  onChangeUsername: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function UsernameModal({
  visible,
  username,
  onChangeUsername,
  onSubmit,
  onCancel,
  loading,
}: UsernameModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <MaterialCommunityIcons name="account-circle" size={64} color="#10B981" />

          <Text style={styles.title}>Choose Your Username</Text>
          <Text style={styles.subtitle}>
            This will be your display name on VishwaSetu
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter username"
            value={username}
            onChangeText={onChangeUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />

          <Pressable
            style={[
              styles.submitButton,
              (!username.trim() || loading) && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={!username.trim() || loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Account...' : 'Continue'}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#11181C',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F0FFF4',
    marginBottom: 20,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#687076',
    fontSize: 14,
  },
});
