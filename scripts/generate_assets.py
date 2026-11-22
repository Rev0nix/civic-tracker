import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_svg_logo(output_path):
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#132B2F" />
      <stop offset="50%" stop-color="#0E1E21" />
      <stop offset="100%" stop-color="#080F0F" />
    </linearGradient>
    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A3DCE3" />
      <stop offset="60%" stop-color="#43C88A" />
      <stop offset="100%" stop-color="#28616A" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#A3DCE3" />
      <stop offset="100%" stop-color="#43C88A" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Squircle / Shield Container -->
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#shieldGrad)" stroke="#28616A" stroke-width="10" />

  <!-- Inner Ambient Glow Circle -->
  <circle cx="256" cy="256" r="160" fill="#132B2F" opacity="0.6" filter="url(#glow)" />

  <!-- Radar Rings -->
  <circle cx="256" cy="230" r="140" fill="none" stroke="#28616A" stroke-width="4" stroke-dasharray="8 8" opacity="0.4" />
  <circle cx="256" cy="230" r="100" fill="none" stroke="#315C60" stroke-width="5" stroke-dasharray="6 6" opacity="0.6" />
  <circle cx="256" cy="230" r="60" fill="none" stroke="#A3DCE3" stroke-width="6" opacity="0.8" />

  <!-- Center Pin / Hexagonal Core -->
  <g filter="url(#glow)">
    <!-- Geo Pin Shape -->
    <path d="M 256 120 
             C 200 120 156 164 156 220
             C 156 280 236 370 256 390
             C 276 370 356 280 356 220
             C 356 164 312 120 256 120 Z" 
          fill="url(#neonGrad)" />
    
    <!-- Pin Inner Core (Dark Cutout) -->
    <circle cx="256" cy="216" r="44" fill="#080F0F" stroke="#132B2F" stroke-width="6" />

    <!-- Pulsing Radar Center Signal Dot -->
    <circle cx="256" cy="216" r="22" fill="#A3DCE3" />
    <circle cx="256" cy="216" r="10" fill="#FFFFFF" />
  </g>

  <!-- Modern Tech Circuit Accents -->
  <line x1="100" y1="256" x2="156" y2="256" stroke="#43C88A" stroke-width="6" stroke-linecap="round" opacity="0.8" />
  <circle cx="94" cy="256" r="6" fill="#43C88A" />

  <line x1="412" y1="256" x2="356" y2="256" stroke="#A3DCE3" stroke-width="6" stroke-linecap="round" opacity="0.8" />
  <circle cx="418" cy="256" r="6" fill="#A3DCE3" />

  <!-- Base Location Pulse Arc -->
  <ellipse cx="256" cy="420" rx="60" ry="16" fill="none" stroke="#43C88A" stroke-width="5" opacity="0.7" />
  <ellipse cx="256" cy="420" rx="30" ry="8" fill="none" stroke="#A3DCE3" stroke-width="4" opacity="0.9" />
