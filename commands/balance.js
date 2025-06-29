import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import Canvas from 'canvas';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// تعریف __dirname برای ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// شناسه بات خودت رو اینجا وارد کن
const botId = 'اینجا_شناسه_بات_تو';

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('نمایش کارت اعتباری و موجودی کاربر')
  .addUserOption(option =>
    option
      .setName('target')
      .setDescription('کاربری که می‌خواهید موجودی‌اش را ببینید')
      .setRequired(false));

export async function execute(interaction, economy, ensureUser) {
  try {
    const target = interaction.options.getUser('target') || interaction.user;

    if (target.id === botId || target.bot) {
      return interaction.reply({ content: "❌ مشاهده موجودی بات امکان‌پذیر نیست.", ephemeral: true });
    }

    await ensureUser(target.id);

    await interaction.deferReply();

    const userData = economy[target.id];

    // ✅ محدود کردن به دو رقم اعشار
    const wallet = parseFloat(userData.wallet.toFixed(2));
    const bank = parseFloat(userData.bank.toFixed(2));
    const total = parseFloat((wallet + bank).toFixed(2));

    async function generateCreditCard() {
      const width = 900;
      const height = 540;
      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // پس‌زمینه گرادینت
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#8e0000');
      gradient.addColorStop(1, '#8e0000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // قاب و خطوط
      const radius = 30;
      roundRect(ctx, 0, 0, width, height, radius, true, false);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      roundRect(ctx, 10, 10, width - 20, height - 20, radius, false, true);

      // آواتار کاربر
      const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 });
      const avatarResponse = await fetch(avatarURL);
      const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());
      const avatar = await Canvas.loadImage(avatarBuffer);

      const avatarX = 50, avatarY = 50, avatarRadius = 90;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarRadius * 2, avatarRadius * 2);
      ctx.restore();

      // لوگو بالا سمت راست
      const imagePath = path.join(__dirname, '..', 'img', '1.png');
      const centerImage = await Canvas.loadImage(imagePath);
      const imgSize = 100;
      ctx.drawImage(centerImage, 780, 30, imgSize, imgSize);

      // نام کاربر
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Arial Black, Arial, sans-serif';
      ctx.fillText(target.username, avatarX * 2 + avatarRadius * 2, avatarY + 70);

      // شماره کارت فرضی
      ctx.font = '28px Courier New, monospace';
      ctx.fillStyle = '#cccccc';
      ctx.fillText('1234 5678 9012 3456', avatarX * 2 + avatarRadius * 2, avatarY + 130);

      // تاریخ انقضا
      ctx.font = '20px Arial';
      ctx.fillText('EXP 12/29', avatarX * 2 + avatarRadius * 2, avatarY + 170);

      // آیکون پول
      const iconPath = path.join(__dirname, '..', 'img', 's-l1600.jpg');
      const moneyIcon = await Canvas.loadImage(iconPath);

      const iconWidth = 60;
      const iconHeight = 40;
      const textOffsetX = iconWidth + 15;
      const startX = avatarX;

      // کیف پول
      let walletY = avatarY + avatarRadius * 2 + 70;
      ctx.drawImage(moneyIcon, startX, walletY - iconHeight + 10, iconWidth, iconHeight);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(`کیف پول: ${wallet}`, startX + textOffsetX, walletY);

      // بانک
      let bankY = walletY + 60;
      ctx.drawImage(moneyIcon, startX, bankY - iconHeight + 10, iconWidth, iconHeight);
      ctx.fillStyle = '#00BFFF';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(`بانک: ${bank}`, startX + textOffsetX, bankY);

      // مجموع
      let totalY = bankY + 60;
      ctx.drawImage(moneyIcon, startX, totalY - iconHeight + 10, iconWidth, iconHeight);
      ctx.fillStyle = '#32CD32';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(`مجموع: ${total}`, startX + textOffsetX, totalY);

      // لوگوی کارت پایین سمت راست
      const cardImagePath = path.join(__dirname, '..', 'img', 'card.png');
      const cardImage = await Canvas.loadImage(cardImagePath);
      ctx.drawImage(cardImage, width - 90, height - 80, 60, 50);

      return canvas.toBuffer();
    }

    function roundRect(ctx, x, y, w, h, r, fill, stroke) {
      if (typeof r === 'number') {
        r = { tl: r, tr: r, br: r, bl: r };
      } else {
        const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (const side in defaultRadius) {
          r[side] = r[side] || defaultRadius[side];
        }
      }
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

    const buffer = await generateCreditCard();
    const attachment = new AttachmentBuilder(buffer, { name: 'balance.png' });

    await interaction.editReply({ files: [attachment] });

  } catch (error) {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'مشکلی در اجرای کامند رخ داد!', ephemeral: true });
    } else {
      await interaction.editReply({ content: 'مشکلی در اجرای کامند رخ داد!' });
    }
  }
}
