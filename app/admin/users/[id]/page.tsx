import Link from "next/link";
import { notFound } from "next/navigation";

import UserManagementPanel from "../../../../components/admin/UserManagementPanel";
import { getMockUserById } from "../../../../data/mockUsers";

import styles from "../../admin.module.css";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function AdminUserDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    notFound();
  }

  const user = getMockUserById(userId);

  if (!user) {
    notFound();
  }

  return (
    <>
      <Link
        href="/admin/users"
        className={styles.adminBackLink}
      >
        ← بازگشت به کاربران
      </Link>

      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / Users / Detail
        </span>

        <h1 className={styles.pageTitle}>
          {user.email}
        </h1>

        <p className={styles.pageDescription}>
          مشاهده وضعیت حساب، Role و اطلاعات Ban کاربر.
        </p>
      </header>

      <section className={styles.userDetailGrid}>
        <div className={styles.userDetailCard}>
          <span className={styles.userDetailLabel}>
            User ID
          </span>

          <strong className={styles.userDetailValue}>
            {user.id}
          </strong>
        </div>

        <div className={styles.userDetailCard}>
          <span className={styles.userDetailLabel}>
            Role
          </span>

          <strong className={styles.userDetailValue}>
            {user.role}
          </strong>
        </div>

        <div className={styles.userDetailCard}>
          <span className={styles.userDetailLabel}>
            Account
          </span>

          <strong className={styles.userDetailValue}>
            {user.isActive
              ? "فعال"
              : "غیرفعال"}
          </strong>
        </div>

        <div className={styles.userDetailCard}>
          <span className={styles.userDetailLabel}>
            Ban Status
          </span>

          <strong className={styles.userDetailValue}>
            {!user.isBanned
              ? "بدون Ban"
              : user.banType === "permanent"
                ? "Permanent"
                : "Temporary"}
          </strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            اطلاعات حساب
          </h2>
        </div>

        <div className={styles.userInfoRows}>
          <div className={styles.userInfoRow}>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>

          <div className={styles.userInfoRow}>
            <span>Created</span>
            <strong>
              {formatDate(user.createdAt)}
            </strong>
          </div>

          <div className={styles.userInfoRow}>
            <span>Updated</span>
            <strong>
              {formatDate(user.updatedAt)}
            </strong>
          </div>

          <div className={styles.userInfoRow}>
            <span>Ban Type</span>
            <strong>
              {user.banType ?? "—"}
            </strong>
          </div>

          <div className={styles.userInfoRow}>
            <span>Banned Until</span>
            <strong>
              {formatDate(user.bannedUntil)}
            </strong>
          </div>

          <div className={styles.userInfoRow}>
            <span>Ban Reason</span>
            <strong>
              {user.banReason ?? "—"}
            </strong>
          </div>
        </div>
      </section>

      <UserManagementPanel
        userId={user.id}
        isActive={user.isActive}
        isBanned={user.isBanned}
      />
    </>
  );
}
