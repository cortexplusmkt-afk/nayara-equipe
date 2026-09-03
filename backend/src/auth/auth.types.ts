import {
  type UserRole,
} from '../users/user.types.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
