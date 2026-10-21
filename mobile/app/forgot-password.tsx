import React, { useState, useEffect } from 'react';
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
  Clipboard,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Mail,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Copy,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Box,
} from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const sendPasswordReset = usePlayerStore((s) => s.sendPasswordReset);

  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (isSubmitted && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            setCanResend(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSubmitted, countdown]);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await sendPasswordReset(trimmed);
      setIsSubmitted(true);
      setCountdown(45);
      setCanResend(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to dispatch reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      setLoading(true);
      await sendPasswordReset(email.trim());
      setCountdown(45);
      setCanResend(false);
      Alert.alert('Transmitted', 'A fresh password reset link has been dispatched to your email.');
    } finally {
      setLoading(false);
    }
  };

  const copyEmailToClipboard = () => {
    Clipboard.setString(email);
    Alert.alert('Copied', 'Email address copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color="#dde2f9" />
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <Box size={16} color="#22d3ee" />
            <Text style={styles.brandTitle}>GameHub 3D</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isSubmitted ? (
            /* ============================================================= */
            /* STATE 1: FORGOT PASSWORD FORM (INITIAL STATE)                 */
            /* ============================================================= */
            <View style={styles.stateContainer}>
              {/* 3D Holographic Cyber Key/Shield Container */}
              <View style={styles.hologramWrapper}>
                <View style={styles.pulseRingOuter} />
                <View style={styles.pulseRingInner} />
                <View style={styles.glassNode}>
                  <KeyRound size={42} color="#22d3ee" />
                  <View style={styles.statusDot} />
                </View>
                <View style={styles.tagSecL4}>
                  <Text style={styles.tagText}>SEC_L4</Text>
                </View>
                <View style={styles.tagEnc256}>
                  <Text style={styles.tagText}>ENC_256</Text>
                </View>
              </View>

              {/* Typography Block */}
              <Text style={styles.heading}>Reset Your Password</Text>
              <Text style={styles.subheading}>
                Enter your email address and we'll send you a password reset link.
              </Text>

              {/* Form Input Container */}
              <View style={styles.formContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <Text style={styles.labelSub}>PLAYER ID COMPATIBLE</Text>
                </View>

                <View style={[styles.inputBox, error && styles.inputBoxError]}>
                  <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setError(null);
                    }}
                    placeholder="player@gamehub3d.com"
                    placeholderTextColor="#64748b"
                    style={styles.textInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {email.includes('@') && (
                    <View style={styles.validGreenDot} />
                  )}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Reassurance Note */}
                <View style={styles.reassuranceRow}>
                  <ShieldCheck size={14} color="#34d399" />
                  <Text style={styles.reassuranceText}>
                    We will send a secure one-time verification link.
                  </Text>
                </View>

                {/* Primary Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.submitBtnTouch}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#22d3ee', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#0a1020" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Send Reset Link</Text>
                        <ArrowRight size={18} color="#0a1020" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Secondary Button: Back to Login */}
                <TouchableOpacity
                  style={styles.backToLoginBtn}
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                >
                  <LogIn size={16} color="#dde2f9" />
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ============================================================= */
            /* STATE 2: SUCCESS VIEW ('Check Your Inbox')                     */
            /* ============================================================= */
            <View style={styles.stateContainer}>
              {/* Glowing Holographic Radar Ring with Checkmark */}
              <View style={styles.hologramWrapper}>
                <View style={[styles.pulseRingOuter, { borderColor: 'rgba(52, 211, 153, 0.35)' }]} />
                <View style={[styles.pulseRingInner, { borderColor: 'rgba(52, 211, 153, 0.45)' }]} />
                <View style={[styles.glassNode, { borderColor: 'rgba(52, 211, 153, 0.5)' }]}>
                  <CheckCircle2 size={46} color="#34d399" />
                  <View style={[styles.statusDot, { backgroundColor: '#34d399' }]} />
                </View>
              </View>

              {/* Transmission Sent Badge */}
              <View style={styles.transmissionBadge}>
                <Text style={styles.transmissionText}>TRANSMISSION SENT</Text>
              </View>

              <Text style={styles.heading}>Check Your Inbox</Text>
              <Text style={styles.subheading}>
                If an account matches this email, you'll receive password reset instructions.
              </Text>

              {/* Recipient Details Box */}
              <View style={styles.recipientCard}>
                <View style={styles.recipientHeader}>
                  <Text style={styles.recipientLabel}>DISPATCH RECIPIENT</Text>
                  <View style={styles.encryptedPill}>
                    <View style={styles.encryptedDot} />
                    <Text style={styles.encryptedText}>ENCRYPTED</Text>
                  </View>
                </View>

                <View style={styles.emailPill}>
                  <Mail size={16} color="#22d3ee" />
                  <Text style={styles.emailDisplayText} numberOfLines={1}>
                    {email}
                  </Text>
                  <TouchableOpacity onPress={copyEmailToClipboard}>
                    <Copy size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Resend Countdown */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendLabel}>Resend Email in:</Text>
                  {canResend ? (
                    <TouchableOpacity onPress={handleResend}>
                      <Text style={styles.resendActiveText}>Resend Now</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.countdownText}>{countdown}s</Text>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.returnLoginBtn}
                  activeOpacity={0.85}
                  onPress={() => router.replace('/login')}
                >
                  <LogIn size={16} color="#0a1020" />
                  <Text style={styles.returnLoginText}>Return to Login</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tryAnotherBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                >
                  <RotateCcw size={15} color="#94a3b8" />
                  <Text style={styles.tryAnotherText}>Try Another Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#151b2c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#24293b',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#151b2c',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8aebff',
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  stateContainer: {
    width: '100%',
    alignItems: 'center',
  },
  hologramWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  pulseRingInner: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  glassNode: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: 'rgba(21, 27, 44, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(138, 235, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  statusDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34d399',
    borderWidth: 2,
    borderColor: '#080e1e',
  },
  tagSecL4: {
    position: 'absolute',
    top: 6,
    left: 8,
    backgroundColor: '#191f30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  tagEnc256: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: '#191f30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.3)',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8aebff',
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#dde2f9',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
    gap: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8aebff',
    letterSpacing: 1,
  },
  labelSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
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
  validGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
    marginRight: 14,
  },
  errorText: {
    color: '#ffb4ab',
    fontSize: 11,
    fontWeight: '600',
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  reassuranceText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  submitBtnTouch: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a1020',
    letterSpacing: 0.5,
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#151b2c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24293b',
    paddingVertical: 12,
  },
  backToLoginText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dde2f9',
  },
  transmissionBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    marginBottom: 10,
  },
  transmissionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 1,
  },
  recipientCard: {
    width: '100%',
    backgroundColor: '#151b2c',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24293b',
    gap: 10,
    marginBottom: 12,
  },
  recipientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipientLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  encryptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  encryptedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22d3ee',
  },
  encryptedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22d3ee',
    letterSpacing: 0.5,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080e1e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#24293b',
    gap: 8,
  },
  emailDisplayText: {
    flex: 1,
    color: '#dde2f9',
    fontSize: 13,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  resendLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22d3ee',
  },
  resendActiveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34d399',
  },
  returnLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22d3ee',
    borderRadius: 14,
    paddingVertical: 13,
  },
  returnLoginText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0a1020',
  },
  tryAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  tryAnotherText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
