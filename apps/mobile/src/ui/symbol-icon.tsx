import { Text } from 'react-native'
import { SymbolView, type SFSymbol } from 'expo-symbols'

interface SymbolIconProps {
  name: SFSymbol
  color: string
  size: number
  fallback?: string
}

export function SymbolIcon({
  name,
  color,
  size,
  fallback = '•',
}: SymbolIconProps) {
  return (
    <SymbolView
      fallback={
        <Text
          style={{
            color,
            fontSize: size,
            lineHeight: size,
            textAlign: 'center',
          }}
        >
          {fallback}
        </Text>
      }
      name={name}
      resizeMode="scaleAspectFit"
      size={size}
      tintColor={color}
      type="monochrome"
      weight="regular"
    />
  )
}
