npx create-expo-app ztna-client
cd ztna-client

# 1. 기기 정보(Device), 네트워크(IP), 안전 금고(Secure Store) 설치
npx expo install expo-device expo-network expo-secure-store

# 2. 서버 통신(axios) 패키지 설치
npm install axios

# 3. 시작
npx expo start
