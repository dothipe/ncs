import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// High-fidelity SVG inner layers representing the exact official user-uploaded VSC logo
function getVscInnerSvg() {
  return `
    <!-- Premium metallic gold gradient definitions -->
    <defs>
      <linearGradient id="gold_grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#AA7E25" />
        <stop offset="30%" stop-color="#F3BD48" />
        <stop offset="50%" stop-color="#FFF2A3" />
        <stop offset="70%" stop-color="#DCA237" />
        <stop offset="100%" stop-color="#916617" />
      </linearGradient>
      
      <!-- Vietnam red color radial depth gradient -->
      <radialGradient id="red_bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ED282D" />
        <stop offset="80%" stop-color="#CE171C" />
        <stop offset="100%" stop-color="#A50B0F" />
      </radialGradient>
      
      <!-- Arched text path: curves clockwise along upper gold ring center line -->
      <path id="curve_text_path" d="M 76,256 A 180,180 0 1,1 436,256" fill="none" stroke="none" />
    </defs>

    <!-- Outer Golden Ring base -->
    <circle cx="256" cy="256" r="236" fill="url(#gold_grad)" stroke="#FFFFFF" stroke-width="4.5" />
    <circle cx="256" cy="256" r="235" fill="none" stroke="#634505" stroke-width="1.8" />
    
    <!-- Inner Crimson Red Circle -->
    <circle cx="256" cy="256" r="185" fill="url(#red_bg)" stroke="url(#gold_grad)" stroke-width="4" />

    <!-- Pure Symmetrical Slingshot Fork (horn-style) -->
    <g id="slingshot_fork_shape">
      <path d="M 168,162 
               C 168,138 188,138 193,162
               C 188,182 218,292 242,302 
               L 242,425 
               C 242,431 270,431 270,425 
               L 270,302 
               C 294,292 324,182 319,162
               C 324,138 344,138 344,162
               C 344,208 324,302 284,327
               L 284,425
               C 284,442 228,442 228,425
               L 228,327
               C 188,302 168,208 168,162 Z" 
            fill="url(#gold_grad)" 
            stroke="#452E02" 
            stroke-width="1.2" />
      
      <!-- Slingshot metal reflection glares for nice contrast -->
      <path d="M 181,162 C 181,187 206,282 238,292" stroke="#FFFFFF" stroke-dasharray="10 5" stroke-linecap="round" fill="none" stroke-width="2.5" opacity="0.32" />
      <path d="M 331,162 C 331,187 306,282 274,292" stroke="#FFFFFF" stroke-dasharray="10 5" stroke-linecap="round" fill="none" stroke-width="2.5" opacity="0.32" />
    </g>

    <!-- Map of Vietnam Overlay (Soft opaque overlay blending gracefully) -->
    <g opacity="0.85" style="mix-blend-mode: overlay;">
      <path d="M 235,165 
               C 240,155 255,150 262,154 
               C 264,156 261,162 263,166 
               C 266,168 274,166 278,172 
               C 281,176 288,175 292,182 
               C 294,186 288,190 294,195 
               C 298,197 302,204 300,210 
               C 297,215 280,210 274,216 
               C 270,220 282,228 276,234 
               C 270,239 264,245 272,252 
               C 276,255 285,258 290,266 
               C 294,272 300,285 304,295 
               C 308,305 320,312 322,320 
               C 324,328 316,335 310,342 
               C 304,348 294,352 288,360 
               C 282,367 274,375 268,385 
               C 262,392 255,400 248,406 
               C 244,410 238,405 238,398 
               C 240,390 248,382 250,375 
               C 252,368 259,362 256,355 
               C 253,348 245,345 248,338 
               C 251,332 258,328 261,318 
               C 264,308 262,298 258,288 
               C 254,278 248,272 245,260 
               C 242,248 245,238 240,228 
               C 236,218 230,212 232,202 
               C 234,192 228,185 232,175 
               C 234,168 232,166 235,165 Z" 
            fill="#FFF6F6" 
            stroke="#FFFFFF" 
            stroke-width="1.8" 
            filter="drop-shadow(0px 0px 5px rgba(255, 255, 255, 0.45))" />
    </g>

    <!-- Hanoi Capital Golden Star -->
    <polygon points="258,185 260,192 268,192 262,196 264,204 258,199 252,204 254,196 248,192 256,192" 
             fill="#FFF200" 
             stroke="#C16900" 
             stroke-width="0.3" />

    <!-- Arched text layout -->
    <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28.8px" fill="#181410" letter-spacing="1.4px">
      <textPath href="#curve_text_path" startOffset="50%" text-anchor="middle">VIET NAM SLINGSHOT CHAMPIONSHIP</textPath>
    </text>

    <!-- Left side 3 white stars rotated nicely along the ring curve -->
    <g transform="translate(256, 256)">
      <g transform="rotate(114)">
        <polygon points="0,-211 -4,-201 5,-205 -5,-205 4,-201" fill="#FFFFFF" stroke="#5E4003" stroke-width="0.5" transform="scale(1.9)"/>
      </g>
      <g transform="rotate(128)">
        <polygon points="0,-211 -4,-201 5,-205 -5,-205 4,-201" fill="#FFFFFF" stroke="#5E4003" stroke-width="0.5" transform="scale(1.9)"/>
      </g>
      <g transform="rotate(142)">
        <polygon points="0,-211 -4,-201 5,-205 -5,-205 4,-201" fill="#FFFFFF" stroke="#5E4003" stroke-width="0.5" transform="scale(1.9)"/>
      </g>
    </g>

    <!-- Right side 3 white stars rotated nicely along the ring curve -->
    <g transform="translate(256, 256)">
      <g transform="rotate(-114)">
        <polygon points="0,-211 -4,-201 5,-205 -5,-205 4,-201" fill="#FFFFFF" stroke="#5E4003" stroke-width="0.5" transform="scale(1.9)"/>
      </g>
      <g transform="rotate(-128)">
        <polygon points="0,-211 -4,-201 5,-205 -5,-205 4,-201" fill="#FFFFFF" stroke="#5E4003" stroke-width="0.5" transform="scale(1.9)"/>
      </g>
      <g transform="rotate(-142)">
        <polygon points="0,-211 -4,-201 5,-205 -5,-205 4,-201" fill="#FFFFFF" stroke="#5E4003" stroke-width="0.5" transform="scale(1.9)"/>
      </g>
    </g>

    <!-- Bottom italic bold red VSC lettering with outstanding gold outline -->
    <text x="256" y="468" 
          text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="62px" 
          font-weight="900" 
          font-style="italic" 
          fill="#E52320" 
          stroke="#FFF200" 
          stroke-width="2.2" 
          letter-spacing="0.5px"
          filter="drop-shadow(0px 3px 3px rgba(0,0,0,0.4))">VSC</text>
  `;
}

