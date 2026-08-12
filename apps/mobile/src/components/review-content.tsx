import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  spacing,
  themeTypography,
  typography,
  type NativeTheme,
} from '@tickcap/tokens'
import { useTickCapTheme } from '../ui/theme-provider'

export function ReviewContent({ content }: { content: string }) {
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View style={styles.container}>
      {content.split('\n').map((line, index) => {
        if (!line) return <View key={`space:${index}`} style={styles.space} />
        if (line.startsWith('## ')) {
          return (
            <Text key={`heading:${index}`} style={styles.heading}>
              {line.slice(3)}
            </Text>
          )
        }
        if (line.startsWith('- ')) {
          return (
            <Text key={`bullet:${index}`} style={styles.body}>
              · {line.slice(2)}
            </Text>
          )
        }
        return (
          <Text key={`body:${index}`} style={styles.body}>
            {line}
          </Text>
        )
      })}
    </View>
  )
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  heading: {
    color: theme.text1,
    fontSize: typography.scale.title.size,
    lineHeight: typography.scale.title.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].titleWeight,
  },
  body: {
    color: theme.text2,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
  },
  space: {
    height: spacing[1],
  },
})
}
