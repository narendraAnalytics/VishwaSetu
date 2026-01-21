import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  if (!isLoaded || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Arrow */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#10B981" />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Photo */}
        <View style={styles.avatarContainer}>
          {user.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {(user.username || user.firstName || 'U').substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Full Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.value}>{user.fullName || 'Not provided'}</Text>
        </View>

        {/* Username */}
        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.username || 'Not provided'}</Text>
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Primary Email</Text>
          <Text style={styles.value}>
            {user.emailAddresses?.[0]?.emailAddress || 'Not provided'}
          </Text>
        </View>

        {/* Connected Accounts */}
        <View style={styles.field}>
          <Text style={styles.label}>Connected Accounts</Text>
          {user.externalAccounts && user.externalAccounts.length > 0 ? (
            user.externalAccounts.map((account, index) => (
              <View key={index} style={styles.accountItem}>
                <Ionicons
                  name={
                    account.provider === 'google' ? 'logo-google' :
                    account.provider === 'github' ? 'logo-github' :
                    account.provider === 'linkedin' ? 'logo-linkedin' :
                    'link'
                  }
                  size={20}
                  color="#10B981"
                />
                <Text style={styles.accountText}>
                  {account.emailAddress || account.username || account.provider}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.value}>No connected accounts</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFF4',  // Fresh Mint
  },
  loadingText: {
    fontSize: 16,
    color: '#10B981',
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#10B981',
    backgroundColor: '#F0FFF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#10B981',
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  accountText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});
