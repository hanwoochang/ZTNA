#!/bin/bash

# ZTNA 통합 실행 스크립트
# Policy Server (3000), Gateway (4000), Client (Expo)를 동시에 실행합니다.

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   ZTNA (Zero Trust) Full Stack Starter       ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 현재 디렉토리 저장
ROOT_DIR=$(pwd)

# 종료 시 모든 백그라운드 프로세스 함께 종료하는 함수
cleanup() {
    echo -e "\n${YELLOW}모든 프로세스를 종료하는 중...${NC}"
    kill $(jobs -p) 2>/dev/null
    echo -e "${GREEN}종료 완료.${NC}"
    exit
}

trap cleanup SIGINT SIGTERM

# 1. ZTNA Policy Server 실행 (Port: 3000)
echo -e "${YELLOW}[1/4] Policy Server 시작 중...${NC}"
cd "$ROOT_DIR/ztna-policy-server"
node server.js > policy-server.log 2>&1 &
POLICY_PID=$!
echo -e "${GREEN}✔ Policy Server 실행 중 (PID: $POLICY_PID)${NC}"

# 2. ZTNA Gateway 실행 (Port: 4000)
echo -e "${YELLOW}[2/4] Gateway 시작 중...${NC}"
cd "$ROOT_DIR/ztna-gateway"
node server.js > gateway.log 2>&1 &
GATEWAY_PID=$!
echo -e "${GREEN}✔ Gateway 실행 중 (PID: $GATEWAY_PID)${NC}"

# 3. Target Server 실행 (Port: 5000)
echo -e "${YELLOW}[3/4] Target Server (기밀 구역) 시작 중...${NC}"
cd "$ROOT_DIR/ztna-gateway"
node target.js > target-server.log 2>&1 &
TARGET_PID=$!
echo -e "${GREEN}✔ Target Server 실행 중 (PID: $TARGET_PID)${NC}"

# 4. ZTNA Client 실행 (Expo)
echo -e "${YELLOW}[4/4] Client (Expo) 시작 중...${NC}"
cd "$ROOT_DIR/ztna-client"
# Expo는 대화형이므로 마지막에 실행하여 제어권을 가짐
echo -e "${BLUE}----------------------------------------------${NC}"
echo -e "${BLUE}참고: 로그는 각 폴더의 .log 파일에서 확인 가능합니다.${NC}"
echo -e "${BLUE}Ctrl+C를 누르면 모든 서버가 안전하게 종료됩니다.${NC}"
echo -e "${BLUE}----------------------------------------------${NC}"

npx expo start

# Expo가 종료되면 cleanup 실행
cleanup
