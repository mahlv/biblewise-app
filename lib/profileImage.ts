import { Alert, Linking } from 'react-native';
import { File } from 'expo-file-system';

export interface PickedProfileImage {
  /** Local file URI, usable right away as a preview. */
  uri: string;
  /** Convex storage id of the uploaded file. */
  storageId: string;
}

/** True when the error means the native picker module is missing from the installed build. */
export const isMissingNativeModule = (error: unknown): boolean =>
  /cannot find native module|could not be found|is undefined|null is not an object|undefined is not an object/i.test(
    String(error instanceof Error ? error.message : error),
  );

/**
 * Lets the user pick a square photo and uploads it to Convex File Storage.
 * Returns `null` when the user cancels or denies the permission.
 *
 * The picker is loaded lazily so a build without the native module doesn't
 * crash on import (same approach as the quote-art sharing).
 */
export async function pickAndUploadProfileImage(
  generateUploadUrl: () => Promise<string>,
): Promise<PickedProfileImage | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker');

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permissão necessária', 'Permita o acesso às fotos nas configurações para escolher a foto do perfil.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
    ]);
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  const uploadUrl = await generateUploadUrl();
  // Convex stores the raw request body, so send the file itself (not multipart FormData).
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': asset.mimeType ?? 'image/jpeg' },
    body: new File(asset.uri),
  });
  if (!response.ok) throw new Error('Upload failed.');

  const { storageId } = (await response.json()) as { storageId?: unknown };
  if (typeof storageId !== 'string') throw new Error('Upload failed.');
  return { uri: asset.uri, storageId };
}
