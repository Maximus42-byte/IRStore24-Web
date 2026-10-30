# IRStore24 — راهنمای استقرار مجدد و انتقال به VPS جدید

> **به‌روزرسانی استقرار زنده (2026-10-30):** اپراتور تأیید کرده است که پروژه `irstore24-staging` همین حالا Production است و Nginx تصاویر را از `/srv/irstore24/media` می‌خواند. دستورهای تاریخی دو فایلی این سند برای انتشار نسخه جدید کافی نیستند؛ قبل از هر عملیات زنده از سه فایل Compose و دستورهای دقیق بخش 15 استفاده کن. این به‌روزرسانی فقط در مخزن محلی انجام شده و VPS دست‌کاری نشده است.

**نسخه سند:** 2026-10-30

**هدف:** بتوان IRStore24 را روی یک Ubuntu VPS تازه بالا آورد، یا از VPS فعلی همراه با کاربران، سفارش‌ها، تنظیمات و تصاویر به سرور جدید منتقل کرد؛ بدون شروع مجدد از صفر و بدون حذف داده‌ها.

> **مهم:** این یک Runbook عملیاتی است، نه اسکریپت «همه‌چیز را یک‌باره اجرا کن». در هر بخش، حداکثر سه گام را اجرا و نتیجه را بررسی کن؛ قبل از ادامه به مرحله بعدی توقف کن. دستورهای دارای `OLD_*`، `NEW_*` و `<...>` الگو هستند و نباید بدون جایگزینی و بررسی اجرا شوند. هر دستور محل اجرا دارد.
>
> **این سند هیچ Credential یا Secret ندارد.** رمز دیتابیس، رمز کاربران، Private SSH Key، API Token، محتوای `.env` و Private Key گواهی TLS نباید در GitHub، این سند یا چت قرار بگیرند.

## 0. نقشه سریع و وضعیت تأییدشده

### 0.1 معماری فعلی (در زمان نگارش)

```text
Internet
  └─ DNS: irstore24.ir / www.irstore24.ir
      └─ VPS: Ubuntu 24.04, host Nginx, Let's Encrypt/Certbot
          ├─ HTTPS /         → 127.0.0.1:3100 → Docker Next.js :3000
          ├─ HTTPS /api/*    → 127.0.0.1:8100 → Docker FastAPI :8000
          └─ HTTPS /media/* → /srv/irstore24/media/ (host filesystem)
                                  |
                  FastAPI → Docker-internal PostgreSQL :5432
```

- کد: `https://github.com/Maximus42-byte/IRStore24-Web`
- نسخه در زمان بررسی: شاخه `feature/storefront-mvp`، commit `392c052`. **در روز مهاجرت، Commit واقعی Deploy‌شده را دوباره ثبت کن**؛ این مقدار ممکن است تغییر کرده باشد.
- Checkout عملیاتی: `/opt/irstore24-staging` (با وجود واژه staging، **هم‌اکنون Production** است).
- Docker Compose Project عملیاتی: `irstore24-staging`.
- فایل‌های Compose عملیاتی: `docker-compose.yml` و `docker-compose.staging.yml` **با هم و به همین ترتیب**.
- فایل Environment خصوصی: `/etc/irstore24/staging.env`، خارج از Git؛ در وضعیت فعلی نام دیتابیس `irstore24_staging` است. نام کاربر/رمز را از محیط امن سرور و بدون انتشار بررسی کن.
- Volume پایدار PostgreSQL: `irstore24-staging_postgres_data` (از حذف آن اجتناب کن).
- کانتینرها: `irstore24-staging-web-1`، `irstore24-staging-api-1`، `irstore24-staging-db-1`.
- کانتینر قدیمی `irstore24-web` روی `127.0.0.1:3000` نگه داشته شده، اما **سایت فعال جدید از آن استفاده نمی‌کند**.
- Nginx سایت: `/etc/nginx/sites-available/irstore24` و لینک آن در `sites-enabled`.
- فایل‌های TLS: `/etc/letsencrypt/live/irstore24.ir/`; گواهی برای دامنه اصلی و `www`.
- Storage تصاویر: `/srv/irstore24/media/cs2`؛ مسیر وجود دارد. در نسخه فعلی **Upload API وجود ندارد**؛ تصاویر ممکن است دستی اضافه شوند.
- دو Admin اولیه: حساب‌های DB ID شماره ۱ و ۲ (برای تأیید هویت فقط از دیتابیس استفاده کن، رمز یا ایمیل کامل در سند ثبت نکن).
- سرویس انقضای سفارش: `irstore24-expire-orders.service` و `.timer`، هر دقیقه، آخرین اجرای خودکار با `Expired 0 order(s)` موفق بوده است.
- سرویس Backup روزانه: `irstore24-backup-db.service` و `.timer`، `03:15 UTC`، اجرای دستی موفق؛ خروجی در `/root/irstore24-backups/`.
- در آخرین بررسی‌ها: HTTPS / و /login پاسخ 200؛ `/api/health` و `/api/health/database` پاسخ OK؛ ۳ کانتینر جدید Healthy. **این‌ها وضعیت روز گزارش‌اند نه تضمین دائمی.**

**نکته تاریخی:** فایل `IRStore24-PROJECT-STATE.md` مربوط به 2026-08-13 است و هنوز فاز Under Construction را توصیف می‌کند؛ برای وضعیت فعلی، همین سند و بازرسی زنده مقدم‌اند. فایل تاریخی را بدون بررسی واقعی مبنای مهاجرت قرار نده.

### 0.2 چه چیزهایی همراه Git جابه‌جا نمی‌شوند؟