// Complete SVG logo wrapper
const makeLogoSvg = (isAdaptiveForeground = false) => {
  // If isAdaptiveForeground is true, scale the entire logo within 72% of the canvas
  // to perfectly sit inside Android's adaptive-icon safe zone mask without clipping details.
  const scaleG = isAdaptiveForeground ? 'transform="translate(256, 256) scale(0.72) translate(-256, -256)"' : '';
  return `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g ${scaleG}>
    ${getVscInnerSvg()}
  </g>
</svg>
`;
};

// Beautiful fullscreen Splash container
const makeSplashSvg = (logoSize) => `
<svg width="1200" height="1200" viewBox="0 0 1200 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid deep dark slate canvas background -->
  <rect width="1200" height="1200" fill="#0F172A" />

  <!-- Center-positioned golden round VSC medal logo -->
  <g transform="translate(${600 - logoSize / 2}, ${520 - logoSize / 2}) scale(${logoSize / 512})">
    ${getVscInnerSvg()}
  </g>

  <!-- High-end typography below splash logo -->
  <text
    x="600"
    y="880"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="34px"
    fill="#FCD34D"
    font-weight="900"
    letter-spacing="2px"
  >VSC SLINGSHOT</text>
  
  <text
    x="600"
    y="930"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="16px"
    fill="#64748B"
    font-weight="600"
    letter-spacing="4px"
  >VIETNAM SLINGSHOT CHAMPIONSHIP</text>
</svg>
`;

const resDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

async function renderLauncherIcon(size, targetPath, isAdaptiveForeground = false) {
  const currentSvg = makeLogoSvg(isAdaptiveForeground);
  await sharp(Buffer.from(currentSvg))
    .resize(size, size)
    .png()
    .toFile(targetPath);
  console.log(`Rendered icon (${size}x${size}) -> ${path.relative(process.cwd(), targetPath)}`);
}

async function renderSplash(width, height, targetPath) {
  const logoSize = Math.floor(Math.min(width, height) * 0.4);
  const splashSvg = makeSplashSvg(logoSize);
  
  await sharp(Buffer.from(splashSvg))
    .resize(width, height)
    .png()
    .toFile(targetPath);
  console.log(`Rendered splash (${width}x${height}) -> ${path.relative(process.cwd(), targetPath)}`);
}

async function main() {
  console.log("Generating premium 128-bit exact VSC official visual launcher assets...");
  
  // High-res png outputs matching the Android MIPMAP structure
  const mipmaps = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 }
  ];

  for (const m of mipmaps) {
    const dirPath = path.join(resDir, m.name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    // ic_launcher.png (Legacy square launcher grids) takes the full-sized circular medal
    await renderLauncherIcon(m.size, path.join(dirPath, 'ic_launcher.png'), false);
    
    // ic_launcher_round.png takes the full-sized circular medal
    await renderLauncherIcon(m.size, path.join(dirPath, 'ic_launcher_round.png'), false);
    
    // ic_launcher_foreground.png (Adaptive launcher grids) takes the safely padded scaled-down medal
    await renderLauncherIcon(m.size, path.join(dirPath, 'ic_launcher_foreground.png'), true);
  }

  // Drawables landscapes and portraits splashed screens
  const splashDirs = [
    { name: 'drawable', w: 1200, h: 1200 },
    { name: 'drawable-land-mdpi', w: 480, h: 320 },
    { name: 'drawable-land-hdpi', w: 800, h: 480 },
    { name: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { name: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { name: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
    { name: 'drawable-port-mdpi', w: 320, h: 480 },
    { name: 'drawable-port-hdpi', w: 480, h: 800 },
    { name: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { name: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { name: 'drawable-port-xxxhdpi', w: 1280, h: 1920 }
  ];

  for (const s of splashDirs) {
    const dirPath = path.join(resDir, s.name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    await renderSplash(s.w, s.h, path.join(dirPath, 'splash.png'));
  }

  console.log("Assets generation and overwrite executed flawlessly!");
}

main().catch(err => {
  console.error("error generating assets programmatically:", err);
  process.exit(1);
});
