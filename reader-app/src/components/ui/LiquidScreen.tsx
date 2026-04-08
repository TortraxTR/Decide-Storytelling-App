import React, { ReactNode } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  StatusBar,
  ScrollView,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';

type Props = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
};

export const LiquidScreen: React.FC<Props> = ({
  children,
  header,
  footer,
  scrollable = true,
  contentContainerStyle,
}) => {
  const Container = scrollable ? ScrollView : View;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#050817', '#0b1326', '#060e20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        {header && <View style={styles.header}>{header}</View>}
        <Container
          style={styles.container}
          contentContainerStyle={
            scrollable ? [styles.scrollContent, contentContainerStyle] : undefined
          }
        >
          {children}
        </Container>
        {footer && <View style={styles.footer}>{footer}</View>}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});