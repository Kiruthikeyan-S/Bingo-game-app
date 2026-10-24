import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BoardArray } from '../../shared/types';
import { BingoCell } from './BingoCell';
import { calculateCompletedLines } from '../utils/bingo';

const { width } = Dimensions.get('window');
const OUTER_MARGIN = 32;
const BOARD_PADDING = 24;
const GAP = 8;
const CELL_SIZE = Math.floor((width - OUTER_MARGIN - BOARD_PADDING - GAP * 4) / 5);

const BINGO_HEADERS = [
  { letter: 'B', bg: '#EEF2FF', text: '#4F46E5' },
  { letter: 'I', bg: '#ECFEFF', text: '#0891B2' },
  { letter: 'N', bg: '#F1F5F9', text: '#0F172A' },
  { letter: 'G', bg: '#ECFEFF', text: '#0891B2' },
  { letter: 'O', bg: '#EEF2FF', text: '#4F46E5' },
];

interface BingoBoardProps {
  board: BoardArray;
  calledNumbers?: number[];
  lastCalledNumber?: number | null;
  selectedSwapIndex?: number | null;
  disabled?: boolean;
  onCellPress: (number: number, index: number) => void;
}

export const BingoBoard: React.FC<BingoBoardProps> = ({
  board,
  calledNumbers = [],
  lastCalledNumber = null,
  selectedSwapIndex = null,
  disabled = false,
  onCellPress,
}) => {
  // Precalculate completed lines and highlighted indices
  const { highlightedIndices } = useMemo(() => {
    return calculateCompletedLines(board, calledNumbers);
  }, [board, calledNumbers]);

  return (
    <View style={styles.gridContainer}>
      {/* 5 Column Headers matching Stitch Modern Light */}
      <View style={styles.headerRow}>
        {BINGO_HEADERS.map((h) => (
          <View
            key={h.letter}
            style={[styles.headerCell, { backgroundColor: h.bg }]}
          >
            <Text style={[styles.headerLetter, { color: h.text }]}>{h.letter}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cellsGrid}>
        {board.map((number, index) => {
          const isCalled = calledNumbers.includes(number);
          const isLastCalled = lastCalledNumber === number;
          const isInCompletedLine = highlightedIndices.has(index);
          const isSelectedForSwap = selectedSwapIndex === index;

          return (
            <BingoCell
              key={`${index}-${number}`}
              number={number}
              isCalled={isCalled}
              isLastCalled={isLastCalled}
              isInCompletedLine={isInCompletedLine}
              isSelectedForSwap={isSelectedForSwap}
              disabled={disabled}
              onPress={() => onCellPress(number, index)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  headerCell: {
    width: CELL_SIZE,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLetter: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cellsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: CELL_SIZE * 5 + 32,
    justifyContent: 'center',
  },
});