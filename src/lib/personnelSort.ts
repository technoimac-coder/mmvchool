import type { User } from '../types';

/** Sort by academic standing; preserve the original order for equal ranks. */
export function comparePersonnelRank(a: User, b: User): number {
  const rank = (user: User) => {
    const text = (user.academicPosition || '') + ' ' + (user.position || '');
    if (text.includes('เชี่ยวชาญพิเศษ')) return 4;
    if (text.includes('เชี่ยวชาญ')) return 3;
    if (text.includes('ชำนาญการพิเศษ')) return 2;
    if (text.includes('ชำนาญการ')) return 1;
    return 0;
  };
  return rank(b) - rank(a);
}
