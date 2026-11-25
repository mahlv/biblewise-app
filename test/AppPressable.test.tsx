import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { AppPressable } from '../components/ui/AppPressable';

const mockTrigger = jest.fn();
jest.mock('../lib/haptics', () => ({
  triggerHaptic: (kind: string) => mockTrigger(kind),
}));

function render(element: React.ReactElement) {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(element);
  });
  return tree;
}

/** The inner RN Pressable: the node (other than AppPressable) that received our android_ripple prop. */
const getPressable = (tree: ReturnType<typeof create>) =>
  tree.root.findAll((node) => node.type !== AppPressable && 'android_ripple' in node.props)[0]!;

const press = (tree: ReturnType<typeof create>) => act(() => void getPressable(tree).props.onPress({}));

describe('AppPressable', () => {
  beforeEach(() => mockTrigger.mockClear());

  it('fires a light haptic and the caller handler on press', () => {
    const onPress = jest.fn();
    const tree = render(
      <AppPressable onPress={onPress}>
        <Text>ok</Text>
      </AppPressable>,
    );
    press(tree);
    expect(mockTrigger).toHaveBeenCalledWith('light');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the requested haptic and can be silenced', () => {
    const selection = render(<AppPressable haptic="selection" onPress={() => undefined} />);
    press(selection);
    expect(mockTrigger).toHaveBeenLastCalledWith('selection');

    mockTrigger.mockClear();
    const silent = render(<AppPressable haptic="none" onPress={() => undefined} />);
    press(silent);
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('does not touch haptics without an onPress handler', () => {
    const tree = render(<AppPressable />);
    expect(getPressable(tree).props.onPress).toBeUndefined();
  });

  it('uses a medium haptic on long press', () => {
    const onLongPress = jest.fn();
    const tree = render(<AppPressable onLongPress={onLongPress} />);
    act(() => void getPressable(tree).props.onLongPress({}));
    expect(mockTrigger).toHaveBeenCalledWith('medium');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the caller style function and adds the pressed feedback', () => {
    const tree = render(<AppPressable style={({ pressed }) => [{ padding: 4 }, pressed && { margin: 2 }]} />);
    const style = getPressable(tree).props.style as (state: { pressed: boolean }) => unknown[];

    expect(style({ pressed: false })).toEqual([[{ padding: 4 }, false], null, null]);
    expect(style({ pressed: true })).toEqual([[{ padding: 4 }, { margin: 2 }], { opacity: 0.85 }, null]);
  });

  it('shrinks instead of dimming with feedback="scale", and shows nothing for "none"', () => {
    const scale = render(<AppPressable feedback="scale" />);
    const scaleStyle = getPressable(scale).props.style as (state: { pressed: boolean }) => unknown[];
    expect(scaleStyle({ pressed: true })[2]).toEqual({ transform: [{ scale: 0.97 }] });

    const none = render(<AppPressable feedback="none" />);
    const noneStyle = getPressable(none).props.style as (state: { pressed: boolean }) => unknown[];
    expect(noneStyle({ pressed: true })).toEqual([undefined, null, null]);
  });
});
