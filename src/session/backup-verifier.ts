// The real signature check for state backups (follow-up to #329).
//
// checkBackupEnvelope takes the verifier as a parameter so the backup module
// stays crypto-free. This is the one a server should use. verifySignedMessage
// (vendored from nimiq-settlement v0.9.0) does the Ed25519 check over the
// Nimiq signed-message hash (weak keys and non-canonical signatures refused)
// and RETURNS the address
// the key controls. The envelope's address must equal it, or a valid
// signature from wallet B could write wallet A's backup.
//
// Only the 'signed-message' envelope is accepted by default. A signature made
// under 'connect-challenge' is a login proof, not consent to a state write;
// allow it only if a Pay build is shown to sign backups under it.

import { verifySignedMessage, type SignMessageDomain } from '../vendor/settlement/sign-message';
import { compactAddress, type BackupSignatureVerifier } from './backup';

export function nimiqBackupVerifier(o: { accept?: readonly SignMessageDomain[] } = {}): BackupSignatureVerifier {
  const accept = o.accept ?? (['signed-message'] as const);
  return async (e) => {
    const r = await verifySignedMessage({ message: e.message, publicKey: e.publicKeyHex, signature: e.signatureHex, accept });
    return r.ok && compactAddress(r.address) === compactAddress(e.address);
  };
}
