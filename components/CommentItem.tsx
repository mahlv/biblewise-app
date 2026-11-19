import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FunctionReturnType } from 'convex/server';
import type { api } from '../convex/_generated/api';
import { formatTimeAgo } from '../lib/timeAgo';
import { colors, fonts, radius, spacing } from '../theme/tokens';

export type CommentView = FunctionReturnType<typeof api.comments.listComments>['page'][number];

interface Props {
  comment: CommentView;
  /** The viewer wrote the post, so they may delete any comment on it. */
  viewerIsPostAuthor: boolean;
  onDelete: (commentId: CommentView['_id']) => void;
  onReport: (commentId: CommentView['_id']) => void;
}

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

/** One flat comment under a post. */
export function CommentItem({ comment, viewerIsPostAuthor, onDelete, onReport }: Props) {
  const { author } = comment;
  const canDelete = comment.isMine || viewerIsPostAuthor;

  const openMenu = () => {
    const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];
    if (canDelete) {
      buttons.push({
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Excluir comentário?', undefined, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => onDelete(comment._id) },
          ]),
      });
    }
    if (!comment.isMine) {
      buttons.push({
        text: 'Denunciar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Denunciar comentário?', 'Comentários denunciados por várias pessoas são ocultados.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Denunciar', style: 'destructive', onPress: () => onReport(comment._id) },
          ]),
      });
    }
    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Comentário', undefined, buttons);
  };

  return (
    <View style={styles.row}>
      {author.imageUrl ? (
        <Image source={{ uri: author.imageUrl }} style={styles.avatar} />
      ) : author.isAnonymous ? (
        <View style={[styles.avatar, styles.anonymousAvatar]}>
          <MaterialCommunityIcons name="hands-pray" size={18} color="#8E7BD1" />
        </View>
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor(author.name) }]}>
          <Text style={styles.initials}>{initialsOf(author.name)}</Text>
        </View>
      )}

      <View style={styles.bubble}>
        <View style={styles.top}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {author.name}
            </Text>
            {comment.isPostAuthor ? (
              <View style={styles.authorBadge}>
                <Text style={styles.authorBadgeText}>Autor</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.time}>{formatTimeAgo(comment.createdAt)}</Text>
          <Pressable onPress={openMenu} accessibilityRole="button" accessibilityLabel="Mais opções do comentário" hitSlop={8}>
            <MaterialCommunityIcons name="dots-horizontal" size={20} color={colors.outline} />
          </Pressable>
        </View>
        <Text style={styles.content}>{comment.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  anonymousAvatar: { backgroundColor: '#EDE7FF' },
  initials: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onPrimary },
  bubble: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurface },
  authorBadge: { backgroundColor: colors.selectedIconContainer, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  authorBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.outline },
  content: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant },
});
