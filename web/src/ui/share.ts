/** Web Share API nếu có, không thì sao chép vào clipboard. Không bao giờ ném lỗi. */
export async function share(url: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: Navigator['share'] }) : undefined;
  if (nav?.share) {
    try {
      await nav.share({ url, text, title: document.title });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    if (!nav?.clipboard?.writeText) return 'failed';
    await nav.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