</svg>'''
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Created SVG logo at {output_path}")

def generate_png_logo(size=512):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 512.0

    # Draw rounded rectangle (shield)
    pad = int(24 * scale)
    r = int(112 * scale)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=r, fill=(14, 30, 33, 255), outline=(40, 97, 106, 255), width=int(10 * scale))

    # Inner ambient glow
    cx, cy = size // 2, int(230 * scale)
    glow_r = int(140 * scale)
    for i in range(10, 0, -1):
        alpha = int(12 * (11 - i))
        draw.ellipse([cx - glow_r * i // 10, cy - glow_r * i // 10, cx + glow_r * i // 10, cy + glow_r * i // 10], outline=(163, 220, 227, alpha), width=int(2 * scale))

    # Radar rings
    for radius, col, w in [(int(140 * scale), (40, 97, 106, 160), 3), (int(100 * scale), (49, 92, 96, 200), 4), (int(60 * scale), (163, 220, 227, 240), 5)]:
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=col, width=int(w * scale))

    # Pin head
    pin_r = int(100 * scale)
    # Draw geo pin shape
    points = []
    # top semi-circle
    for deg in range(180, 361):
        rad = math.radians(deg)
        points.append((cx + int(pin_r * math.cos(rad)), cy + int(pin_r * math.sin(rad))))
    # tip
    tip_y = int(390 * scale)
    points.append((cx, tip_y))
    draw.polygon(points, fill=(67, 200, 138, 255))

    # Inner pin cutout
    inner_r = int(44 * scale)
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=(8, 15, 15, 255), outline=(163, 220, 227, 255), width=int(5 * scale))

    # Center dot
    dot_r = int(20 * scale)
    draw.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=(163, 220, 227, 255))
    center_w = int(8 * scale)
    draw.ellipse([cx - center_w, cy - center_w, cx + center_w, cy + center_w], fill=(255, 255, 255, 255))

    # Pulse arcs at base
    pulse_y = int(420 * scale)
    draw.ellipse([cx - int(60 * scale), pulse_y - int(16 * scale), cx + int(60 * scale), pulse_y + int(16 * scale)], outline=(67, 200, 138, 180), width=int(4 * scale))
    draw.ellipse([cx - int(30 * scale), pulse_y - int(8 * scale), cx + int(30 * scale), pulse_y + int(8 * scale)], outline=(163, 220, 227, 230), width=int(3 * scale))

    return img

def create_hero_banner(output_path):
    w, h = 800, 480
    img = Image.new('RGBA', (w, h), (8, 15, 15, 255))
    draw = ImageDraw.Draw(img)

    # Ambient radial gradient
    cx, cy = 400, 240
    for r in range(350, 0, -20):
        alpha = int(45 * (1 - r / 350))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(19, 43, 47, alpha))

    # Grid lines (dark GIS aesthetic)
    for x in range(0, w, 40):
        draw.line([x, 0, x, h], fill=(25, 34, 35, 120), width=1)
    for y in range(0, h, 40):
        draw.line([0, y, w, y], fill=(25, 34, 35, 120), width=1)

    # Add central logo (260x260)
    logo = generate_png_logo(260)
    img.paste(logo, (cx - 130, cy - 150), logo)

    # Floating badge 1 (Left: "Pothole Alert - 100m - GPS Locked")
    b1_x, b1_y, b1_w, b1_h = 60, 280, 240, 70
    draw.rounded_rectangle([b1_x, b1_y, b1_x + b1_w, b1_y + b1_h], radius=16, fill=(16, 24, 25, 240), outline=(40, 97, 106, 255), width=2)
    draw.ellipse([b1_x + 16, b1_y + 24, b1_x + 36, b1_y + 44], fill=(239, 102, 102, 255))
    # Floating badge 2 (Right: "Drainage Fixed - SMS Sent")
    b2_x, b2_y, b2_w, b2_h = 500, 100, 240, 70
    draw.rounded_rectangle([b2_x, b2_y, b2_x + b2_w, b2_y + b2_h], radius=16, fill=(16, 24, 25, 240), outline=(67, 200, 138, 255), width=2)
    draw.ellipse([b2_x + 16, b2_y + 24, b2_x + 36, b2_y + 44], fill=(67, 200, 138, 255))

    img.save(output_path, 'PNG')
    print(f"Created hero banner at {output_path}")

create_svg_logo('public/favicon.svg')
create_svg_logo('src/assets/logo.svg')

logo_512 = generate_png_logo(512)
logo_512.save('public/favicon.png')
logo_512.resize((192, 192), Image.Resampling.LANCZOS).save('public/icon-192.png')
logo_512.resize((64, 64), Image.Resampling.LANCZOS).save('public/favicon.ico')

# Update hero image
create_hero_banner('src/assets/hero.png')

# Update Android Launcher Icons
android_sizes = {
    'android/app/src/main/res/mipmap-mdpi': 48,
    'android/app/src/main/res/mipmap-hdpi': 72,
    'android/app/src/main/res/mipmap-xhdpi': 96,
    'android/app/src/main/res/mipmap-xxhdpi': 144,
    'android/app/src/main/res/mipmap-xxxhdpi': 192,
}

for folder, s in android_sizes.items():
    if os.path.exists(folder):
        resized = logo_512.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(folder, 'ic_launcher.png'))
        resized.save(os.path.join(folder, 'ic_launcher_round.png'))
        resized.save(os.path.join(folder, 'ic_launcher_foreground.png'))
        print(f"Updated Android icons in {folder} ({s}x{s})")

# Update Android Splash
splash_img = Image.new('RGBA', (480, 800), (8, 15, 15, 255))
splash_logo = generate_png_logo(240)
splash_img.paste(splash_logo, (120, 280), splash_logo)
splash_img.convert('RGB').save('android/app/src/main/res/drawable/splash.png')

print("All visual assets successfully generated!")
