"use client";

import { FormEvent, useState } from "react";

import styles from "../../app/admin/admin.module.css";

type UserManagementPanelProps = {
  userId: number;
  isActive: boolean;
  isBanned: boolean;
};

type BanType = "temporary" | "permanent";

export default function UserManagementPanel({
  userId,
  isActive,
  isBanned,
}: UserManagementPanelProps) {
  const [banType, setBanType] =
    useState<BanType>("temporary");

  const [bannedUntil, setBannedUntil] =
    useState("");

  const [banReason, setBanReason] =
    useState("");

  function handleBan(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    /*
     * UI only for now.
     * FastAPI will handle the real ban operation.
     */
  }

  return (
    <section className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>
          مدیریت کاربر
        </h2>

        <p className={styles.formSectionDescription}>
          User ID: {userId}
        </p>
      </div>

      {!isBanned ? (
        <form
          className={styles.adminForm}
          onSubmit={handleBan}
        >
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="banType">
                Ban Type
              </label>

              <select
                id="banType"
                value={banType}
                onChange={(event) =>
                  setBanType(
                    event.target.value as BanType,
                  )
                }
              >
                <option value="temporary">
                  Temporary
                </option>

                <option value="permanent">
                  Permanent
                </option>
              </select>
            </div>

            {banType === "temporary" && (
              <div className={styles.formField}>
                <label htmlFor="bannedUntil">
                  Banned Until
                </label>

                <input
                  id="bannedUntil"
                  type="datetime-local"
                  required
                  value={bannedUntil}
                  onChange={(event) =>
                    setBannedUntil(
                      event.target.value,
                    )
                  }
                />
              </div>
            )}

            <div
              className={`${styles.formField} ${styles.formFieldFull}`}
            >
              <label htmlFor="banReason">
                دلیل Ban
              </label>

              <textarea
                id="banReason"
                rows={4}
                required
                placeholder="دلیل Ban کاربر..."
                value={banReason}
                onChange={(event) =>
                  setBanReason(
                    event.target.value,
                  )
                }
              />
            </div>
          </div>

          <div className={styles.userManagementActions}>
            <button
              type="submit"
              className={styles.banManagementButton}
            >
              Ban User
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.userManagementActions}>
          <button
            type="button"
            className={styles.unbanManagementButton}
          >
            Unban User
          </button>
        </div>
      )}

      <div className={styles.managementDivider} />

      <div className={styles.userManagementActions}>
        <button
          type="button"
          className={
            isActive
              ? styles.deactivateManagementButton
              : styles.activateManagementButton
          }
        >
          {isActive
            ? "غیرفعال‌سازی حساب"
            : "فعال‌سازی حساب"}
        </button>
      </div>

      <p className={styles.formNotice}>
        عملیات واقعی بعداً توسط FastAPI انجام می‌شود.
        هنگام Ban یا Deactivate شدن User، Sessionهای فعال
        نیز باید revoke شوند.
      </p>
    </section>
  );
}
