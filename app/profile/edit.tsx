import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProfileTextField } from '../../components/ProfileTextField';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useToast } from '../../hooks/useToast';
import { AGE_RANGES, type AgeRange } from '../../lib/onboardingOptions';
import { isMissingNativeModule, pickAndUploadProfileImage } from '../../lib/profileImage';
import { brandGradient, colors, fonts, radius, spacing } from '../../theme/tokens';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR_SIZE = 120;

/** Edit profile: photo, name, age range, email, country, city and church. */
export default function EditProfileScreen() {
  const { anonymousId } = useOnboarding();
  const toast = useToast();
  const user = useQuery(api.users.getUserByAnonymousId, anonymousId ? { anonymousId } : 'skip');
  const generateUploadUrl = useMutation(api.users.generateProfileImageUploadUrl);
  const updateProfile = useMutation(api.users.updateUserProfile);

  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [churchName, setChurchName] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [newImageId, setNewImageId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill once; later live updates from Convex must not overwrite what the user is typing.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!user || hydrated.current) return;
    hydrated.current = true;
    setName(user.name ?? '');
    setAgeRange(user.ageRange);
    setEmail(user.email ?? '');
    setCountry(user.country ?? '');
    setCity(user.city ?? '');
    setChurchName(user.churchName ?? '');
  }, [user]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const handlePickImage = async () => {
    if (!anonymousId || uploading) return;
    setUploading(true);
    try {
      const picked = await pickAndUploadProfileImage(() => generateUploadUrl({ anonymousId }));
      if (picked) {
        setPreviewUri(picked.uri);
        setNewImageId(picked.storageId);
      }
    } catch (error) {
      if (isMissingNativeModule(error)) {
        Alert.alert('Atualização necessária', 'Atualize o app (nova build) para escolher a foto do perfil.');
      } else {
        Alert.alert('Não foi possível enviar a foto', 'Tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!anonymousId || saving || uploading) return;
    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_FORMAT.test(trimmedEmail)) {
      setEmailError('Digite um e-mail válido.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        anonymousId,
        name,
        email: trimmedEmail,
        country,
        city,
        churchName,
        ...(ageRange ? { ageRange } : {}),
        ...(newImageId ? { profileImageId: newImageId as Id<'_storage'> } : {}),
      });
      toast('Perfil atualizado com sucesso!');
      goBack();
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
      setSaving(false);
    }
  };

  const avatarUri = previewUri ?? user?.profileImageUrl ?? null;
  const initial = name.trim()[0]?.toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={styles.headerButton} />
      </View>

      {user === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={handlePickImage}
              accessibilityRole="button"
              accessibilityLabel="Alterar foto do perfil"
              style={styles.avatarWrapper}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={brandGradient.colors}
                  locations={brandGradient.locations}
                  start={brandGradient.start}
                  end={brandGradient.end}
                  style={styles.avatar}
                >
                  {initial ? (
                    <Text style={styles.initial}>{initial}</Text>
                  ) : (
                    <MaterialCommunityIcons name="account" size={56} color={colors.onPrimary} />
                  )}
                </LinearGradient>
              )}
              {uploading ? (
                <View style={[styles.avatar, styles.avatarOverlay]}>
                  <ActivityIndicator color={colors.onPrimary} />
                </View>
              ) : null}
              <View style={styles.cameraBadge}>
                <MaterialCommunityIcons name="camera" size={16} color={colors.onPrimary} />
              </View>
            </Pressable>

            <View style={styles.form}>
              <ProfileTextField label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="name" maxLength={80} />

              <View style={styles.ageGroup}>
                <Text style={styles.ageLabel}>Idade</Text>
                <View style={styles.chips}>
                  {AGE_RANGES.map((range) => {
                    const selected = ageRange === range;
                    return (
                      <Pressable
                        key={range}
                        onPress={() => setAgeRange(range)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{range}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <ProfileTextField
                label="E-mail"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="voce@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
              />
              <ProfileTextField label="País" value={country} onChangeText={setCountry} placeholder="Brasil" maxLength={120} />
              <ProfileTextField label="Cidade" value={city} onChangeText={setCity} placeholder="Sua cidade" maxLength={120} />
              <ProfileTextField
                label="Nome da Igreja"
                value={churchName}
                onChangeText={setChurchName}
                placeholder="Sua igreja"
                maxLength={120}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton label="Salvar" showArrow={false} onPress={handleSave} loading={saving} disabled={uploading} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xxl },
  avatarWrapper: { alignSelf: 'center' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: { position: 'absolute', backgroundColor: 'rgba(58,10,0,0.45)' },
  initial: { fontFamily: fonts.titleSemiBold, fontSize: 52, color: colors.onPrimary },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
  },
  form: { gap: spacing.lg },
  ageGroup: { gap: 6 },
  ageLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSurfaceVariant },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  chipSelected: { backgroundColor: colors.selectedContainer, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onSurfaceVariant },
  chipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.primary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
