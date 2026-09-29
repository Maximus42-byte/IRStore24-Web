export type UserRole =
  | "user"
  | "admin";

export type UserBanType =
  | "temporary"
  | "permanent";

export type MockUser = {
  id: number;
  email: string;

  role: UserRole;

  isActive: boolean;

  isBanned: boolean;
  banType: UserBanType | null;
  bannedUntil: string | null;
  banReason: string | null;

  createdAt: string;
  updatedAt: string;
};

export const mockUsers: MockUser[] = [
  {
    id: 1,
    email: "user@example.com",

    role: "user",

    isActive: true,

    isBanned: false,
    banType: null,
    bannedUntil: null,
    banReason: null,

    createdAt:
      "2026-09-10T12:00:00+03:30",

    updatedAt:
      "2026-09-10T12:00:00+03:30",
  },

  {
    id: 2,
    email: "admin@example.com",

    role: "admin",

    isActive: true,

    isBanned: false,
    banType: null,
    bannedUntil: null,
    banReason: null,

    createdAt:
      "2026-09-01T10:00:00+03:30",

    updatedAt:
      "2026-09-01T10:00:00+03:30",
  },

  {
    id: 3,
    email: "temporary@example.com",

    role: "user",

    isActive: true,

    isBanned: true,
    banType: "temporary",

    bannedUntil:
      "2026-10-05T12:00:00+03:30",

    banReason:
      "Temporary test ban",

    createdAt:
      "2026-09-12T14:30:00+03:30",

    updatedAt:
      "2026-09-28T18:00:00+03:30",
  },

  {
    id: 4,
    email: "banned@example.com",

    role: "user",

    isActive: true,

    isBanned: true,
    banType: "permanent",

    bannedUntil: null,

    banReason:
      "Permanent test ban",

    createdAt:
      "2026-09-15T09:15:00+03:30",

    updatedAt:
      "2026-09-28T20:00:00+03:30",
  },
];

export function getMockUserById(
  id: number,
) {
  return mockUsers.find(
    (user) => user.id === id,
  );
}
