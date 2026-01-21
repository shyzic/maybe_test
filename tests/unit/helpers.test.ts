import {
  calculateTotalRounds,
  calculateItemsInRound,
  calculateStartItemNumber,
  calculateMinNextBid,
  isInAntiSnipeWindow,
  addSeconds,
} from '../../src/utils/helpers';

describe('Helper Functions', () => {
  describe('calculateTotalRounds', () => {
    it('should calculate correct number of rounds', () => {
      expect(calculateTotalRounds(200, 50)).toBe(4);
      expect(calculateTotalRounds(100, 25)).toBe(4);
      expect(calculateTotalRounds(150, 50)).toBe(3);
      expect(calculateTotalRounds(51, 50)).toBe(2);
    });
  });

  describe('calculateItemsInRound', () => {
    it('should return itemsPerRound for non-last rounds', () => {
      expect(calculateItemsInRound(1, 200, 50, 4)).toBe(50);
      expect(calculateItemsInRound(2, 200, 50, 4)).toBe(50);
      expect(calculateItemsInRound(3, 200, 50, 4)).toBe(50);
    });

    it('should return remaining items for last round', () => {
      expect(calculateItemsInRound(4, 200, 50, 4)).toBe(50);
      expect(calculateItemsInRound(3, 150, 50, 3)).toBe(50);
      expect(calculateItemsInRound(2, 75, 50, 2)).toBe(25);
    });
  });

  describe('calculateStartItemNumber', () => {
    it('should calculate correct start item number', () => {
      expect(calculateStartItemNumber(1, 50)).toBe(1);
      expect(calculateStartItemNumber(2, 50)).toBe(51);
      expect(calculateStartItemNumber(3, 50)).toBe(101);
      expect(calculateStartItemNumber(4, 50)).toBe(151);
    });
  });

  describe('calculateMinNextBid', () => {
    it('should calculate minimum next bid with percentage', () => {
      expect(calculateMinNextBid(100, 5)).toBe(105);
      expect(calculateMinNextBid(100, 10)).toBe(110);
      expect(calculateMinNextBid(200, 5)).toBe(210);
    });
  });

  describe('isInAntiSnipeWindow', () => {
    it('should return true when in anti-snipe window', () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 30 * 1000); // 30 секунд до конца
      expect(isInAntiSnipeWindow(now, endTime, 60)).toBe(true);
    });

    it('should return false when not in anti-snipe window', () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 120 * 1000); // 120 секунд до конца
      expect(isInAntiSnipeWindow(now, endTime, 60)).toBe(false);
    });

    it('should return false when time has passed', () => {
      const now = new Date();
      const endTime = new Date(now.getTime() - 10 * 1000); // 10 секунд назад
      expect(isInAntiSnipeWindow(now, endTime, 60)).toBe(false);
    });
  });

  describe('addSeconds', () => {
    it('should add seconds to date', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = addSeconds(date, 60);
      expect(result.getTime() - date.getTime()).toBe(60000);
    });
  });
});
