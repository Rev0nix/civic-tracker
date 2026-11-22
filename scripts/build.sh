#!/usr/bin/env bash
# ==============================================================================
#  Lokify Multi-Engine Build Automation Script (Bash / POSIX Shell)
# ==============================================================================
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} 🏛️  LOKIFY MULTI-STACK PRODUCTION BUILD PIPELINE ${NC}"
echo -e "${CYAN}============================================================${NC}"

# 1. Typecheck TypeScript
echo -e "\n${YELLOW}[1/5] Verifying TypeScript Definitions...${NC}"
npx tsc --noEmit
echo -e "${GREEN}✓ TypeScript compilation check passed.${NC}"

# 2. Lint JavaScript & JSX
echo -e "\n${YELLOW}[2/5] Running ESLint Verification...${NC}"
npm run lint
echo -e "${GREEN}✓ ESLint passed with 0 errors.${NC}"

# 3. Build Web Bundle with Vite
echo -e "\n${YELLOW}[3/5] Compiling Production Web Assets with Vite & Tailwind...${NC}"
npm run build
echo -e "${GREEN}✓ Production web bundle compiled to ./dist.${NC}"

# 4. Synchronize Capacitor Android Assets
echo -e "\n${YELLOW}[4/5] Synchronizing Capacitor Native Android Container...${NC}"
npx cap sync android
echo -e "${GREEN}✓ Capacitor sync complete.${NC}"

# 5. Build Native Kotlin Android Debug APK
echo -e "\n${YELLOW}[5/5] Building Native Kotlin Android APK with Gradle...${NC}"
(
  cd android
  chmod +x gradlew
  ./gradlew assembleDebug --no-daemon
)
echo -e "${GREEN}✓ Android APK generated successfully at android/app/build/outputs/apk/debug/app-debug.apk.${NC}"

echo -e "\n${CYAN}============================================================${NC}"
echo -e "${GREEN} 🎉 ALL JOBS COMPLETED SUCCESSFULLY! ${NC}"
echo -e "${CYAN}============================================================${NC}"
