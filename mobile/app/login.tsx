import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Gamepad2,
  HelpCircle,
  Flame,
  Fingerprint,
  CheckCircle2,
  Box,
} from 'lucide-react-native';
import { GoogleIcon } from '../components/GoogleIcon';
import { usePlayerStore } from '../store/playerStore';

export default function LoginScreen() {
  const router = useRouter();
  const loginWithEmail = usePlayerStore((s) => s.loginWithEmail);
  const loginWithGoogle = usePlayerStore((s) => s.loginWithGoogle);
  const loginAsGuest = usePlayerStore((s) => s.loginAsGuest);

  const [emailOrPlayerId, setEmailOrPlayerId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    const trimmed = emailOrPlayerId.trim();
    if (!trimmed) {
      setError('Please enter your email or player ID');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await loginWithEmail(trimmed, password);
      if (res.success) {
        router.replace('/home');
      } else {
        setError(res.error || 'Failed to sign in');
      }
    } catch (e: any) {
      setError(e?.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loginWithGoogle();
      if (res.success) {
        router.replace('/home');
      } else {
        setError(res.error || 'Google sign-in cancelled');
      }
    } catch (e: any) {
      setError(e?.message || 'Google authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestPlay = () => {
    loginAsGuest();
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top App Bar with Telemetry */}
        <View style={styles.topAppBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/home')}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <Box size={20} color="#22d3ee" />
            <Text style={styles.brandTitle}>GameHub-3D</Text>
          </View>

          <View style={styles.topRightActions}>
            <View style={styles.pingBadge}>
              <View style={styles.pingDot} />
              <Text style={styles.pingText}>24ms</Text>
            </View>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() =>
                Alert.alert(
                  'GameHub-3D Auth',
                  'Sign in with your email or GamerTag to sync your 3D trophies, rating, and match history across all devices.'
                )
              }
            >
              <HelpCircle size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 3D Gaming Decorative Header Banner */}
          <View style={styles.heroBanner}>
            <LinearGradient
              colors={['#1e1b4b', '#0f172a', '#080e1e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.bannerTopBadge}>
                <Text style={styles.bannerBadgeText}>ARENA 3D • SEASON 04</Text>
              </View>

              <View style={styles.bannerCenterContent}>
                <View style={styles.bannerIconBox}>
                  <Gamepad2 size={36} color="#22d3ee" />
                </View>
                <Text style={styles.bannerSubhead}>CYBERNETIC MULTIPLAYER HUB</Text>
              </View>

              <View style={styles.bannerBottomTag}>
                <Text style={styles.bannerBottomText}>HYPERLINK ENGINE ACTIVE</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Welcome & Streak Multiplier */}
          <View style={styles.welcomeSection}>
            <View style={styles.streakBadge}>
              <Flame size={14} color="#22d3ee" />
              <Text style={styles.streakText}>STREAK MULTIPLIER ACTIVE (3X)</Text>
            </View>
            <Text style={styles.welcomeHeading}>Welcome Back, Player!</Text>
            <Text style={styles.welcomeSubhead}>
              Sign in and continue your winning streak in the 3D grid.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {/* Field 1: Email or Player ID */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>EMAIL OR PLAYER ID</Text>
                <Text style={styles.labelGamertag}>#GAMERTAG</Text>
              </View>
              <View style={[styles.inputBox, error && !emailOrPlayerId && styles.inputBoxError]}>
                <AtSign size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  value={emailOrPlayerId}
                  onChangeText={(t) => {
                    setEmailOrPlayerId(t);
                    setError(null);
                  }}
                  placeholder="alex.vortex@gamehub.io"
                  placeholderTextColor="#64748b"
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailOrPlayerId.length >= 3 && (
                  <CheckCircle2 size={16} color="#34d399" style={{ marginRight: 12 }} />
                )}
              </View>
            </View>

            {/* Field 2: Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputBox, error && !password && styles.inputBoxError]}>
                <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  placeholder="••••••••••••"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember & Biometrics */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.checkboxTouch}
                activeOpacity={0.8}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.rememberText}>Keep me logged in</Text>
              </TouchableOpacity>

              <View style={styles.biometricPill}>
                <Fingerprint size={14} color="#d0bcff" />
                <Text style={styles.biometricText}>Biometric Ready</Text>
              </View>
            </View>

            {/* Error Banner */}
            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            {/* Primary Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.signInBtnTouch}
              onPress={handleSignIn}
              disabled={loading}
            >
              <LinearGradient
                colors={['#22d3ee', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0a1020" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Gamepad2 size={18} color="#0a1020" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Tactical Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerBadge}>
              <Text style={styles.dividerText}>OR</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* Alternative SSO Actions */}
          <View style={styles.ssoContainer}>
            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.googleBtn}
              activeOpacity={0.85}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <GoogleIcon size={20} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Play as Guest */}
            <TouchableOpacity
              style={styles.guestBtn}
              activeOpacity={0.85}
              onPress={handleGuestPlay}
            >
              <Gamepad2 size={18} color="#d0bcff" />
              <Text style={styles.guestBtnText}>Play as Guest (Casual Mode)</Text>
            </TouchableOpacity>
          </View>

          {/* Create Account Link */}
          <View style={styles.signupPromptRow}>
            <Text style={styles.promptText}>New to GameHub?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080e1e',
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0d1323',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 73, 76, 0.35)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#151b2c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#24293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8aebff',
    letterSpacing: -0.5,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#080e1e',
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 76, 0.4)',
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  pingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34d399',
  },
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    marginBottom: 20,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  heroGradient: {
    padding: 16,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  bannerTopBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(8, 14, 30, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8aebff',
    letterSpacing: 1,
  },
  bannerCenterContent: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 6,
  },
  bannerIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#22d3ee',
  },
  bannerSubhead: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dde2f9',
    letterSpacing: 1.5,
  },
  bannerBottomTag: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(8, 14, 30, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 76, 0.4)',
  },
  bannerBottomText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#61f6b9',
    letterSpacing: 0.5,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(87, 27, 193, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.3)',
    marginBottom: 8,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d0bcff',
    letterSpacing: 0.5,
  },
  welcomeHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#dde2f9',
    letterSpacing: -0.5,
  },
  welcomeSubhead: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  formCard: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8aebff',
    letterSpacing: 0.8,
  },
  labelGamertag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22d3ee',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151b2c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24293b',
    height: 48,
  },
  inputBoxError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginLeft: 14,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#dde2f9',
    fontSize: 14,
    paddingVertical: 8,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#3c494c',
    backgroundColor: '#151b2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#22d3ee',
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#22d3ee',
  },
  rememberText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  biometricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  biometricText: {
    fontSize: 11,
    color: '#d0bcff',
    fontWeight: '600',
  },
  errorBanner: {
    color: '#ffb4ab',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(147, 0, 10, 0.25)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
  },
  signInBtnTouch: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a1020',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(60, 73, 76, 0.4)',
  },
  dividerBadge: {
    paddingHorizontal: 12,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#859397',
    letterSpacing: 1.5,
  },
  ssoContainer: {
    gap: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#151b2c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 76, 0.6)',
    paddingVertical: 13,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dde2f9',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(21, 27, 44, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 76, 0.4)',
    paddingVertical: 12,
  },
  guestBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  signupPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    gap: 6,
  },
  promptText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22d3ee',
  },
});
