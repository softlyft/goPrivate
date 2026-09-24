export function isReactNative(): boolean {
  return (
    typeof navigator !== 'undefined' && (navigator as { product?: string }).product === 'ReactNative'
  );
}