| منبع | روش انتقال | اهمیت |
|---|---|---|
| Source Code | Git با Commit/Tag مشخص | ضروری |
| Environment / Secrets | انتقال امن جداگانه، mode `0600` | ضروری؛ هرگز Git |
| PostgreSQL | `pg_dump -Fc` و `pg_restore` با تست بازیابی | ضروری؛ شامل کاربران، سفارش‌ها، تنظیمات پرداخت و Sessionها |
| Product Media | `rsync`/انتقال امن `/srv/irstore24/media/` | ضروری |
| Nginx vhost | نسخه پشتیبان + ایجاد/تطبیق روی سرور جدید | ضروری |
| TLS Certificate | صدور/اعتبارسنجی روی سرور جدید؛ خصوصی نگه‌داشتن کلید | ضروری |
| systemd services/timers | نصب مجدد مطابق مسیر واقعی | ضروری |
| Backup archive | کپی رمزگذاری‌شده یا امن خارج از سرور | ضروری |
| DNS | تغییر رکوردهای `@` و `www` به IP جدید در زمان Cutover | ضروری |
| Docker Images | Build از Commit مشخص یا Registry معتبر | قابل بازسازی |

**حکم مهم درباره نام staging:** فعلاً برای مهاجرت، همان نام مسیر و Compose Project را حفظ کن تا خطر انتخاب Volume اشتباه به حداقل برسد. تغییر نام به `production` پروژه جداگانه‌ای است و نباید هم‌زمان با انتقال سرور انجام شود.

---

## 1. فاز آماده‌سازی و ثبت وضعیت سرور مبدأ — بدون تغییر

**گام 1 — Production VPS قدیمی (Read-only):**

```bash
hostnamectl
uname -a
docker --version && docker compose version
systemctl is-active nginx docker
```

**گام 2 — Production VPS قدیمی (Read-only):**

```bash
cd /opt/irstore24-staging
git status --short --branch
git rev-parse HEAD
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml ps
docker volume ls | grep irstore24
```

**گام 3 — Production VPS قدیمی (Read-only):**

```bash
nginx -t
sudo certbot certificates
systemctl is-enabled irstore24-expire-orders.timer irstore24-backup-db.timer
systemctl is-active irstore24-expire-orders.timer irstore24-backup-db.timer
find /srv/irstore24/media -type f | wc -l
df -h
```

**توقف:** Commit فعال، وضعیت DB، Volume، فضای دیسک، TLS، Timer و فایل‌ها را ثبت و هر مغایرت را بررسی کن. خروجی کامل `docker compose config` ممکن است Secret چاپ کند؛ آن را عمومی نکن.

## 2. فاز Backup مستقل از Git — قبل از هر Cutover

**گام 1 — Production VPS قدیمی:** ابتدا وجود و موفقیت آخرین Backup را بررسی کن:

```bash
systemctl show irstore24-backup-db.service -p Result -p ExecMainStatus
journalctl -u irstore24-backup-db.service -n 15 --no-pager
ls -lh /root/irstore24-backups/
```

**گام 2 — Production VPS قدیمی:** یک Snapshot جدید و نام‌دار از DB بگیر. این دستور به دیتابیس فقط برای خواندن متصل می‌شود:

```bash
umask 077
mkdir -p -m 700 /root/irstore24-migration
cd /opt/irstore24-staging
DUMP="/root/irstore24-migration/db-preflight-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml \
  exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DUMP"
test -s "$DUMP"
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml \
  exec -T db pg_restore -l < "$DUMP" > /dev/null
sha256sum "$DUMP" > "$DUMP.sha256"
ls -lh "$DUMP" "$DUMP.sha256"
```

**گام 3 — Production VPS قدیمی:** تصاویر و فایل‌های تنظیمات را **جداگانه** Backup کن:

```bash
umask 077
tar -C /srv/irstore24 -czf \
  "/root/irstore24-migration/media-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" media
cp -a /etc/nginx/sites-available/irstore24 /root/irstore24-migration/nginx-irstore24.conf
cp -a /etc/systemd/system/irstore24-* /root/irstore24-migration/
ls -lah /root/irstore24-migration/
```

**توقف:** `pg_restore -l` فقط خوانایی ساختار آرشیو را می‌سنجد؛ **آزمایش Restore کامل نیست**. برای Backup خارج از VPS، فایل‌های Dump و Media را از طریق SSH/SFTP به مخزن امن دیگری بفرست. محتوای Secret فایل `staging.env` باید فقط از کانال خصوصی، جدا از Git منتقل شود؛ هرگز آن را در خروجی چت نمایش نده.

## 3. فاز آماده‌سازی VPS مقصد — قبل از انتقال DNS

**گام 1 — Production VPS جدید:** ابتدا SSH قابل اعتماد و منابع را تأیید کن:

```bash
hostnamectl
free -h
df -h
ip -br addr
ss -tulpen
```

- توصیه: Ubuntu Server LTS به‌روز، فضای کافی برای Database و Backup، ساعت صحیح و دسترسی خروجی به GitHub/Registry/PyPI.
- SSH از **Local Computer** در یک Session دوم باید کار کند. هیچ قاعده Firewall یا تغییر SSH که خطر Lockout دارد بدون مسیر برگشت آزمایش‌شده اجرا نشود.
- PostgreSQL پورت عمومی ندارد؛ پورت‌های اپلیکیشن فقط روی `127.0.0.1` باشند.

