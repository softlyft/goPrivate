import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Clipboard } from 'react-native';
import {
  HANDLE_ALLOWLIST,
  PUBLIC_WEB_ORIGIN,
  isAllowedHandle,
  normalizeHandle,
  sessionTtlLabel,
} from '@goprivate/config';
import { Colors } from '../constants/Colors';
import { claimHandle, getChatHub, unclaimHandle } from '../services/chat-hub';
import { saveHandleLeaseFromPaste } from '../services/handle-lease';
import { messageVault } from '../services/vault';

function handleUrl(handle: string): string {
  return `${PUBLIC_WEB_ORIGIN}/${handle}`;
}

export function ClaimHandleCard({
  onNeedPin,
}: {
  onNeedPin: (afterUnlock: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(HANDLE_ALLOWLIST[0] ?? '');
  const [claimed, setClaimed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leasePaste, setLeasePaste] = useState('');

  useEffect(() => {
    const hub = getChatHub();
    setClaimed(hub.handle);
    const onStatus = (handle: string | null) => {
      setClaimed(handle);
      if (handle) setOpen(true);
    };
    hub.on('handleStatus', onStatus);
    return () => hub.off('handleStatus', onStatus);
  }, []);

  async function goAvailable(handle: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await claimHandle(handle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not go available');
    } finally {
      setBusy(false);
    }
  }

  function handleGo(): void {
    const handle = normalizeHandle(value);
    if (!handle) return;
    const run = async () => {
      if (leasePaste.trim()) {
        await saveHandleLeaseFromPaste(handle, leasePaste);
      } else if (!isAllowedHandle(handle)) {
        setError(
          HANDLE_ALLOWLIST.length > 0
            ? 'This instance only allows reserved names'
            : 'Use a short name like alice',
        );
        return;
      }
      await goAvailable(handle);
    };
    if (!messageVault.isUnlocked) {
      onNeedPin(run);
      return;
    }
    void run().catch((err) => {
      setError(err instanceof Error ? err.message : 'Could not go available');
    });
  }

  if (claimed) {
    const url = handleUrl(claimed);
    return (
      <View style={styles.card}>
        <Text style={styles.kicker}>Available as</Text>
        <Text style={styles.url}>{url}</Text>
        <Text style={styles.hint}>
          Works only while this app stays connected. If you leave, the name goes offline.
        </Text>
        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => {
              Clipboard.setString(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Text style={styles.secondaryText}>{copied ? 'Copied' : 'Copy link'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
            onPress={() => {
              setBusy(true);
              void unclaimHandle().finally(() => setBusy(false));
            }}
            disabled={busy}
          >
            <Text style={styles.ghostText}>Go offline</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)}>
        <Text style={styles.link}>Use a lasting link</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <TextInput
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setError(null);
        }}
        placeholder="your-name"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <TextInput
        value={leasePaste}
        onChangeText={setLeasePaste}
        placeholder="Lease key from your operator"
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={[styles.input, styles.leaseInput]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [
            styles.secondary,
            (!value.trim() || busy) && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={handleGo}
          disabled={!value.trim() || busy}
        >
          <Text style={styles.secondaryText}>{busy ? 'Connecting…' : 'Go available'}</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(false)}>
          <Text style={styles.ghostText}>Cancel</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        Reserved names need a time-limited lease key. Visitors start a normal {sessionTtlLabel()}{' '}
        chat.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  url: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brandDark,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  leaseInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secondary: {
    backgroundColor: Colors.backgroundWhite,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  secondaryText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  ghost: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  ghostText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  link: {
    textAlign: 'center',
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
