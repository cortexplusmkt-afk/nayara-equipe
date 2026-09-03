export const USER_ROLES = [
  'ADMIN',
  'OPERATOR',
  'VIEWER',
] as const;

export type UserRole =
  (typeof USER_ROLES)[number];

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser =
  Omit<UserRecord, 'passwordHash'>;
