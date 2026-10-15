import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, UserCheck } from 'lucide-react-native';
import { GameButton } from '../components/GameButton';
import { usePlayerStore, AVATAR_OPTIONS } from '../store/playerStore';

export default function LoginScreen() {
  const router = useRouter();
  const currentUsername = usePlayerStore((s) => s.username);
  const currentAvatar = usePlayerStore((s) => s.avatarUrl);
  const setProfile = usePlayerStore((s) => s.setProfile);

  const [username, setUsername] = useState(currentUsername);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    if (trimmed.length > 16) {
      setError('Username must be at most 16 characters');
      return;
    }

    setProfile({
      username: trimmed,
      avatarUrl: selectedAvatar,
    });

    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Sparkles size={28} color="#00e5ff" />
            </View>
            <Text style={styles.title}>Player Profile</Text>
            <Text style={styles.subtitle}>Choose your avatar & battlefield name</Text>
          </View>

          {/* Avatar Preview & Selection */}
          <View style={styles.avatarSection}>
            <Image source={{ uri: selectedAvatar }} style={styles.mainAvatar} />
            <Text style={styles.sectionLabel}>SELECT AVATAR</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((uri, index) => {
                const isSelected = selectedAvatar === uri;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedAvatar(uri)}
                    style={[styles.avatarOption, isSelected && styles.avatarSelected]}
                  >
                    <Image source={{ uri }} style={styles.optionImage} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Username Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>BATTLE USERNAME</Text>
            <TextInput
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                setError(null);
              }}
              placeholder="Enter your nickname"
              placeholderTextColor="#64748b"
              maxLength={16}
              style={[styles.input, error && styles.inputError]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <GameButton
              title="Continue as Guest"
              onPress={handleContinue}
              icon={<UserCheck size={20} color="#ffffff" />}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#11183c',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mainAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#00e5ff',
    marginBottom: 16,
    backgroundColor: '#1e293b',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarOption: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  optionImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
  },
  inputSection: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#11183c',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#24326f',
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  actionContainer: {
    marginTop: 10,
  },
});
