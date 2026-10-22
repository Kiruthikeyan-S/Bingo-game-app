import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, MessageSquare, Search, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface EsportsBottomBarProps {
  onOptionsPress: () => void;
  onChatPress: () => void;
  onAnalyzePress: () => void;
  onBackPress: () => void;
  onForwardPress: () => void;
  canStepBack?: boolean;
  canStepForward?: boolean;
  forwardLabel?: string;
  forwardIcon?: React.ReactNode;
  forwardHighlight?: boolean;
}

export const EsportsBottomBar: React.FC<EsportsBottomBarProps> = ({
  onOptionsPress,
  onChatPress,
  onAnalyzePress,
  onBackPress,
  onForwardPress,
  canStepBack = true,
  canStepForward = true,
  forwardLabel = 'Forward',
  forwardIcon,
  forwardHighlight = false,
}) => {
  return (
    <View style={styles.barContainer}>
      {/* 1. Options */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={onOptionsPress}
        activeOpacity={0.7}
      >
        <Menu size={20} color="#cbd5e1" />
        <Text style={styles.navText}>Options</Text>
      </TouchableOpacity>

      {/* 2. Chat */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={onChatPress}
        activeOpacity={0.7}
      >
        <MessageSquare size={20} color="#cbd5e1" />
        <Text style={styles.navText}>Chat</Text>
      </TouchableOpacity>

      {/* 3. Analyze */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={onAnalyzePress}
        activeOpacity={0.7}
      >
        <Search size={20} color="#cbd5e1" />
        <Text style={styles.navText}>Analyze</Text>
      </TouchableOpacity>

      {/* 4. Back / Step Back */}
      <TouchableOpacity
        style={[styles.navButton, !canStepBack && styles.navDisabled]}
        onPress={onBackPress}
        disabled={!canStepBack}
        activeOpacity={0.7}
      >
        <ChevronLeft size={22} color={canStepBack ? '#cbd5e1' : '#475569'} />
        <Text style={[styles.navText, !canStepBack && styles.disabledText]}>
          Back
        </Text>
      </TouchableOpacity>

      {/* 5. Forward / Primary Action */}
      <TouchableOpacity
        style={[
          styles.navButton,
          forwardHighlight && styles.navHighlight,
          !canStepForward && styles.navDisabled,
        ]}
        onPress={onForwardPress}
        disabled={!canStepForward}
        activeOpacity={0.7}
      >
        {forwardIcon || (
          <ChevronRight size={22} color={canStepForward ? (forwardHighlight ? '#050816' : '#cbd5e1') : '#475569'} />
        )}
        <Text
          style={[
            styles.navText,
            forwardHighlight && styles.highlightText,
            !canStepForward && styles.disabledText,
          ]}
        >
          {forwardLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 58,
    backgroundColor: '#090e1a',
    borderTopWidth: 1,
    borderTopColor: '#172238',
    paddingHorizontal: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  navText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  navDisabled: {
    opacity: 0.45,
  },
  disabledText: {
    color: '#475569',
  },
  navHighlight: {
    backgroundColor: '#00e5ff',
    borderRadius: 8,
    marginVertical: 6,
    height: 44,
  },
  highlightText: {
    color: '#050816',
    fontWeight: '800',
  },
});
