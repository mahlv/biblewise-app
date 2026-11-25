const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
    setItem: (key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    },
  },
}));

const mockImpact = jest.fn((_style?: string) => Promise.resolve());
const mockSelection = jest.fn(() => Promise.resolve());
const mockNotification = jest.fn((_type?: string) => Promise.resolve());
const mockNativeModule = jest.fn();

jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: (name: string) => mockNativeModule(name),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: (style: string) => mockImpact(style),
  selectionAsync: () => mockSelection(),
  notificationAsync: (type: string) => mockNotification(type),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

/** Fresh module state (cached native module, throttle clock, preference) for each test. */
function loadHaptics(): typeof import('../lib/haptics') {
  jest.resetModules();
  return require('../lib/haptics');
}

describe('haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.clear();
    mockNativeModule.mockReturnValue({});
  });

  it('maps each kind to the right expo-haptics call', () => {
    const { triggerHaptic } = loadHaptics();
    let now = 1000;
    const fire = (kind: Parameters<typeof triggerHaptic>[0]) => triggerHaptic(kind, (now += 100));

    fire('light');
    fire('medium');
    fire('selection');
    fire('success');
    fire('warning');
    fire('error');

    expect(mockImpact.mock.calls).toEqual([['light'], ['medium']]);
    expect(mockSelection).toHaveBeenCalledTimes(1);
    expect(mockNotification.mock.calls).toEqual([['success'], ['warning'], ['error']]);
  });

  it('collapses haptics fired within the throttle window', () => {
    const { triggerHaptic } = loadHaptics();
    triggerHaptic('light', 1000);
    triggerHaptic('light', 1010);
    triggerHaptic('selection', 1039);
    triggerHaptic('light', 1041);
    expect(mockImpact).toHaveBeenCalledTimes(2);
    expect(mockSelection).not.toHaveBeenCalled();
  });

  it('does nothing when the build has no native module', () => {
    mockNativeModule.mockReturnValue(null);
    const { triggerHaptic } = loadHaptics();
    expect(() => triggerHaptic('success', 1000)).not.toThrow();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('is silent while disabled and remembers the choice', async () => {
    const first = loadHaptics();
    await first.setHapticsEnabled(false);
    first.triggerHaptic('light', 1000);
    expect(mockImpact).not.toHaveBeenCalled();
    expect(first.isHapticsEnabled()).toBe(false);

    // A new app start reads the saved preference.
    const second = loadHaptics();
    expect(second.isHapticsEnabled()).toBe(true);
    expect(await second.loadHapticsPreference()).toBe(false);
    second.triggerHaptic('light', 2000);
    expect(mockImpact).not.toHaveBeenCalled();

    await second.setHapticsEnabled(true);
    second.triggerHaptic('light', 3000);
    expect(mockImpact).toHaveBeenCalledTimes(1);
  });

  it('never throws when the native call fails', () => {
    mockImpact.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const { triggerHaptic } = loadHaptics();
    expect(() => triggerHaptic('light', 1000)).not.toThrow();
  });
});
