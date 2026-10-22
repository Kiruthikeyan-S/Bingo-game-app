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
  { letter: 'B', color: '#FF5C5C' },
  { letter: 'I', color: '#F5A623' },
  { letter: 'N', color: '#7ED321' },
  { letter: 'G', color: '#34D399' },
  { letter: 'O', color: '#38BDF8' },
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
      {/* 5 Column Headers matching Image 3 */}
      <View style={styles.headerRow}>
        {BINGO_HEADERS.map((h) => (
          <View
            key={h.letter}
            style={[styles.headerCell, { backgroundColor: h.color }]}
          >
            <Text style={styles.headerLetter}>{h.letter}</Text>
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
    backgroundColor: '#0F291E',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
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
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cellsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
