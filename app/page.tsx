import Image from "next/image";

export default function Home() {
  return (
    <main className="landing">
      <div className="poster">

        <Image
          src="/construction-bg.png"
          alt="IRStore24 Under Construction"
          fill
          priority
          className="posterImage"
        />

        <a
          href="https://t.me/IRStoore"
          target="_blank"
          rel="noopener noreferrer"
          className="hotspot telegram"
          aria-label="Telegram"
        />

        <a
          href="https://discord.gg/YOUR_DISCORD_INVITE"
          target="_blank"
          rel="noopener noreferrer"
          className="hotspot discord"
          aria-label="Discord"
        />

      </div>
    </main>
  );
}