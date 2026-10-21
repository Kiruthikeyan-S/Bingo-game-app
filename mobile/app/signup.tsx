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
  User,
  ShieldCheck,
  CheckCircle2,
  Box,
  UserPlus,
} from 'lucide-react-native';
import { GoogleIcon } from '../components/GoogleIcon';
import { usePlayerStore } from '../store/playerStore';

export default function SignUpScreen() {
  const router = useRouter();
  const signUpWithEmail = usePlayerStore((s) => s.signUpWithEmail);
  const loginWithGoogle = usePlayerStore((s) => s.loginWithGoogle);
  const loginAsGuest = usePlayerStore((s) => s.loginAsGuest);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsername) {
      setError('Please enter your gamertag / pilot handle');
      return;
    }
    if (trimmedUsername.length < 3) {
      setError('Gamertag must be at least 3 characters');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the Arena Terms of Service');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await signUpWithEmail(trimmedEmail, trimmedUsername, password);
      if (res.success) {
        router.replace('/home');
      } else {
        setError(res.error || 'Failed to create account');
      }
    } catch (e: any) {
      setError(e?.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loginWithGoogle();
      if (res.success) {
        router.replace('/home');
      } else {
        setError(res.error || 'Google sign-up cancelled');
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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/login');
              }
            }}
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
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Banner */}
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <ShieldCheck size={13} color="#22d3ee" />
              <Text style={styles.heroBadgeText}>CONTENDER REGISTRATION</Text>
            </View>
            <Text style={styles.heroTitle}>
              CREATE <Text style={styles.cyanGlowText}>ACCOUNT</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Claim your unique 3D pilot handle and enter the real-time arena.
            </Text>
          </View>

          {/* Registration Form Card */}
          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Gamertag Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>CALLSIGN / GAMERTAG</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <User size={18} color="#64748b" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. CyberVanguard"
                  placeholderTextColor="#475569"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>PILOT EMAIL</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <AtSign size={18} color="#64748b" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="pilot@gamehub.io"
                  placeholderTextColor="#475569"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>PASSPHRASE</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <Lock size={18} color="#64748b" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Min. 6 security characters"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSPHRASE</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <Lock size={18} color="#64748b" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Repeat passphrase"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Agreement Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                {agreeTerms && <CheckCircle2 size={14} color="#080e1e" />}
              </View>
              <Text style={styles.termsText}>
                I accept the <Text style={styles.termsAccent}>Fair-Play Protocol</Text> and Arena Rules
              </Text>
            </TouchableOpacity>

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#22d3ee', '#0ea5e9', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#080e1e" size="small" />
                ) : (
                  <View style={styles.primaryBtnRow}>
                    <UserPlus size={18} color="#080e1e" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>REGISTER CONTENDER</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN UP VIA</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign Up Button */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.googleIconContainer}>
                <GoogleIcon size={18} />
              </View>
              <Text style={styles.googleBtnText}>Sign up with Google</Text>
            </TouchableOpacity>

            {/* Guest Action */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestPlay}
              activeOpacity={0.8}
            >
              <Text style={styles.guestBtnText}>Skip for now · Play as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Already have an account */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an active pass? </Text>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.footerLink}>Sign In</Text>
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
    backgroundColor: '#080E1E',
  },
  topAppBar: {
    height: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#172238',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#11192d',
    borderWidth: 1,
    borderColor: '#1e2d4d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    gap: 5,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  pingText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111b33',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 10,
    gap: 6,
  },
  heroBadgeText: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cyanGlowText: {
    color: '#22d3ee',
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 290,
  },
  card: {
    backgroundColor: '#12192b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2d4a',
    padding: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a101f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#233252',
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 18,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#0a101f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#22d3ee',
    borderColor: '#22d3ee',
  },
  termsText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
  },
  termsAccent: {
    color: '#22d3ee',
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnGradient: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#080e1e',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 12,
    letterSpacing: 0.6,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
  },
  googleIconContainer: {
    marginRight: 10,
  },
  googleBtnText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
  },
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  guestBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    color: '#64748b',
    fontSize: 13,
  },
  footerLink: {
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: '800',
  },
});
