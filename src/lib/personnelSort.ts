import type { User } from '../types';

/** Keep school leadership first, then sort each group by academic rank. */
export function comparePersonnelRank(a: User, b: User): number {
  const leadership = (user: User) => {
    const position = user.position || '';
    if (user.role === 'director' || (position.includes('ผู้อำนวยการ') && !position.includes('รอง'))) return 2;
    if (user.role?.startsWith('deputy_') || position.includes('รองผู้อำนวยการ')) return 1;
    return 0;
  };
  const rank = (user: User) => {
    const text = (user.academicPosition || '') + ' ' + (user.position || '');
    if (text.includes('เชี่ยวชาญพิเศษ')) return 4;
    if (text.includes('เชี่ยวชาญ')) return 3;
    if (text.includes('ชำนาญการพิเศษ')) return 2;
    if (text.includes('ชำนาญการ')) return 1;
    return 0;
  };
  return leadership(b) - leadership(a) || rank(b) - rank(a);
}
