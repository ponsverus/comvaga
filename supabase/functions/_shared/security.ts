export async function timingSafeTokenMatch(received: string, expected: string) {
  const encoder = new TextEncoder();
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const receivedBytes = new Uint8Array(receivedHash);
  const expectedBytes = new Uint8Array(expectedHash);

  let diff = 0;
  for (let index = 0; index < receivedBytes.length; index++) {
    diff |= receivedBytes[index] ^ expectedBytes[index];
  }
  return diff === 0;
}
