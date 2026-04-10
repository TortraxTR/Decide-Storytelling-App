import { TextStyle } from 'react-native';
import { colors } from './colors';

type TextStyles = {
  displayLg: TextStyle;
  headline: TextStyle;
  title: TextStyle;
  titleSm: TextStyle;
  body: TextStyle;
  bodySm: TextStyle;
  label: TextStyle;
  meta: TextStyle;
};

export const textStyles: TextStyles = {
  displayLg: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.onSurface,
  },
  headline: {
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 24,
    lineHeight: 30,
    color: colors.onSurface,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
  },
  titleSm: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  bodySm: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
  },
  meta: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.onSurfaceVariant,
  },
};