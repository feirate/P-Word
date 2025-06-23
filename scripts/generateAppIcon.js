/**
 * P-Word 小程序头像生成器 - 左右布局版
 * 生成符合微信小程序要求的144x144px PNG格式头像
 * P字母左侧居中，Word文字右侧居中，底部对齐
 */

const fs = require('fs');
const path = require('path');

function generatePWordIcon() {
  const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景圆角矩形 -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="letterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F0F8FF;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景 -->
  <rect width="144" height="144" rx="28" ry="28" fill="url(#bgGradient)"/>
  
  <!-- 主要字母 P - 左侧上下居中 -->
  <g transform="translate(20, 32)">
    <!-- P的竖线 -->
    <rect x="0" y="0" width="12" height="80" fill="url(#letterGradient)" rx="3"/>
    
    <!-- P的上横线 -->
    <rect x="0" y="0" width="42" height="12" fill="url(#letterGradient)" rx="3"/>
    
    <!-- P的中横线 -->
    <rect x="0" y="24" width="38" height="12" fill="url(#letterGradient)" rx="3"/>
    
    <!-- P的右竖线 -->
    <rect x="30" y="0" width="12" height="36" fill="url(#letterGradient)" rx="3"/>
  </g>
  
  <!-- Word文字 - 右侧上下居中，底部与P对齐 -->
  <g transform="translate(102, 112)">
    <text x="-28" y="0" font-family="Arial, sans-serif" font-size="20" font-weight="bold" 
          fill="white" opacity="0.95" text-anchor="middle">Word</text>
  </g>
</svg>`;

  // 保存SVG文件
  const iconDir = path.join(__dirname, '../miniprogram/assets/icons/app');
  const svgPath = path.join(iconDir, 'app-icon.svg');
  
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }
  
  fs.writeFileSync(svgPath, svgIcon, 'utf8');
  
  console.log('🎨 P-Word 小程序头像已生成（左右布局版）！');
  console.log('📍 文件位置:', svgPath);
  console.log('');
  console.log('📋 转换为PNG的步骤:');
  console.log('1. 使用在线SVG转PNG工具（如 https://www.aconvert.com/cn/image/svg-to-png/）');
  console.log('2. 上传生成的 app-icon.svg 文件');
  console.log('3. 设置输出尺寸为 144x144 像素');
  console.log('4. 下载PNG格式文件');
  console.log('5. 重命名为 app-icon.png');
  console.log('');
  console.log('🎯 左右布局设计特点:');
  console.log('• 蓝色渐变背景保持专业感');
  console.log('• 左侧"P"字母上下居中，品牌突出');
  console.log('• 右侧"Word"文字上下居中，功能明确');
  console.log('• 底部对齐设计，视觉平衡');
  console.log('• 144x144px符合微信小程序要求');
  
  return svgPath;
}

// 运行生成器
if (require.main === module) {
  generatePWordIcon();
}

module.exports = generatePWordIcon; 