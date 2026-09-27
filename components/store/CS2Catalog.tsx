"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "../../app/cs2-items/page.module.css";
import { mockCs2Items } from "../../data/mockCs2Items";

const exteriorOptions = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function CS2Catalog() {
  const [search, setSearch] = useState("");
  const [weapon, setWeapon] = useState("");
  const [exterior, setExterior] = useState("");
  const [minFloat, setMinFloat] = useState("");
  const [maxFloat, setMaxFloat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("default");

  const weapons = useMemo(
    () => Array.from(new Set(mockCs2Items.map((item) => item.weapon))).sort(),
    [],
  );

  const filteredItems = useMemo(() => {
    const result = mockCs2Items.filter((item) => {
      const normalizedSearch = search.trim().toLowerCase();

      if (
        normalizedSearch &&
        !item.name.toLowerCase().includes(normalizedSearch) &&
        !item.weapon.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (weapon && item.weapon !== weapon) {
        return false;
      }

      if (exterior && item.exterior !== exterior) {
        return false;
      }

      if (minFloat && item.floatValue < Number(minFloat)) {
        return false;
      }

      if (maxFloat && item.floatValue > Number(maxFloat)) {
        return false;
      }

      if (minPrice && item.sellPriceUsdt < Number(minPrice)) {
        return false;
      }

      if (maxPrice && item.sellPriceUsdt > Number(maxPrice)) {
        return false;
      }

      if (availableOnly && item.stockQuantity <= 0) {
        return false;
      }

      return true;
    });

    if (sort === "price_asc") {
      result.sort((a, b) => a.sellPriceUsdt - b.sellPriceUsdt);
    }

    if (sort === "price_desc") {
      result.sort((a, b) => b.sellPriceUsdt - a.sellPriceUsdt);
    }

    if (sort === "float_asc") {
      result.sort((a, b) => a.floatValue - b.floatValue);
    }

    if (sort === "float_desc") {
      result.sort((a, b) => b.floatValue - a.floatValue);
    }

    return result;
  }, [
    search,
    weapon,
    exterior,
    minFloat,
    maxFloat,
    minPrice,
    maxPrice,
    availableOnly,
    sort,
  ]);

  function resetFilters() {
    setSearch("");
    setWeapon("");
    setExterior("");
    setMinFloat("");
    setMaxFloat("");
    setMinPrice("");
    setMaxPrice("");
    setAvailableOnly(false);
    setSort("default");
  }

  return (
    <div className={styles.catalog}>
      <aside className={styles.filters}>
        <h2 className={styles.filtersTitle}>فیلترها</h2>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="search">
            جستجو
          </label>

          <input
            id="search"
            type="search"
            placeholder="مثلاً Redline یا AWP"
            className={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="weapon">
            Weapon
          </label>

          <select
            id="weapon"
            className={styles.select}
            value={weapon}
            onChange={(event) => setWeapon(event.target.value)}
          >
            <option value="">همه</option>

            {weapons.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="exterior">
            Exterior
          </label>

          <select
            id="exterior"
            className={styles.select}
            value={exterior}
            onChange={(event) => setExterior(event.target.value)}
          >
            <option value="">همه</option>

            {exteriorOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Float Range</span>

          <div className={styles.rangeRow}>
            <input
              type="number"
              min="0"
              max="1"
              step="0.001"
              placeholder="Min"
              className={styles.input}
              value={minFloat}
              onChange={(event) => setMinFloat(event.target.value)}
            />

            <input
              type="number"
              min="0"
              max="1"
              step="0.001"
              placeholder="Max"
              className={styles.input}
              value={maxFloat}
              onChange={(event) => setMaxFloat(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>
            Price Range (USDT)
          </span>

          <div className={styles.rangeRow}>
            <input
              type="number"
              min="0"
              placeholder="Min"
              className={styles.input}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />

            <input
              type="number"
              min="0"
              placeholder="Max"
              className={styles.input}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) =>
                setAvailableOnly(event.target.checked)
              }
            />

            فقط آیتم‌های موجود
          </label>
        </div>

        <button
          type="button"
          className={styles.resetButton}
          onClick={resetFilters}
        >
          پاک کردن فیلترها
        </button>
      </aside>

      <div className={styles.main}>
        <div className={styles.toolbar}>
          <span className={styles.resultCount}>
            {filteredItems.length} آیتم
          </span>

          <select
            className={`${styles.select} ${styles.sort}`}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="مرتب‌سازی"
          >
            <option value="default">مرتب‌سازی پیش‌فرض</option>
            <option value="price_asc">قیمت: کم به زیاد</option>
            <option value="price_desc">قیمت: زیاد به کم</option>
            <option value="float_asc">Float: کم به زیاد</option>
            <option value="float_desc">Float: زیاد به کم</option>
          </select>
        </div>

        {filteredItems.length > 0 ? (
          <div className={styles.grid}>
            {filteredItems.map((item) => {
              const available = item.stockQuantity > 0;

              return (
                <article key={item.id} className={styles.card}>
                  <Link
                    href={`/cs2-items/${item.slug}`}
                    className={styles.image}
                  >
                    {item.weapon}
                  </Link>

                  <div className={styles.body}>
                    <div className={styles.topRow}>
                      <h2 className={styles.name}>
                        <Link
                          href={`/cs2-items/${item.slug}`}
                          className={styles.nameLink}
                        >
                          {item.name}
                        </Link>
                      </h2>

                      <span
                        className={
                          available
                            ? styles.stock
                            : styles.outOfStock
                        }
                      >
                        {available
                          ? `موجودی ${item.stockQuantity}`
                          : "ناموجود"}
                      </span>
                    </div>

                    <p className={styles.meta}>
                      {item.exterior}
                      <br />
                      Float: {item.floatValue}
                    </p>

                    <div className={styles.priceSection}>
                      <div className={styles.priceRow}>
                        <span className={styles.priceLabel}>
                          خرید از IRStore24
                        </span>

                        <span className={styles.priceValue}>
                          {formatToman(item.sellPriceToman)} تومان
                          <br />
                          {item.sellPriceUsdt} USDT
                        </span>
                      </div>

                      <div className={styles.priceRow}>
                        <span className={styles.priceLabel}>
                          فروش به IRStore24
                        </span>

                        <span className={styles.priceValue}>
                          {formatToman(item.buyPriceToman)} تومان
                          <br />
                          {item.buyPriceUsdt} USDT
                        </span>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.buyButton}
                        disabled={!available}
                      >
                        افزودن به سبد
                      </button>

                      <button
                        type="button"
                        className={styles.sellButton}
                      >
                        فروش
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            آیتمی با این فیلترها پیدا نشد.
          </div>
        )}
      </div>
    </div>
  );
}