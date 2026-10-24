import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import { Star, Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const OUTER_MARGIN = 32;
const BOARD_PADDING = 28;
const GAP = 8;
const CELL_SIZE = Math.floor((width - OUTER_MARGIN - BOARD_PADDING - GAP * 4) / 5);

interface BingoCellProps {
  number: number;
  isCalled: boolean;
  isLastCalled: boolean;
  isInCompletedLine: boolean;
  isSelectedForSwap?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export const BingoCell: React.FC<BingoCellProps> = ({
  number,
  isCalled,
  isLastCalled,
  isInCompletedLine,
  isSelectedForSwap = false,
  disabled = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.72}
      disabled={disabled || isCalled}
      onPress={onPress}
      style={[
        styles.cell,
        isCalled && styles.cellCalled,
        isInCompletedLine && styles.cellCompletedLine,
        isLastCalled && styles.cellLastCalled,
        isSelectedForSwap && styles.cellSelectedSwap,
      ]}
    >
      {isCalled && !isInCompletedLine && (
        <Text style={styles.hitBadgeText}>HIT</Text>
      )}

      <Text
        style={[
          styles.numberText,
          isCalled && styles.textCalled,
          isInCompletedLine && styles.textCompletedLine,
          isLastCalled && styles.textLastCalled,
          isSelectedForSwap && styles.textSelectedSwap,
        ]}
      >
        {number}
      </Text>

      {isInCompletedLine && (
        <View style={styles.starOverlay}>
          <Check size={12} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}

      {isLastCalled && (
        <View style={styles.lastCalledBadge}>
          <Text style={styles.lastCalledText}>NEW</Text>
        </View>
      )}

      {isSelectedForSwap && (
        <View style={styles.swapBadge}>
          <Text style={styles.swapBadgeText}>SWAP</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  cellCalled: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cellCompletedLine: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  cellLastCalled: {
    borderColor: '#06B6D4',
    borderWidth: 2,
  },
  cellSelectedSwap: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: '#FEF3C7',
  },
  hitBadgeText: {
    position: 'absolute',
    top: 4,
    fontSize: 7,
    fontWeight: '800',
    color: '#E0E7FF',
    letterSpacing: 0.5,
  },
  numberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  textCalled: {
    color: '#FFFFFF',
    marginTop: 6,
  },
  textCompletedLine: {
    color: '#FFFFFF',
  },
  textLastCalled: {
    color: '#FFFFFF',
  },
  textSelectedSwap: {
    color: '#D97706',
  },
  starOverlay: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastCalledBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#06B6D4',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  lastCalledText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  swapBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D97706',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  swapBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
});