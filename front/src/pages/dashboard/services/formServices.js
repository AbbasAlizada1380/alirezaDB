// utils/packageCalculations.js

/**
 * Calculate total cash based on weight and price per kg
 * @param {number|string} goodWeight - Weight in kilograms
 * @param {number|string} perKgCash - Price per kilogram
 * @param {number|string} piece - Number of pieces (default: 1)
 * @returns {string} Calculated total cash (formatted to 2 decimal places)
 */
export const calculateTotalCash = (goodWeight, perKgCash) => {
  // Convert to numbers and handle empty/undefined values
  const weight = parseFloat(goodWeight) || 0;
  const price = parseFloat(perKgCash) || 0;

  // Calculate total
  const total = weight * price ;

  // Return formatted to 2 decimal places, or empty string if zero
  return total > 0 ? total.toFixed(2) : "";
};

/**
 * Calculate remaining cash based on total and received amount
 * @param {number|string} totalCash - Total cash amount
 * @param {number|string} recip - Received cash amount
 * @returns {string} Calculated remaining cash (formatted to 2 decimal places)
 */
export const calculateRemainingCash = (totalCash, recip) => {
  const total = parseFloat(totalCash) || 0;
  const received = parseFloat(recip) || 0;

  const remaining = total - received;
  return remaining.toFixed(2);
};

/**
 * Check if auto-calculation should be enabled
 * @param {Object} formData - Form data object
 * @returns {boolean} Whether auto-calculation should be active
 */
export const shouldAutoCalculate = (formData) => {
  return (
    formData.goodWeight && formData.perKgCash && !formData.isTotalCashManual
  );
};
