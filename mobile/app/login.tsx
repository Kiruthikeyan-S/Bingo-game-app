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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, UserCheck, Mail, Lock, KeyRound, UserPlus, LogIn } from 'lucide-react-native';
import { GameButton } from '../components/GameButton';
import { usePlayerStore, AVATAR_OPTIONS } from '../store/playerStore';
import { firebaseService } from '../services/firebaseService';

export default function LoginScreen() {
  const router = useRouter();
  const currentUsername = usePlayerStore((s) => s.username);
  const currentAvatar = usePlayerStore((s) => s.avatarUrl);
  const setProfile = usePlayerStore((s) => s.setProfile);

  const [authMode, setAuthMode] = useState<'guest' | 'email'>('guest');
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');

  const [username, setUsername] = useState(currentUsername);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guest login with Firebase anonymous auth
  const handleGuestLogin = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await firebaseService.loginAsGuest(trimmed, selectedAvatar);
      if (!res.success) {
        // Fallback to local offline profile
        setProfile({
          username: trimmed,
          avatarUrl: selectedAvatar,
        });
      }
      router.replace('/home');
    } catch {
      setProfile({
        username: trimmed,
        avatarUrl: selectedAvatar,
      });
      router.replace('/home');
    } finally {
      setLoading(false);
    }
  };

  // Firebase Email/Password Auth
  const handleEmailAuth = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (emailMode === 'signup') {
        const trimmedUser = username.trim() || email.split('@')[0];
        const res = await firebaseService.registerWithEmail(
          email,
          password,
          trimmedUser,
          selectedAvatar
        );
        if (res.success) {
          Alert.alert('Account Created', 'Welcome to Game Hub!');
          router.replace('/home');
        } else {
          setError(res.error || 'Registration failed');
        }
      } else {
        const res = await firebaseService.loginWithEmail(email, password);
        if (res.success) {
          router.replace('/home');
        } else {
          setError(res.error || 'Login failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Enter your email in the field above to receive a reset link.');
      return;
    }
    setLoading(true);
    const res = await firebaseService.resetPassword(email);
    setLoading(false);
    if (res.success) {
      Alert.alert('Email Sent', 'Check your email inbox for password reset instructions.');
    } else {
      Alert.alert('Error', res.error || 'Could not send reset email.');
    }
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
              <Shield size={28} color="#00e5ff" />
            </View>
            <Text style={styles.title}>Game Hub Cloud</Text>
            <Text style={styles.subtitle}>Firebase Auth, Cloud Save & Leaderboard</Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, authMode === 'guest' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('guest');
                setError(null);
              }}
            >
              <UserCheck size={16} color={authMode === 'guest' ? '#070b1e' : '#94a3b8'} />
              <Text
                style={[styles.tabButtonText, authMode === 'guest' && styles.tabButtonTextActive]}
              >
                Instant Guest
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMode === 'email' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('email');
                setError(null);
              }}
            >
              <Mail size={16} color={authMode === 'email' ? '#070b1e' : '#94a3b8'} />
              <Text
                style={[styles.tabButtonText, authMode === 'email' && styles.tabButtonTextActive]}
              >
                Firebase Account
              </Text>
            </TouchableOpacity>
          </View>

          {authMode === 'guest' ? (
            <>
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

              <View style={styles.actionContainer}>
                <GameButton
                  title={loading ? 'Connecting...' : 'Play as Guest'}
                  loading={loading}
                  onPress={handleGuestLogin}
                  icon={<UserCheck size={20} color="#ffffff" />}
                />
              </View>
            </>
          ) : (
            <>
              {/* Email Mode Sub-tabs */}
              <View style={styles.subTabRow}>
                <TouchableOpacity
                  style={[styles.subTab, emailMode === 'login' && styles.subTabActive]}
                  onPress={() => {
                    setEmailMode('login');
                    setError(null);
                  }}
                >
                  <LogIn size={15} color={emailMode === 'login' ? '#00e5ff' : '#64748b'} />
                  <Text
                    style={[styles.subTabText, emailMode === 'login' && styles.subTabTextActive]}
                  >
                    Log In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.subTab, emailMode === 'signup' && styles.subTabActive]}
                  onPress={() => {
                    setEmailMode('signup');
                    setError(null);
                  }}
                >
                  <UserPlus size={15} color={emailMode === 'signup' ? '#00e5ff' : '#64748b'} />
                  <Text
                    style={[styles.subTabText, emailMode === 'signup' && styles.subTabTextActive]}
                  >
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {emailMode === 'signup' && (
                <View style={styles.inputSection}>
                  <Text style={styles.sectionLabel}>PLAYER USERNAME</Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Display name"
                    placeholderTextColor="#64748b"
                    maxLength={16}
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>EMAIL ADDRESS</Text>
                <View style={styles.iconInputRow}>
                  <Mail size={18} color="#a5b4fc" style={{ marginLeft: 14 }} />
                  <TextInput
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setError(null);
                    }}
                    placeholder="name@example.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.iconInput}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>PASSWORD</Text>
                <View style={styles.iconInputRow}>
                  <Lock size={18} color="#a5b4fc" style={{ marginLeft: 14 }} />
                  <TextInput
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError(null);
                    }}
                    placeholder="Min 6 characters"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    autoCapitalize="none"
                    style={styles.iconInput}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              {emailMode === 'login' && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={styles.forgotBtn}
                >
                  <KeyRound size={13} color="#00e5ff" />
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <View style={styles.actionContainer}>
                <GameButton
                  title={
                    loading
                      ? 'Authenticating...'
                      : emailMode === 'signup'
                      ? 'Register Account'
                      : 'Sign In'
                  }
                  loading={loading}
                  onPress={handleEmailAuth}
                  icon={
                    emailMode === 'signup' ? (
                      <UserPlus size={18} color="#ffffff" />
                    ) : (
                      <LogIn size={18} color="#ffffff" />
                    )
                  }
                />
              </View>
            </>
          )}
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
    marginBottom: 20,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#11183c',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#11183c',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#00e5ff',
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#070b1e',
    fontWeight: '800',
  },
  subTabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#11183c',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  subTabActive: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  subTabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  subTabTextActive: {
    color: '#00e5ff',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: '#00e5ff',
    marginBottom: 14,
    backgroundColor: '#1e293b',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
    marginBottom: 8,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
  },
  inputSection: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#11183c',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#24326f',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11183c',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#24326f',
  },
  iconInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
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
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: 6,
  },
});
