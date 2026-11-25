import { Alert, Image, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { FunctionReturnType } from 'convex/server';
import type { api } from '../convex/_generated/api';
import { PRAYER_CATEGORY_COLORS } from '../lib/prayerCategories';
import { authorDisplayName, categoryLabel, prayerTypeLabel } from '../lib/prayerLabels';
import { haptics } from '../lib/haptics';
import { formatTimeAgo } from '../lib/timeAgo';
import { colors, fonts, radius, shadow, spacing } from '../theme/tokens';
import { AppPressable } from './ui/AppPressable';

export type PrayerView = FunctionReturnType<typeof api.prayers.listPrayers>['page'][number];

interface Props {
  prayer: PrayerView;
  onToggleAmen: (prayerId: PrayerView['_id']) => void;
  onReport: (prayerId: PrayerView['_id']) => void;
  onDelete: (prayerId: PrayerView['_id']) => void;
  /** Opens the post detail with its comments (omit it on the detail screen itself). */
  onOpen?: (prayerId: PrayerView['_id']) => void;
}

const BADGES = {
  request: { background: '#FBF1C8', text: '#7A5A00' },
  testimony: { background: '#C9D8FF', text: '#12358F' },
} as const;

/** Scripture box tone: pink for requests, green for testimonies. */
const SCRIPTURE_BOX = {
  request: { background: '#FFF0EA', quote: '#5C2A2A', reference: colors.primary, icon: 'format-quote-open' },
  testimony: { background: '#E9F5E1', quote: '#2F4A22', reference: colors.tertiary, icon: 'sprout' },
} as const;

const AVATAR_COLORS = ['#F2A5B8', '#9DB8F5', '#B7D9A5', '#F3C98B', '#C9B3F0'];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0]!;
}

function Avatar({ author }: { author: PrayerView['author'] }) {
  if (author.imageUrl) return <Image source={{ uri: author.imageUrl }} style={styles.avatar} />;
  if (author.isAnonymous) {
    return (
      <View style={[styles.avatar, styles.anonymousAvatar]}>
        <MaterialCommunityIcons name="hands-pray" size={22} color="#8E7BD1" />
      </View>
    );
  }
  return (
    <View style={[styles.avatar, { backgroundColor: avatarColor(author.name) }]}>
      <Text style={styles.initials}>{initialsOf(author.name)}</Text>
    </View>
  );
}

