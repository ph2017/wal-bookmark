/**
 * Converts a hex string to a URL-safe Base64 string.
 * @param hex - The hex string to convert.
 * @returns The URL-safe Base64 string.
 */
function hexToUrlSafeBase64(hex: string): string {
  // Remove '0x' prefix if it exists
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  // Ensure the hex string has an even number of characters
  const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;

  // Convert hex to byte array
  const byteArray = new Uint8Array(paddedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  // Convert byte array to Base64 string
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(byteArray)));

  // Make it URL-safe
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Converts a BigInt string to a URL-safe Base64 blob ID.
 * @param blobId - The blob ID as a BigInt string.
 * @returns The URL-safe Base64 blob ID.
 */
export function convertToWalrusBlobId(blobId: string): string {
  try {
    const hex = BigInt(blobId).toString(16);
    return hexToUrlSafeBase64(hex);
  } catch (error) {
    console.error("Failed to convert blobId:", error);
    return "";
  }
}