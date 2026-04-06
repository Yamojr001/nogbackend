/**
 * Generates a random organization/branch/group code.
 * Format: XX-0000 (2 uppercase letters, hyphen, 4 digits)
 * Example: AB-1234
 */
export function generateOrgCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  let result = '';
  
  // 2 uppercase letters
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // Hyphen
  result += '-';
  
  // 4 digits
  for (let i = 0; i < 4; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  
  return result;
}
