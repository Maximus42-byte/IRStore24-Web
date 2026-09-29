import Link from "next/link";

import { mockUsers } from "../../../data/mockUsers";

import styles from "../admin.module.css";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const activeUsers = mockUsers.filter(
    (user) => user.isActive,
  ).length;

  const bannedUsers = mockUsers.filter(
    (user) => user.isBanned,
  ).length;

  const adminUsers = mockUsers.filter(
    (user) => user.role === "admin",
  ).length;

  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / Users
        </span>

        <h1 className={styles.pageTitle}>
          مدیریت کاربران
        </h1>

        <p className={styles.pageDescription}>
          مشاهده کاربران، Role، وضعیت حساب و وضعیت Ban.
          عملیات واقعی مدیریت User بعداً از طریق FastAPI
          انجام خواهد شد.
        </p>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Total Users
          </div>

          <div className={styles.statValue}>
            {mockUsers.length}
          </div>

          <div className={styles.statHint}>
            کل کاربران Mock
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Active Accounts
          </div>

          <div className={styles.statValue}>
            {activeUsers}
          </div>

          <div className={styles.statHint}>
            حساب فعال
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Banned
          </div>

          <div className={styles.statValue}>
            {bannedUsers}
          </div>

          <div className={styles.statHint}>
            Temporary یا Permanent
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Admins
          </div>

          <div className={styles.statValue}>
            {adminUsers}
          </div>

          <div className={styles.statHint}>
            role = admin
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              Users
            </h2>

            <p className={styles.tableDescription}>
              اطلاعات فعلی از Mock Data خوانده می‌شوند.
            </p>
          </div>
        </div>

        <div className={styles.adminTableWrapper}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Account</th>
                <th>Ban Status</th>
                <th>Banned Until</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong
                      className={styles.itemName}
                    >
                      {user.email}
                    </strong>

                    <span
                      className={styles.itemMeta}
                    >
                      ID: {user.id}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        user.role === "admin"
                          ? styles.userRoleAdmin
                          : styles.userRoleUser
                      }
                    >
                      {user.role}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        user.isActive
                          ? styles.userStatusActive
                          : styles.userStatusInactive
                      }
                    >
                      {user.isActive
                        ? "فعال"
                        : "غیرفعال"}
                    </span>
                  </td>

                  <td>
                    {!user.isBanned ? (
                      <span
                        className={
                          styles.userBanNone
                        }
                      >
                        بدون Ban
                      </span>
                    ) : (
                      <div>
                        <span
                          className={
                            user.banType ===
                            "permanent"
                              ? styles.userBanPermanent
                              : styles.userBanTemporary
                          }
                        >
                          {user.banType ===
                          "permanent"
                            ? "Permanent"
                            : "Temporary"}
                        </span>

                        {user.banReason && (
                          <span
                            className={
                              styles.userBanReason
                            }
                          >
                            {user.banReason}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        styles.tablePrimaryValue
                      }
                    >
                      {formatDate(
                        user.bannedUntil,
                      )}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        styles.tablePrimaryValue
                      }
                    >
                      {formatDate(
                        user.createdAt,
                      )}
                    </span>
                  </td>

                  <td>
                    <div
                      className={
                        styles.userActions
                      }
                    >
                      <Link
                        href={`/admin/users/${user.id}`}
                        className={
                          styles.viewOrderButton
                        }
                      >
                        مشاهده
                      </Link>

                      {user.isBanned ? (
                        <button
                          type="button"
                          className={
                            styles.unbanUserButton
                          }
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={
                            styles.banUserButton
                          }
                        >
                          Ban
                        </button>
                      )}

                      <button
                        type="button"
                        className={
                          styles.deactivateUserButton
                        }
                      >
                        {user.isActive
                          ? "غیرفعال‌سازی"
                          : "فعال‌سازی"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
