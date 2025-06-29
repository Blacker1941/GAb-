import { SlashCommandBuilder } from 'discord.js';
import Canvas from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

// تنظیم مسیر فایل برای ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const data = new SlashCommandBuilder()
  .setName('shenasnameh')
  .setDescription('شناسنامه بساز')
  .addUserOption(option => 
    option.setName('target')
      .setDescription('کاربری که می‌خواهید شناسنامه‌اش ساخته شود')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('name').setDescription('اسم').setRequired(true))
  .addStringOption(option => 
    option.setName('family').setDescription('فامیلی').setRequired(true))
  .addStringOption(option => 
      option.setName('birthyear').setDescription('سال تولد').setRequired(true))
  .addStringOption(option => 
    option.setName('mother').setDescription('نام مادر').setRequired(true))
  .addStringOption(option => 
    option.setName('father').setDescription('نام پدر').setRequired(true))
  .addStringOption(option => 
    option.setName('spouse').setDescription('نام همسر').setRequired(true))
  .addStringOption(option => 
    option.setName('birthplace').setDescription('محل تولد').setRequired(true));

const allowedUsers = new Set(['1374080838882300114', '1238871264916017193','1265667005948891222']);

export async function execute(interaction) {
  if (!allowedUsers.has(interaction.user.id)) {
    return interaction.reply({ content: '❌ شما اجازه استفاده از این دستور را ندارید.', ephemeral: true });
  }

  await interaction.deferReply();

  const targetUser = interaction.options.getUser('target') || interaction.user;

  const name = interaction.options.getString('name');
  const family = interaction.options.getString('family');
  const birthyear = interaction.options.getString('birthyear');
  const mother = interaction.options.getString('mother');
  const father = interaction.options.getString('father');
  const spouse = interaction.options.getString('spouse') || '—';
  const birthplace = interaction.options.getString('birthplace');

  // خواندن countriesData.json به صورت داینامیک
  let countriesData = {};
  try {
    const dataRaw = await fs.readFile(path.join(__dirname, '..', 'countriesData.json'), 'utf8');
    countriesData = JSON.parse(dataRaw);
  } catch (err) {
    console.error('خطا در خواندن countriesData.json:', err);
  }

  // مقداردهی پیشفرض
  let headerName = 'گنگ ادمین';
  let currencyName = '—';
  let currencyImageUrl = null;
  let govLogoUrls = [];

  // جستجو برای سروری که کاربر در آن شهروند است
  if (countriesData.servers) {
    for (const serverId in countriesData.servers) {
      const server = countriesData.servers[serverId];
      if (server.citizens.includes(targetUser.id)) {
        headerName = server.country || headerName;
        currencyName = server.currency || currencyName;
        currencyImageUrl = server.currencyImage || null;

        // اولویت با flagImage، اگر نبود symbolImage
        if (server.flagImage) {
          govLogoUrls = [server.flagImage, server.flagImage];
        } else if (server.symbolImage) {
          govLogoUrls = [server.symbolImage, server.symbolImage];
        }
        break;
      }
    }
  }

  const width = 900;
  const height = 600;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // پس‌زمینه کاغذ کهنه کرمی
  ctx.fillStyle = '#f9f4e7';
  ctx.fillRect(0, 0, width, height);

  // بافت نویزی ملایم
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.02})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }

  // حاشیه
  ctx.strokeStyle = '#6b4f3f';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.strokeStyle = '#a67c52';
  ctx.lineWidth = 2;
  ctx.strokeRect(35, 35, width - 70, height - 70);

  // عنوان کشور (اسم کشور از فایل)
  ctx.fillStyle = '#6b4f3f';
  ctx.font = 'bold 42px Tahoma';
  ctx.textAlign = 'center';
  ctx.fillText(headerName, width / 2, 80);

  ctx.strokeStyle = '#6b4f3f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, 95);
  ctx.lineTo(width - 300, 95);
  ctx.stroke();

  // اضافه کردن لوگوی حکومت (دو نماد دو طرف بالای شناسنامه)
  try {
    if (govLogoUrls.length === 2) {
      // هر دو لوگو از URL لود می‌شوند (لوگوی سمت چپ و راست)
      const govLogoLeft = await Canvas.loadImage(govLogoUrls[0]);
      const govLogoRight = await Canvas.loadImage(govLogoUrls[1]);

      const drawSize = 50;
      const drawY = 40;

      // لوگوی سمت چپ
      const logoWidthLeft = govLogoLeft.width;
      const logoHeightLeft = govLogoLeft.height;
      const squareSizeLeft = Math.min(logoWidthLeft, logoHeightLeft);
      const cropXLeft = (logoWidthLeft - squareSizeLeft) / 2;
      const cropYLeft = (logoHeightLeft - squareSizeLeft) / 2;

      const drawXLeft = 250;
      ctx.drawImage(govLogoLeft, cropXLeft, cropYLeft, squareSizeLeft, squareSizeLeft, drawXLeft, drawY, drawSize, drawSize);

      // لوگوی سمت راست
      const logoWidthRight = govLogoRight.width;
      const logoHeightRight = govLogoRight.height;
      const squareSizeRight = Math.min(logoWidthRight, logoHeightRight);
      const cropXRight = (logoWidthRight - squareSizeRight) / 2;
      const cropYRight = (logoHeightRight - squareSizeRight) / 2;

      const drawXRight = width - 250 - drawSize;
      ctx.drawImage(govLogoRight, cropXRight, cropYRight, squareSizeRight, squareSizeRight, drawXRight, drawY, drawSize, drawSize);

    } else {
      // اگر لوگوی کشور نبود، از لوگوی ثابت استفاده کن
      const govLogoPath = path.join(__dirname, '..', 'img', '1.png');
      const govLogo = await Canvas.loadImage(govLogoPath);

      const logoWidth = govLogo.width;
      const logoHeight = govLogo.height;
      const squareSize = Math.min(logoWidth, logoHeight);
      const cropX = (logoWidth - squareSize) / 2;
      const cropY = (logoHeight - squareSize) / 2;

      const drawSize = 50;
      const drawY = 40;

      const drawXLeft = 250;
      ctx.drawImage(govLogo, cropX, cropY, squareSize, squareSize, drawXLeft, drawY, drawSize, drawSize);

      const drawXRight = width - 250 - drawSize;
      ctx.drawImage(govLogo, cropX, cropY, squareSize, squareSize, drawXRight, drawY, drawSize, drawSize);
    }
  } catch (err) {
    console.error('لوگو پیدا نشد:', err);
  }

  // آواتار کاربر
  try {
    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
    const avatar = await Canvas.loadImage(avatarURL);
    const avatarX = 85;
    const avatarY = 130;
    const avatarSize = 140;

    ctx.fillStyle = '#f0ead6';
    roundRect(ctx, avatarX - 8, avatarY - 8, avatarSize + 16, avatarSize + 16, 12, true, false);

    ctx.strokeStyle = '#6b4f3f';
    ctx.lineWidth = 4;
    roundRect(ctx, avatarX - 8, avatarY - 8, avatarSize + 16, avatarSize + 16, 12, false, true);

    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch {
    ctx.strokeStyle = '#6b4f3f';
    ctx.lineWidth = 4;
    roundRect(ctx, 50, 130, 140, 140, 12, false, true);
  }

  // اطلاعات شناسنامه
  ctx.fillStyle = '#5a3e2b';
  ctx.font = '28px Tahoma';
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const startX = width - 70;
  let startY = 160;
  const lineHeight = 48;

  ctx.fillText(`اسم: ${name}`, startX, startY); 
  startY += lineHeight;
  
  ctx.fillText(`فامیلی: ${family}`, startX, startY); 
  startY += lineHeight;
  
  ctx.fillText(`سال تولد: ${birthyear}`, startX, startY); 
  startY += lineHeight;
  
  ctx.fillText(`نام مادر: ${mother}`, startX, startY); 
  startY += lineHeight;
  
  ctx.fillText(`نام پدر: ${father}`, startX, startY); 
  startY += lineHeight;
  
  ctx.fillText(`نام همسر: ${spouse}`, startX, startY); 
  startY += lineHeight;
  
  ctx.fillText(`محل تولد: ${birthplace}`, startX, startY);
  startY += lineHeight;

  // اضافه کردن اقتصاد (نام پول + نماد پول اگر داشت)
  ctx.fillText(`پول کشور: ${currencyName}`, startX, startY);
  if (currencyImageUrl) {
    try {
      const currencyImg = await Canvas.loadImage(currencyImageUrl);
      const imgSize = 40;
      const imgX = startX - ctx.measureText(`پول کشور: ${currencyName}`).width - imgSize - 10;
      const imgY = startY - 36; // کمی بالاتر از متن
      ctx.drawImage(currencyImg, imgX, imgY, imgSize, imgSize);
    } catch (err) {
      console.error('بارگذاری نماد پول ناموفق بود:', err);
    }
  }

  ctx.shadowColor = 'transparent';

  const buffer = canvas.toBuffer();
  await interaction.editReply({ files: [{ attachment: buffer, name: 'shenasnameh.png' }] });
}

// تابع مستطیل با گوشه گرد
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === 'undefined') radius = 5;
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (let side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