/** One prayer request or testimony on the wall. */
export function PrayerCard({ prayer, onToggleAmen, onReport, onDelete, onOpen }: Props) {
  const { t } = useTranslation();
  const badge = BADGES[prayer.type];
  const category = PRAYER_CATEGORY_COLORS[prayer.category];
  const scripture = SCRIPTURE_BOX[prayer.type];
  const hasScripture = !!prayer.scriptureText?.trim();

  const share = () => {
    const verse = hasScripture ? `\n\n“${prayer.scriptureText}”${prayer.scriptureReference ? ` — ${prayer.scriptureReference}` : ''}` : '';
    Share.share({ message: `${prayer.title}\n\n${prayer.content}${verse}` }).catch(() => undefined);
  };

  const openMenu = () => {
    if (prayer.isMine) {
      Alert.alert(t('prayer.card.yourPost'), undefined, [
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            Alert.alert(t('prayer.card.deleteTitle'), t('prayer.card.deleteBody'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: () => {
                  haptics.warning();
                  onDelete(prayer._id);
                },
              },
            ]),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(t('prayer.card.post'), undefined, [
      {
        text: t('prayer.card.report'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('prayer.card.reportTitle'), t('prayer.card.reportBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('prayer.card.report'),
              style: 'destructive',
              onPress: () => {
                haptics.warning();
                onReport(prayer._id);
              },
            },
          ]),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar author={prayer.author} />
        <View style={styles.authorTexts}>
          <Text style={styles.authorName} numberOfLines={2}>
            {authorDisplayName(prayer.author)}
          </Text>
          <Text style={styles.authorMeta} numberOfLines={1}>
            {prayer.author.location ? `${prayer.author.location}  •  ` : ''}
            {formatTimeAgo(prayer.createdAt)}
          </Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: badge.background }]}>
          <Text style={[styles.typeBadgeText, { color: badge.text }]}>{prayerTypeLabel(prayer.type)}</Text>
        </View>
      </View>

      <View style={[styles.categoryTag, { backgroundColor: category.background }]}>
        <Text style={[styles.categoryText, { color: category.text }]}>{categoryLabel(prayer.category)}</Text>
      </View>

      <AppPressable
        onPress={onOpen ? () => onOpen(prayer._id) : undefined}
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? t('prayer.card.open', { title: prayer.title }) : undefined}
        style={styles.textBlock}
      >
        <Text style={styles.title}>{prayer.title}</Text>
        <Text style={styles.body}>{prayer.content}</Text>
      </AppPressable>

      {hasScripture ? (
        <View style={[styles.scripture, { backgroundColor: scripture.background }]}>
          <MaterialCommunityIcons name={scripture.icon} size={20} color={scripture.reference} style={styles.scriptureIcon} />
          <View style={styles.scriptureTexts}>
            <Text style={[styles.scriptureQuote, { color: scripture.quote }]}>“{prayer.scriptureText}”</Text>
            {prayer.scriptureReference ? (
              <Text style={[styles.scriptureReference, { color: scripture.reference }]}>{prayer.scriptureReference.toUpperCase()}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <AppPressable haptic="selection"
          onPress={() => onToggleAmen(prayer._id)}
          accessibilityRole="button"
          accessibilityLabel={prayer.amenedByMe ? t('prayer.card.unlike') : t('prayer.card.like')}
          accessibilityState={{ selected: prayer.amenedByMe }}
          style={({ pressed }) => [styles.amen, prayer.amenedByMe && styles.amenActive, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons name={prayer.amenedByMe ? 'heart' : 'heart-outline'} size={16} color={prayer.amenedByMe ? colors.onPrimary : colors.primary} />
          <View style={[styles.amenCount, prayer.amenedByMe && styles.amenCountActive]}>
            <Text style={[styles.amenCountText, prayer.amenedByMe && styles.amenLabelActive]}>{prayer.amenCount}</Text>
          </View>
        </AppPressable>

        <View style={styles.actions}>
          <AppPressable
            onPress={onOpen ? () => onOpen(prayer._id) : undefined}
            disabled={!onOpen}
            accessibilityRole="button"
            accessibilityLabel={t('prayer.card.comments', { count: prayer.commentCount })}
            hitSlop={8}
            style={styles.action}
          >
            <MaterialCommunityIcons name="comment-outline" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.actionCount}>{prayer.commentCount}</Text>
          </AppPressable>
          <AppPressable onPress={share} accessibilityRole="button" accessibilityLabel={t('common.share')} hitSlop={8}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.onSurfaceVariant} />
          </AppPressable>
          <AppPressable onPress={openMenu} accessibilityRole="button" accessibilityLabel={t('home.recent.moreOptions')} hitSlop={8}>
            <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.onSurfaceVariant} />
          </AppPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, ...shadow },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  anonymousAvatar: { backgroundColor: '#EDE7FF' },
  initials: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
  authorTexts: { flex: 1, gap: 2 },
  authorName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
  authorMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
  typeBadge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  typeBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12 },
  categoryTag: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  categoryText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6 },
  textBlock: { gap: spacing.md },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 24, lineHeight: 30, color: colors.onSurface },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.onSurfaceVariant },
  scripture: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.lg },
  scriptureIcon: { marginTop: 2 },
  scriptureTexts: { flex: 1, gap: 6 },
  scriptureQuote: { fontFamily: fonts.verseItalic, fontSize: 16, lineHeight: 22 },
  scriptureReference: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  amen: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.selectedIconContainer, borderRadius: radius.pill, paddingLeft: spacing.md, paddingRight: spacing.sm, paddingVertical: 8 },
  amenActive: { backgroundColor: colors.primary },
  amenLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  amenLabelActive: { color: colors.onPrimary },
  amenCount: { minWidth: 26, alignItems: 'center', backgroundColor: 'rgba(185,0,57,0.12)', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  amenCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  amenCountText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.onSurfaceVariant },
});