**گام 2 — Production VPS جدید:** ابزارهای پایه را از منابع معتبر نصب/تأیید کن. دستور نصب Docker/Compose را متناسب با توزیع از [راهنمای رسمی Docker برای Ubuntu](https://docs.docker.com/engine/install/ubuntu/) دنبال کن؛ برای Nginx و Git از مخزن سیستم استفاده کن:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates nginx
# پس از نصب Docker Engine + Compose Plugin طبق مستندات رسمی:
docker --version
docker compose version
```

> فایل `docker-compose.staging.yml` از YAML tag `!override` استفاده می‌کند؛ Compose باید از این ویژگی پشتیبانی کند (حداقل 2.24.4). قبل از ادامه `config --quiet` لازم است. اگر Firewall موجود است، قبل از تغییر قواعد، وضعیت SSH و 80/443 را بررسی کن؛ قواعد فعلی را کورکورانه پاک نکن.

**گام 3 — Production VPS جدید:** Checkout جداگانه با نسخه تأییدشده بساز:

```bash
sudo mkdir -p /opt /etc/irstore24 /srv/irstore24/media/cs2
sudo chmod 700 /etc/irstore24
sudo chmod 755 /srv/irstore24 /srv/irstore24/media /srv/irstore24/media/cs2
# Clone دسترسی‌دارِ Repository مطابق وضعیت public/private آن:
# git clone --branch feature/storefront-mvp <REPOSITORY-URL> /opt/irstore24-staging
# cd /opt/irstore24-staging && git checkout <APPROVED_COMMIT_OR_TAG>
```

**توقف:** هیچ فایل Environment را از اینترنت یا چت کپی نکن؛ به‌طور امن از مبدأ منتقل کن و mode آن را کنترل کن.

## 4. فاز Environment، Compose و ساخت Image روی مقصد

**گام 1 — Production VPS جدید:** فایل `/etc/irstore24/staging.env` را از کانال خصوصی بین سرورها منتقل کن. پس از انتقال:

```bash
sudo chown root:root /etc/irstore24/staging.env
sudo chmod 600 /etc/irstore24/staging.env
sudo stat -c '%a %U:%G %n' /etc/irstore24/staging.env
```

- برای **انتقال ساده و مطمئن در Cutover اولیه**، از همان DB name/user/password ثبت‌شده در Environment مبدأ استفاده کن. تعویض Password و نام DB را **بعداً** با Change Plan جدا انجام بده.
- هیچ‌وقت فایل `.env` را در Git Commit نکن؛ مطمئن شو در `.gitignore` یا خارج از Working Tree است.
- `APP_ENV=production`، `AUTH_COOKIE_SECURE=true`، و `AUTH_ALLOWED_ORIGINS` محدود به `https://irstore24.ir` و `https://www.irstore24.ir` حفظ شوند. در کانفیگ شناخته‌شده فعلی این مقادیر در Compose base تعریف شده‌اند.

**گام 2 — Production VPS جدید (ابتدا Read-only):**

```bash
cd /opt/irstore24-staging
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml config --quiet
```

Port bindings مورد انتظار: `127.0.0.1:3100:3000` برای Web، `127.0.0.1:8100:8000` برای API، **هیچ** `ports:` عمومی برای DB. Project name و Volume باید صریحاً مورد تأیید قرار بگیرند. برای بررسی کامل config، خروجی Secret را نمایش/ارسال نکن.

**گام 3 — Production VPS جدید:** Build را از Commit مشخص انجام بده:

```bash
cd /opt/irstore24-staging
# در VPS قبلی Docker Hub خطای 403 و PyPI timeout داشت.
# Dockerfileها در Commit مورد بررسی از public.ecr.aws استفاده می‌کردند.
# اگر build عادی شبکه مشکل داشت، این روش روی VPS قبلی جواب داده بود:
docker build --network=host -f backend/Dockerfile -t irstore24-staging-api .
docker build --network=host -f Dockerfile -t irstore24-staging-web .
```

**توقف:** Build موفق به‌معنی DB آماده نیست. از `docker compose down -v`، `docker volume prune` و تغییر Project name برای رفع خطا **استفاده نکن**. اگر Image tag یا Dockerfile تغییر کرده، ابتدا `docker compose images/config` و Dockerfile را بررسی کن.

## 5. فاز بازیابی دیتابیس روی VPS جدید (Fresh Empty Target)

> **سخت‌گیرانه:** مقصد باید یک PostgreSQL Volume تازه و **بدون داده** داشته باشد. اگر مقصد از قبل کاربر/سفارش/Schema دارد، این دستورها را اجرا نکن و ابتدا برنامه ادغام یا مقصد جدا تهیه کن. نباید Restore را روی DB عملیاتی موجود Overlay کرد.

**گام 1 — Production VPS جدید:** Volume و دیتابیس جدید را راه‌اندازی کن:

```bash
cd /opt/irstore24-staging
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml up -d db

docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml ps db
```

**گام 2 — Production VPS جدید:** بعد از انتقال امن Dump، `sha256sum -c` را انجام بده. روی DB خالی **قبل از اجرای Alembic upgrade** Restore کن:

```bash
cd /opt/irstore24-staging
# مسیر فایل را با نام واقعی Dump نهایی جایگزین کن:
# cd /root/irstore24-migration && sha256sum -c <DUMP_FILE>.sha256
# اگر مقصد تازه و خالی بودن DB تأیید شد:
# docker compose --project-name irstore24-staging \
#   --env-file /etc/irstore24/staging.env \
#   -f docker-compose.yml -f docker-compose.staging.yml \
#   exec -T db sh -c \
#   'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error --single-transaction' \
#   < /root/irstore24-migration/<FINAL_DB_DUMP>.dump
```

> دستور Restore **عمداً کامنت شده است**؛ فقط پس از تأیید DB خالی، منبع Dump، Schema revision و Backup، کامنت‌ها را بردار. اگر SQL Restore خطا داد، بدون اصلاح علت، اجرای مجدد روی DB نیمه‌پر یا پاک کردن Volume ممنوع است.

**گام 3 — Production VPS جدید:** پس از موفقیت Restore، Migration State و سلامت را بررسی کن:

```bash
cd /opt/irstore24-staging
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml \
  run --rm --no-deps api /opt/venv/bin/python -m alembic current
```

- در تاریخ آخرین بررسی، revision پروژه `f691486b68bb (head)` بود؛ ممکن است با افزودن تصویر TF2 تغییر کند. **اگر Commit مقصد با Dump یکسان نیست، قبل از `alembic upgrade head` سازگاری Migration را بررسی کن.**
- انتقال DB باید حساب‌های User/Admin، Sessionها، Settings، محصولات، سفارش‌ها و سوابق را حفظ کند. ساخت مجدد Admin و Seed کردن Settings در مهاجرت **لازم نیست**.

**توقف:** شمارش رکوردها، Revision Alembic و حساب‌های Admin را با مبدأ مقایسه کن؛ ایمیل/رمز کامل را در Log انتشار نده.

## 6. فاز تصاویر و اجرای App روی مقصد

**گام 1 — Production VPS قدیمی → Production VPS جدید:** تمام محتوای `/srv/irstore24/media/` را با انتقال امن SSH/SFTP/rsync کپی کن؛ Permissions عمومی تصاویر (مثلاً فایل 0644، پوشه 0755) را بررسی کن. مثال کلی:

```bash
# اجرا روی Production VPS قدیمی؛ NEW_USER و NEW_HOST را واقعی کن:
# rsync -av --progress -e ssh /srv/irstore24/media/ NEW_USER@NEW_HOST:/srv/irstore24/media/
```

هرگز از `rsync --delete` بدون مقایسه و تأیید مقصد استفاده نکن. در نسخه فعلی Upload API ندارد؛ اگر در آینده افزوده شد، Mount و دسترسی نوشتن Backend باید جداگانه مطابق پیاده‌سازی واقعی تنظیم شود.

**گام 2 — Production VPS جدید:**

```bash
cd /opt/irstore24-staging
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml up -d api web

docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml ps
```

**گام 3 — Production VPS جدید (Loopback tests):**

```bash
curl -fsS http://127.0.0.1:3100/
curl -fsS http://127.0.0.1:8100/api/health
curl -fsS http://127.0.0.1:8100/api/health/database
ss -lntp | grep -E ':3100|:8100|:5432' || true
```

**توقف:** سلامت Loopback به معنی HTTPS/Browser Login موفق نیست. لازم است Nginx و Cookie/Origin را در مسیر واقعی تست کنی.

## 7. فاز Nginx، HTTPS و آزمون پیش از Cutover

**گام 1 — Production VPS جدید:** نسخه Nginx vhost قدیمی را برای مسیرهای واقعی مقصد تطبیق بده؛ فقط این Routing را بپذیر:

```text
location /                → proxy_pass http://127.0.0.1:3100;
location ^~ /api/         → proxy_pass http://127.0.0.1:8100;
/media/<safe-image-path>  → /srv/irstore24/media/<safe-image-path>
```

- `proxy_pass` برای `/api/` **بدون URI slash انتهایی** است تا FastAPI کل مسیر `/api/...` را بگیرد.
- `Host`، `X-Real-IP`، `X-Forwarded-For`، `X-Forwarded-Proto` را مطابق Nginx فعلی حفظ کن.
- نمونه کامل Live Nginx در Backup `/root/irstore24-migration/nginx-irstore24.conf` مبدأ است؛ **Blind overwrite نکن** چون گواهی مقصد ممکن است هنوز وجود نداشته باشد.
- Public DB و Public API/Web ports ممنوع؛ فقط 80/443 برای Nginx (به‌علاوه SSH کنترل‌شده).

**گام 2 — Production VPS جدید:** برای گواهی معتبر از Certbot/Let's Encrypt استفاده کن. دو مسیر وجود دارد:

1. **ترجیحی:** گواهی دامنه را پیش از تغییر A record با روش DNS-01 و امکان مدیریت DNS صادر کن؛ نیازی به انتقال Private Key قدیمی نیست.
2. **جایگزین:** در پنجره Cutover، پس از تغییر DNS و رسیدن دامنه به سرور جدید، روش HTTP-01 را برای صدور گواهی روی Nginx اجرا کن. این روش نیازمند در دسترس‌بودن Port 80 و تنظیم درست مسیر Challenge است و ممکن است وقفه ایجاد کند.

هیچ فایل `privkey.pem` را در Git، پیام یا سند کپی نکن. Renew timer و `certbot renew --dry-run` را پس از نصب بررسی کن. قبل از وجود Certificate روی مقصد، فعال‌کردن vhost با مسیر گواهیِ مفقود موجب شکست `nginx -t` می‌شود.

**گام 3 — Production VPS جدید:**

```bash
nginx -t && systemctl reload nginx
# قبل از تغییر DNS، برای تست HTTP با IP مقصد:
# curl -i --resolve irstore24.ir:80:<NEW_PUBLIC_IP> http://irstore24.ir/api/health
# پس از داشتن گواهی معتبر برای همان دامنه روی مقصد:
# curl -fsS --resolve irstore24.ir:443:<NEW_PUBLIC_IP> https://irstore24.ir/api/health
# curl -I --resolve irstore24.ir:443:<NEW_PUBLIC_IP> https://irstore24.ir/login
```

**توقف:** در این مرحله هر دو سرور ممکن است روشن باشند، اما فقط **یکی** باید سفارش/ثبت‌نام واقعی بپذیرد. TLS، Cookie flags (`Secure`, `HttpOnly`, `SameSite`)، POST Origin validation، 401 برای کاربر ناشناس و عدم نمایش Secretها را بررسی کن.

## 8. فاز Cutover نهایی با حفاظت از داده‌ها

> **مهم‌ترین خطر مهاجرت:** اگر بعد از Backup نهایی هنوز کاربران روی سرور قدیمی سفارش ایجاد کنند، داده‌های جدید در مقصد نخواهند بود. DNS ممکن است مدتی هم‌زمان به دو سرور منتهی شود. بدون طرح جلوگیری از Split-Brain، Cutover را شروع نکن.

**گام 1 — DNS Provider + Production VPS قدیمی:** حداقل از قبل، TTL رکوردهای `@` و `www` را کاهش بده (اگر Provider اجازه می‌دهد). پنجره کوتاه Maintenance اعلام کن. روی سرور قدیمی، قبل از آخرین Dump **تمام عملیات نوشتن (ثبت‌نام، Checkout، Admin changes) را متوقف کن**؛ مثلاً با صفحه Maintenance تحت Nginx در یک تنظیم بررسی‌شده، بدون تغییر SSH. بعد `nginx -t` و Reload کنترل‌شده. تایید کن درخواست‌های نوشتنی دیگر به DB قدیمی نمی‌رسند.

**گام 2 — Production VPS قدیمی → جدید:** فقط **پس از Freeze**، Dump نهایی و Media snapshot بگیر و با SSH به مقصد بفرست؛ SHA-256 را در هر دو طرف تطبیق بده. مقصد باید برای Restore نهایی **DB خالی و مشخص** داشته باشد؛ اگر آزمایش Restore قبلی روی همان DB انجام شده، به‌جای Overlay کردن، یک DB/Volume هدف جدید و ایزوله با روش بررسی‌شده آماده کن. هیچ `down -v` یا پاک‌کردن کورکورانه Volume مجاز نیست.

**گام 3 — Production VPS جدید + DNS Provider:** پس از Restore نهایی، تطبیق داده‌ها، سلامت App، گواهی معتبر، و آماده‌بودن Timerها و Backup، رکوردهای DNS اصلی و `www` را به IP جدید تغییر بده. دامنه اصلی را از چند Resolver بررسی کن. تا پایان انتشار DNS، سرور قدیمی را برای کلاینت‌های با DNS قدیمی در حالت Maintenance/بدون Write نگه دار.

**توقف:** اگر هر بررسی شکست خورد، قبل از پذیرش Write روی مقصد، Cutover را متوقف کن. پس از پذیرش Write روی مقصد، برگشت به دیتابیس قدیم بدون انتقال Writes جدید **باعث از دست‌رفتن اطلاعات** می‌شود؛ Rollback دیتابیس نیاز به طرح مستقل دارد.

## 9. فاز راه‌اندازی سرویس‌ها و Backup روی سرور جدید

**گام 1 — Production VPS جدید:** فایل‌های `irstore24-expire-orders.service/.timer` و `irstore24-backup-db.service/.timer` و اسکریپت `/usr/local/sbin/irstore24-backup-db` را از مبدأ با کانال امن کپی/بازسازی کن؛ سپس حتماً چک کن که:

```text
WorkingDirectory=/opt/irstore24-staging
Compose project=irstore24-staging
Env file=/etc/irstore24/staging.env
Compose files=docker-compose.yml + docker-compose.staging.yml
Exec image Python=/opt/venv/bin/python
DB backup folder=/root/irstore24-backups
```

- Service انقضا: `docker compose ... exec -T api /opt/venv/bin/python -m app.jobs.expire_orders --batch-size 100`
- Timer انقضا: هر دقیقه.
- Backup script: `pg_dump -Fc`، انتشار اتمی فایل، `pg_restore -l`، Checksum، `umask 077`.
- Timer Backup: `OnCalendar=*-*-* 03:15:00 UTC`.

**گام 2 — Production VPS جدید:** اعتبارسنجی، اجرای یک‌باره و سپس Enable کردن:

```bash
systemd-analyze verify /etc/systemd/system/irstore24-expire-orders.{service,timer} \
  /etc/systemd/system/irstore24-backup-db.{service,timer}
systemctl daemon-reload
systemctl start irstore24-expire-orders.service
systemctl start irstore24-backup-db.service
systemctl show irstore24-expire-orders.service -p Result -p ExecMainStatus
systemctl show irstore24-backup-db.service -p Result -p ExecMainStatus
# فقط در صورت موفقیت هر دو آزمون:
systemctl enable --now irstore24-expire-orders.timer irstore24-backup-db.timer
```

**گام 3 — Production VPS جدید:**

```bash
systemctl list-timers --all --no-pager | grep irstore24
journalctl -u irstore24-expire-orders.service -n 20 --no-pager
journalctl -u irstore24-backup-db.service -n 20 --no-pager
ls -lh /root/irstore24-backups/
```

**توقف:** تنها دیدن `active` برای Timer کافی نیست؛ حداقل یک اجرای خودکار و Log موفق لازم است. Backup روزانه در همان VPS در برابر خرابی کامل VPS کفایت نمی‌کند: نسخه خارج از سرور، Retention، و **Restore آزمایشی به DB جداگانه** باید اجرا و مستند شود.

## 10. فاز Validation پس از Cutover

**گام 1 — Local Computer (مرورگر) و Production VPS جدید:**

```bash
curl -I --max-time 15 https://irstore24.ir
curl -fsS --max-time 15 https://irstore24.ir/api/health
curl -fsS --max-time 15 https://irstore24.ir/api/health/database
curl -sS -o /dev/null -w '%{http_code}\n' https://irstore24.ir/login
curl -i --max-time 15 https://irstore24.ir/api/auth/me  # ناشناس: 401 مورد انتظار
```

**گام 2 — Local Computer (مرورگر):** به‌صورت واقعی آزمایش کن: Login دو Admin موجود، CS2/TF2 inventory، تصاویر Media، Store Settings بدون تغییر غیرضروری، ثبت‌نام کاربر آزمایشی، Cart، Checkout با سناریوی بدون پرداخت واقعی، لغو/انقضای سفارش و بازگشت صحیح Stock. مقدار نرخ و اطلاعات پرداخت را در DB/پنل بررسی کن؛ صحت نرخ نمایش‌داده‌شده تضمین نشده است.

**گام 3 — Production VPS جدید:** وضعیت DB، کانتینرها، پورت‌ها، Renew و Backup را ثبت کن:

```bash
cd /opt/irstore24-staging
docker compose --project-name irstore24-staging \
  --env-file /etc/irstore24/staging.env \
  -f docker-compose.yml -f docker-compose.staging.yml ps
nginx -t
ss -lntp
systemctl list-timers --all --no-pager | grep -E 'irstore24|certbot'
```

**معیار پایان مهاجرت:** سایت HTTPS معتبر، API/DB سالم، کاربران و سفارش‌ها حفظ‌شده، تصاویر موجود، هر دو Admin قادر به Login، Timer انقضا و Backup اجراشده، Secretها خارج از Git، PostgreSQL غیرعمومی، و عدم پذیرش Write در سرور قدیمی. سرور قدیمی را تنها پس از اثبات بکاپ و سلامت مقصد و پایان دوره Rollback خاموش کن.

---

## 11. رفع خطاهای پرتکرار (بر اساس تجربه واقعی این پروژه)

| مشکل | علت/بررسی پیش از اقدام |
|---|---|
| `/api/health` خطای 404 ولی صفحه اصلی 200 | Nginx هنوز `/api/` را به FastAPI وصل نکرده یا Reload نشده؛ Next.js در Production rewrite خودکار API ندارد. |
| `/login` خطای 404 | احتمالاً Nginx هنوز به Container قدیمی در Port 3000 اشاره می‌کند. |
| `502 Bad Gateway` | `docker compose ... ps`، Port loopback و Logهای API/Web، نه تغییر کورکورانه Nginx. |
| Login موفق، ولی Session از دست می‌رود | HTTPS، `AUTH_COOKIE_SECURE=true`، Origin مجاز و Cookie flags را بررسی کن. |
| POST درخواست 403 | `AUTH_ALLOWED_ORIGINS` باید دقیقاً Origin HTTPS مجاز را شامل شود؛ CSRF guard را غیرفعال نکن. |
| DB اتصال ندارد | Env file صحیح، `DB_HOST=db`، Health Check، نام DB و Network همان Compose Project را بررسی کن. |
| محصولات عکس ندارند | `image_path`، فایل واقعی در `/srv/irstore24/media/`، Permission و Nginx alias را بررسی کن. نسخه فعلی API آپلود ندارد و مدل TF2 هنوز تصویر ندارد. |
| Docker Hub خطای 403 | در Commit فعلی Base Images به `public.ecr.aws/docker/library/...` منتقل شده‌اند؛ Dockerfile واقعی را بررسی کن. |
| Pip / PyPI timeout در Build | روی VPS قبلی `docker build --network=host` برای API/Web جواب داد؛ فقط در Build Context و با Repo مورد اعتماد استفاده کن. |
| Docker Compose خطای `!override` | نسخه Compose قدیمی است؛ قبل از تغییر فایل Compose، نسخه/مستندات را بررسی کن. |
| Timer فعال است اما کار نمی‌کند | `journalctl -u ...`, `systemctl show -p Result -p ExecMainStatus`, مسیر Environment و نام پروژه را بررسی کن. |
| Restore خطا می‌دهد | روی DB پر/نامناسب دوباره Restore نکن؛ Archive، Version، Privileges و مقصد را بررسی کن. |

## 12. بازگشت (Rollback) و خط قرمزها

- از Nginx و فایل Compose قبل از هر تغییر Backup بگیر. همیشه `nginx -t` قبل از `systemctl reload nginx`.
- هیچ تغییری روی SSH/UFW/Root Access بدون Session جایگزین و FallBack تست‌شده انجام نده.
- `docker compose down -v`، حذف Volume، `docker volume prune`، `alembic downgrade` و `pg_restore --clean` در Production **ممنوع مگر با برنامه بازیابی تأییدشده**.
- Revert کردن Nginx فقط Routing را برمی‌گرداند؛ دیتابیس یا Orders ایجادشده در مقصد را برنمی‌گرداند.
- Snapshot و Media باید با هم سازگار باشند؛ Restore دیتابیس بدون فایل‌های Media می‌تواند تصاویر شکسته ایجاد کند.
- تا وقتی مطمئن نشده‌ای همه ترافیک به سرور جدید رسیده و بکاپ قابل بازیابی است، سرور قدیمی/Backup را حذف نکن.
- هیچ Secret یا Dump حاوی اطلاعات مشتری را Public نکن؛ Dump حاوی داده‌های حساس است حتی اگر فایل با Password محافظت نشده باشد.

## 13. چک‌لیست نهایی قبل از خاموش‌کردن VPS قدیمی

- [ ] Commit/Tag و Build Image نسخه جدید دقیقاً مشخص و ثبت شده است.
- [ ] Backup نهایی PostgreSQL + Checksum + آزمون Restore در مقصد مستقل ثبت شده است.
- [ ] تمام تصاویر و فایل‌های Media منتقل و نمونه‌ای از URLها تست شده‌اند.
- [ ] Env خصوصی با Permission صحیح منتقل شده؛ هیچ Secret در Git/Log نیست.
- [ ] دیتابیس مقصد از Dump نهایی منتقل شده و Revision/schema و Row Counts درست‌اند.
- [ ] PostgreSQL به هیچ Public Interface منتشر نشده است.
- [ ] HTTPS معتبر برای `irstore24.ir` و `www` و Certbot Renew تست شده است.
- [ ] Nginx `/`، `/api/` و `/media/` به مقصد صحیح اشاره می‌کنند.
- [ ] Login حساب‌های Admin و چند User، Inventory، Cart، Order، Payment Settings تست شده است.
- [ ] یک Order واقعاً منقضی شده و Stock دقیقاً یک بار برگشته است.
- [ ] Expiration timer و Daily Backup timer اجرای خودکار موفق در Journal دارند.
- [ ] Restore آزمایشی به محیط مجزا و Backup خارج از VPS موجود است.
- [ ] DNS اصلی و www به IP جدید رسیده‌اند؛ سرور قدیمی دیگر Write قبول نمی‌کند.
- [ ] SSH از اتصال مستقل تست شده و اقدامات Security به‌صورت جداگانه و محافظه‌کارانه انجام شده است.

## 14. کارهای باز و نقاطی که نیازمند تأیید هستند

1. **Image Management:** هنوز Upload از Admin برای CS2/TF2 وجود ندارد و TF2 فیلد `image_path` ندارد. تغییر بعدی باید Frontend، FastAPI، validation، فایل دائمی، نمایش عمومی و Alembic Migration را با هم پوشش دهد. پس از توسعه، این سند را متناسب با Mount/Permission واقعی آپلود به‌روزرسانی کن.
2. **Backup Protection:** Daily Backup روی همان VPS تنظیم شده، ولی Rotation/Retention، Offsite Backup و Full Restore Test تا زمان نگارش تکمیل نشده‌اند.
3. **Business Readiness:** عملکرد E2E خرید روی مسیر Public HTTPS، مقدار واقعی Exchange Rate و صحت Payment/Contact Settings باید با داده‌های واقعی تأیید شوند.
4. **Infra Security Hardening:** فاز جداگانه است؛ این سند مجوز تغییر SSH، Root Login یا Firewall روی VPS فعال نیست.
5. **Production Naming:** DB/Volume/Project هنوز `staging` نام دارد. در انتقال اولیه حفظ شود؛ بعداً فقط در Maintenance برنامه‌ریزی‌شده نام‌ها را استاندارد کن.

---

### نگهداری این سند

**نام مناسب داخل Repository:** `docs/SERVER_MIGRATION.md`

این سند را می‌توان در Git ذخیره کرد چون عمداً Secret ندارد. پس از هر تغییر در مسیرهای Compose، Nginx، نام DB، Migration، Storage، Timer یا مراحل Deploy، همین سند و فایل وضعیت خصوصی پروژه را به‌روز کن.

**آخرین واقعیت ثبت‌شده اینجا از خروجی‌های Production در 2026-10-29/30 و فایل‌های پروژه است؛ هنگام جابه‌جایی واقعی وضعیت زنده سرورها را دوباره Inspect کن.**

---

## Current image-upload release addendum (2026-10-30)

The original migration runbook above is preserved as received. Its statements that the site is still Under Construction, that no upload API exists, that TF2 has no image field, or that the API has no writable media mount describe an earlier release. The live storefront and Compose identities must be inspected again before using any command above.

- The new migration `6c97dfd75e2b` has parent `f691486b68bb` and adds only nullable `tf2_keys.image_path VARCHAR(1024)`. Existing rows remain valid. Do not run migrations on production automatically. Verify the live revision and a restorable database backup before applying this one additive revision to the **existing** project/database.
- Production host media is `/srv/irstore24/media`, bind-mounted only into the API at `/app/media`, with `MEDIA_ROOT=/app/media`. The two-file staging configuration selects `/srv/irstore24-staging/media`, but its declared project name is occupied by the live store; a future genuine staging deployment requires a distinct project, ports, and PostgreSQL volume. Local Compose uses ignored `./backend/container-media`; the host virtualenv uses separate ignored `backend/media`. Never point genuine staging at production media or database volumes.
- The API process runs as UID/GID 10001. Pre-create the selected media root plus `cs2/` and `tf2/` with owner 10001:10001 and mode 0755; image files are written mode 0644. Confirm the host Nginx worker can traverse and read but cannot write. Do not use 0777 or follow symlinks. Keep existing media files and backups.
- Admin uploads accept raw JPEG, PNG, or WebP bytes up to 768 KiB. Decoded dimensions are limited to 4096 by 4096 and 16 million pixels. Files are re-encoded as WebP without source metadata. The existing `client_max_body_size 1m` is sufficient; no Nginx size change is required. The existing `/media/` filename rule matches generated paths. The live Nginx virtual host must be inspected and tested separately.
- Before release, record the live Compose project, database volume name, application image tags, Nginx target ports, and Alembic revision. Back up PostgreSQL and media independently and test restoring to isolated resources. Build and validate the replacement application in isolation while the current storefront keeps serving. Test image upload, media GET, auth/Origin rejection, checkout, and database health through a private HTTPS route. Only then schedule a reviewed cutover of application traffic and Nginx routing.
- Reuse the **existing** production PostgreSQL volume identity. Do not recreate it, run `docker compose down -v`, run `pg_restore --clean`, or restore a dump over the live database. Avoid rebuilding the database service when replacing API/web images; select the actual live Compose project and reviewed files explicitly. Keep the previous app images and Nginx config for immediate traffic rollback.
- Roll back application images and Nginx routing separately if the release fails. The nullable-column migration can usually remain while the older app runs; downgrading it would drop image references and is not an automatic rollback. Reconcile image files and database references from matching backups if restoration is ever required.
- Replacing/removing a product image changes only its database reference. Old files remain because other references or backups may need them. A failed product save after upload can leave an unreferenced file; inspect references and backups before any manual cleanup. No public or admin arbitrary-file deletion API exists.

## 15. اصلاح مسیر Media برای پروژه Production زنده

پروژه، Checkout، Environment، نام سرویس‌های `web`/`api`/`db` و Volume PostgreSQL را تغییر نده. `docker-compose.production-live.yml` بعد از فایل staging فقط منبع bind mount سرویس `api` را به `/srv/irstore24/media` برمی‌گرداند. این Overlay برای Staging مستقل نیست. نام پروژه زنده `irstore24-staging` و نام Volume مورد انتظار `irstore24-staging_postgres_data` باقی می‌ماند. Nginx زنده همچنان از همان مسیر host می‌خواند.

**انتخاب دقیق Compose برای همه عملیات Production زنده، پس از تأیید وضعیت روی VPS و دریافت مجوز استقرار:**

~~~bash
cd /opt/irstore24-staging
LIVE_COMPOSE=(docker compose --project-name irstore24-staging
  --env-file /etc/irstore24/staging.env
  -f docker-compose.yml -f docker-compose.staging.yml
  -f docker-compose.production-live.yml)
"${LIVE_COMPOSE[@]}" config --quiet
"${LIVE_COMPOSE[@]}" ps
~~~

در خروجی resolved، پروژه باید `irstore24-staging`، Web فقط `127.0.0.1:3100:3000`، API فقط `127.0.0.1:8100:8000`، DB بدون پورت Host، و Media API برابر `/srv/irstore24/media:/app/media` باشد. خروجی کامل `config` ممکن است رمز DB را نشان بدهد؛ آن را منتشر نکن. `docker-compose.override.yml` محلی نباید در لیست باشد. قبل از `up` یا migration، نام Volume موجود و mount آن را با کانتینر فعلی تطبیق بده و Backup قابل بازیابی را تأیید کن.

**آماده‌سازی دقیق Media روی VPS، فقط در زمان انتشار تأییدشده:**

~~~bash
sudo stat -c '%a %u:%g %n' /srv/irstore24 /srv/irstore24/media
sudo install -d -o 10001 -g 10001 -m 0755 /srv/irstore24/media/cs2 /srv/irstore24/media/tf2
sudo stat -c '%a %u:%g %n' /srv/irstore24/media/cs2 /srv/irstore24/media/tf2
namei -l /srv/irstore24/media/cs2 /srv/irstore24/media/tf2
~~~

Root فعلی `/srv/irstore24/media` با owner `root:root` و mode `0755` باقی می‌ماند. `install -d` فقط owner/mode دو پوشه Category را تنظیم می‌کند؛ فایل‌های موجود را تغییر نمی‌دهد. قبل از اجرا ACL و writerهای دیگر را بررسی کن. UID/GID 10001 باید بتواند در دو پوشه بنویسد؛ کاربر واقعی Worker Nginx باید از Parentها عبور کند و تصاویر 0644 را بخواند. `chmod 777`، `chown -R` و پاک‌کردن فایل‌های قدیمی ممنوع است.

**هماهنگی Jobها:** فایل محلی `deploy/systemd/irstore24-expire-orders.service` اکنون همان سه فایل و `exec -T api /opt/venv/bin/python -m app.jobs.expire_orders --batch-size 100` را انتخاب می‌کند. سرویس Backup زنده و اسکریپت آن در این مخزن نیستند؛ آن‌ها را روی سرور در محیط خصوصی بررسی کن. اگر Backup از Compose استفاده می‌کند، باید همین Project، Env، سه فایل و سرویس `db` را انتخاب کند. چون نام پروژه و سرویس و Volume ثابت مانده، `exec -T api` و `exec -T db` به کانتینرهای موجود اشاره می‌کنند. Unitهای نصب‌شده را بدون بررسی با Template جایگزین نکن. بعد از انتشار تأییدشده، `systemd-analyze verify`، اجرای آزمایشی هر دو One-shot Service، Exit Status، Journal و Timerهای فعال را بررسی کن؛ فقط یک Timer انقضای سفارش فعال بماند.

**انتشار و بازگشت برنامه:** قبل از جایگزینی، Image ID کانتینرهای فعلی API و Web و Backup مستقل DB/Media را ثبت و نگه دار. Migration `6c97dfd75e2b` فقط پس از تأیید Revision فعلی `f691486b68bb` و Backup اجرا شود. پس از ساخت و آزمون جداگانه Imageها، در پنجره انتشار تأییدشده فقط Applicationها را جایگزین کن:

~~~bash
"${LIVE_COMPOSE[@]}" up -d --no-deps --no-build api web
"${LIVE_COMPOSE[@]}" ps
~~~

اگر Application مشکل داشت، Image IDهای ثبت‌شده را به نام‌های تأییدشده `irstore24-staging-api` و `irstore24-staging-web` برگردان و فقط همان دو سرویس را دوباره ایجاد کن:

~~~bash
docker image tag <RECORDED_OLD_API_IMAGE_ID> irstore24-staging-api
docker image tag <RECORDED_OLD_WEB_IMAGE_ID> irstore24-staging-web
"${LIVE_COMPOSE[@]}" up -d --no-deps --no-build --force-recreate api web
"${LIVE_COMPOSE[@]}" ps
~~~

Overlay Media را در rollback نگه دار تا API و Nginx به یک مسیر اشاره کنند. برای این اصلاح Nginx نباید تغییر کند؛ اگر در انتشار جداگانه Routing تغییر کرده، نسخه پشتیبان vhost را بازگردان، `nginx -t` را اجرا کن و فقط پس از موفقیت Reload کن. Migration افزایشی را خودکار Downgrade نکن؛ حذف ستون TF2 image referenceها را از دست می‌دهد. از `down -v`، تغییر Project name، حذف Volume و Restore روی DB زنده استفاده نکن. این مراحل تا تأیید و آزمایش روی VPS اجرا نشده‌اند.
