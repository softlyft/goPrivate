import { createNativeCryptoProvider } from '@goprivate/crypto/native';
import { createRelayClient, type IRelayClient, type ITransport } from '@goprivate/sdk';

/**
 * Always inject the native crypto provider. Metro `.js` → `.ts` remapping
 * can otherwise load Web Crypto, which Hermes does not implement.
 */
export function createMobileRelayClient(options?: { transport?: ITransport }): IRelayClient {
  return createRelayClient({
    transport: options?.transport,
    crypto: createNativeCryptoProvider(),
  });
}
