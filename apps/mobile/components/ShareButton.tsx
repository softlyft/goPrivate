import { Pressable, Text, StyleSheet, Share, Alert, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

interface ShareButtonProps {
  sessionId: string;
  onCopyFallback?: () => void;
}

export function ShareButton({ sessionId, onCopyFallback }: ShareButtonProps) {
  const shareUrl = `https://goprivate.app/chat/${sessionId}`;

  const shareMessage = Platform.select({
    ios: `You've been invited to a private conversation on goPrivate.

Join now for secure, end-to-end encrypted messaging that leaves no trace.

${shareUrl}

This session expires in 15 minutes.`,
    android: `You've been invited to a private conversation on goPrivate.

Join now for secure, end-to-end encrypted messaging that leaves no trace.

${shareUrl}

This session expires in 15 minutes.`,
    default: `You've been invited to a private conversation. Click to join: ${shareUrl}`,
  });

  async function handleShare() {
    try {
      const result = await Share.share(
        {
          message: shareMessage,
          url: shareUrl, // iOS specific
          title: 'Join Private Conversation',
        },
        {
          subject: "You've been invited to a private conversation", // Email subject (iOS)
          dialogTitle: 'Share via', // Android dialog title
        },
      );

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared via:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Unable to share. You can copy the link instead.', [
        { text: 'OK', style: 'cancel' },
        {
          text: 'Copy Link',
          onPress: onCopyFallback,
        },
      ]);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
      onPress={handleShare}
    >
      <Text style={styles.shareIcon}>📤</Text>
      <Text style={styles.shareText}>Share Invite</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.backgroundWhite,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  shareButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  shareIcon: {
    fontSize: 18,
  },
  shareText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
