export const POSITIONS: Record<string, number> = {
  '사원': 1,
  '대리': 2,
  '과장': 3,
  '차장': 4,
  '부장': 5,
  '임원': 6
};

export const POSITION_LIST = ['사원', '대리', '과장', '차장', '부장', '임원'] as const;

export const DEPARTMENTS = ['일반부서', '재무팀', '인사팀', '보안팀'] as const;

export const ROLES = [
  { value: 'USER', label: '일반 사용자' },
  { value: 'FINANCE', label: '재무 관리자' },
  { value: 'ADMIN', label: '시스템 관리자' }
] as const;
