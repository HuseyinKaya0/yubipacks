# Eyyubi Discord Bot (Node.js)

Basit bir `discord.js` bot iskeleti. `config.json` üzerinden prefix ve presence (aktivite) ayarlanır. Token `.env` içinde `DISCORD_TOKEN` değişkenine konulmalıdır.

Hızlı başlatma:

1. Node.js yüklü olduğundan emin olun (16.9+ önerilir).
2. Proje klasöründe bağımlılıkları yükleyin:

```powershell
npm install
```

3. `.env` içindeki `DISCORD_TOKEN` değerini bot tokenınız ile değiştirin.
4. Botu çalıştırın:

```powershell
npm start
```

Notlar:
- `config.json` içindeki `activity` alanı botun durum mesajını ayarlar.
- Botun `Message Content` intent'i kullanılıyor; botun geliştirici portalında bu intent'i etkinleştirdiğinizden emin olun.
