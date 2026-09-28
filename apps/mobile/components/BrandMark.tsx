import { Image, Text, View, StyleSheet } from 'react-native';
import { APP_NAME, APP_NAME_LEAD, APP_NAME_REST, COLOR } from '@goprivate/config';

export function BrandMark({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const logo = size === 'lg' ? 120 : 32;
  return (
    <View style={size === 'lg' ? styles.wrapLg : styles.wrapSm}>
      <Image
        source={require('../assets/images/logo.jpg')}
        style={{ width: logo, height: logo, borderRadius: size === 'lg' ? 24 : 8 }}
        resizeMode="contain"
        accessibilityLabel={APP_NAME}
      />
      <Text style={size === 'lg' ? styles.titleLg : styles.titleSm}>
        {APP_NAME_LEAD ? <Text style={{ color: COLOR.green }}>{APP_NAME_LEAD}</Text> : null}
        <Text style={{ color: COLOR.dark }}>{APP_NAME_REST}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapLg: {
    alignItems: 'center',
    marginBottom: 12,
  },
  wrapSm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleLg: {
    fontSize: 48,
    fontWeight: '700',
    marginTop: 16,
  },
  titleSm: {
    fontSize: 16,
    fontWeight: '700',
  },
});
