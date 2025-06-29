import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import Canvas from 'canvas';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// شناسه بات
const botId = '123456789012345678';

async function loadCountryData() {
  const filePath = path.join(process.cwd(), 'countriesData.json');
  const jsonString = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(jsonString);
}

export const data = new SlashCommandBuilder()
  .setName('balancenational')
  .setDescription('نمایش کارت اعتباری و موجودی کاربر بر اساس کشور و واحد پول ملی')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('کاربری که می‌خواهید موجودی‌اش را ببینید')
      .setRequired(false)
  );

export async function execute(interaction, economy, ensureUser) {
  try {
    await interaction.deferReply();

    const target = interaction.options.getUser('target') || interaction.user;
    if (target.bot || target.id === botId) {
      return await interaction.editReply({ content: "❌ مشاهده موجودی بات امکان‌پذیر نیست." });
    }

    await ensureUser(target.id);
    const userData = economy[target.id];
    if (!userData) {
      return await interaction.editReply({ content: "❌ اطلاعات اقتصادی کاربر یافت نشد." });
    }

    const countryData = await loadCountryData();
    let userServerId = null;
    for (const [serverId, serverInfo] of Object.entries(countryData.servers)) {
      if (serverInfo.citizens.includes(target.id)) {
        userServerId = serverId;
        break;
      }
    }

    if (!userServerId) {
      return await interaction.editReply({ content: "❌ این کاربر در هیچ کشوری شهروند نیست." });
    }

    const serverInfo = countryData.servers[userServerId];
    const currencyName = serverInfo.currency || "ارز";
    const currencyEmoji = serverInfo.currencyEmoji || "💵";
    const currencyImageUrl = serverInfo.currencyImage || null;
    const symbolImageUrl = serverInfo.symbolImage || null;

    const walletKey = `wallet${userServerId}`;
    const bankKey = `bank${userServerId}`;
    const rawWallet = userData[walletKey] ?? 0;
    const rawBank = userData[bankKey] ?? 0;

    // ✅ محدود به دو رقم اعشار
    const wallet = parseFloat(rawWallet.toFixed(2));
    const bank = parseFloat(rawBank.toFixed(2));
    const total = parseFloat((wallet + bank).toFixed(2));

    await interaction.editReply({ content: `🔧 در حال ساخت کارت برای ${target.username}...` });

    const buffer = await generateCreditCard();
    const attachment = new AttachmentBuilder(buffer, { name: 'nationalbalance.png' });

    await interaction.editReply({ content: '', files: [attachment] });

    // ⬇ ساخت کارت تصویری
    async function generateCreditCard() {
      const width = 900, height = 540;
      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#8e0000';
      ctx.fillRect(0, 0, width, height);

      const radius = 30;
      roundRect(ctx, 10, 10, width - 20, height - 20, radius, false, true);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.stroke();

      const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 });
      const avatarBuffer = Buffer.from(await (await fetch(avatarURL)).arrayBuffer());
      const avatar = await Canvas.loadImage(avatarBuffer);
      const avatarX = 50, avatarY = 50, avatarRadius = 90;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarRadius * 2, avatarRadius * 2);
      ctx.restore();

      const logo = await loadImageOrFallback(symbolImageUrl, path.join(__dirname, '..', 'img', '1.png'));
      ctx.drawImage(logo, 780, 30, 100, 100);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(target.username, 250, avatarY + 70);

      ctx.font = '28px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText('1234 5678 9012 3456', 250, avatarY + 130);

      ctx.font = '20px sans-serif';
      ctx.fillText('EXP 12/29', 250, avatarY + 170);

      const iconWidth = 60, iconHeight = 40, offsetX = iconWidth + 15;
      const startX = avatarX;

      let currencyIcon = null;
      if (currencyImageUrl) {
        try {
          const imgBuf = Buffer.from(await (await fetch(currencyImageUrl)).arrayBuffer());
          currencyIcon = await Canvas.loadImage(imgBuf);
        } catch (e) {
          console.warn('⚠️ بارگذاری آیکن ارز ناموفق بود');
        }
      }

      const walletY = avatarY + avatarRadius * 2 + 70;
      const bankY = walletY + 60;
      const totalY = bankY + 60;

      drawCurrencyLine(walletY, `کیف پول: ${wallet} ${currencyName}`, '#FFD700');
      drawCurrencyLine(bankY, `بانک: ${bank} ${currencyName}`, '#00BFFF');
      drawCurrencyLine(totalY, `مجموع: ${total} ${currencyName}`, '#32CD32');

      const cardImage = await Canvas.loadImage(path.join(__dirname, '..', 'img', 'card.png'));
      ctx.drawImage(cardImage, width - 90, height - 80, 60, 50);

      return canvas.toBuffer();

      function drawCurrencyLine(y, text, color) {
        if (currencyIcon) {
          ctx.drawImage(currencyIcon, startX, y - iconHeight + 10, iconWidth, iconHeight);
        } else {
          ctx.fillStyle = '#fff';
          ctx.font = '32px sans-serif';
          ctx.fillText(currencyEmoji, startX, y);
        }
        ctx.fillStyle = color;
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(text, startX + offsetX, y);
      }
    }

    async function loadImageOrFallback(url, fallbackPath) {
      try {
        if (!url) throw new Error('No URL');
        const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
        return await Canvas.loadImage(buffer);
      } catch {
        return await Canvas.loadImage(fallbackPath);
      }
    }

    function roundRect(ctx, x, y, w, h, r, fill, stroke) {
      if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
      else for (const side of ['tl', 'tr', 'br', 'bl']) r[side] = r[side] || 0;

      ctx.beginPath();
      ctx.moveTo(x + r.tl, y);
      ctx.lineTo(x + w - r.tr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
      ctx.lineTo(x + w, y + h - r.br);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
      ctx.lineTo(x + r.bl, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
      ctx.lineTo(x, y + r.tl);
      ctx.quadraticCurveTo(x, y, x + r.tl, y);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    }

  } catch (error) {
    console.error('⛔ خطا در اجرا:', error);
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: '❌ مشکلی در اجرای کامند رخ داد!', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ مشکلی در اجرای کامند رخ داد!' });
      }
    } catch (err) {
      console.error('🔴 پاسخ‌دهی شکست خورد:', err);
    }
  }
}
