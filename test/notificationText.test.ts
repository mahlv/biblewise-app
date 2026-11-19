import { notificationMessage } from '../lib/notificationText';

describe('notificationMessage', () => {
  it('describes a like on a prayer request', () => {
    expect(notificationMessage({ type: 'like', prayerType: 'request', actorName: 'Maria', prayerTitle: 'Restauração da Saúde' })).toEqual({
      headline: 'Maria curtiu seu pedido',
      detail: '“Restauração da Saúde”',
    });
  });

  it('uses "testemunho" for testimonies', () => {
    expect(notificationMessage({ type: 'like', prayerType: 'testimony', actorName: 'João', prayerTitle: 'Gratidão' }).headline).toBe(
      'João curtiu seu testemunho',
    );
    expect(notificationMessage({ type: 'comment', prayerType: 'testimony', actorName: 'João', prayerTitle: 'Gratidão' }).headline).toBe(
      'João comentou no seu testemunho',
    );
  });

  it('shows the comment preview as the detail of a comment', () => {
    expect(
      notificationMessage({ type: 'comment', prayerType: 'request', actorName: 'Ana', prayerTitle: 'Paz', previewText: 'Estou orando por você!' }),
    ).toEqual({ headline: 'Ana comentou no seu pedido', detail: '“Estou orando por você!”' });
  });

  it('falls back to "Alguém" and to the post title when data is missing', () => {
    expect(notificationMessage({ type: 'comment', prayerType: 'request', actorName: '  ', prayerTitle: 'Paz' })).toEqual({
      headline: 'Alguém comentou no seu pedido',
      detail: '“Paz”',
    });
  });

  it('truncates long titles and previews with an ellipsis', () => {
    const title = 'T'.repeat(80);
    const like = notificationMessage({ type: 'like', prayerType: 'request', actorName: 'Ana', prayerTitle: title });
    expect(like.detail).toBe(`“${'T'.repeat(59)}…”`);

    const comment = notificationMessage({ type: 'comment', prayerType: 'request', actorName: 'Ana', prayerTitle: 'x', previewText: 'a '.repeat(80) });
    expect(comment.detail.endsWith('…”')).toBe(true);
    expect(comment.detail.length).toBeLessThanOrEqual(104);
  });
});
