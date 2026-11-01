import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 부하 시나리오: 10명 -> 50명 -> 100명 단계별 가상 사용자(VU) 부하 인가
export const options = {
  stages: [
    { duration: '10s', target: 10 },  // 10초 동안 10명까지 점진적 증가
    { duration: '15s', target: 50 },  // 15초 동안 50명까지 증가
    { duration: '15s', target: 100 }, // 15초 동안 100명 최대 부하 유지
    { duration: '5s', target: 0 },    // 5초 동안 부하 종료 (Cool-down)
  ],
  thresholds: {
    // 95%의 요청이 정상 처리되어야 함
    http_req_failed: ['rate<0.05'], // 실패율 5% 미만 유지
  },
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://127.0.0.1:4000/private/api/notices';
const DIRECT_URL = __ENV.DIRECT_URL || 'http://127.0.0.1:5000/api/notices';
const TOKEN = __ENV.ZTNA_TOKEN || '';
const TEST_TARGET = __ENV.TEST_TARGET || 'gateway'; // 'gateway' or 'direct'

export default function () {
  const url = TEST_TARGET === 'direct' ? DIRECT_URL : GATEWAY_URL;
  const headers = {
    'x-ztna-benchmark': 'true',
  };

  if (TEST_TARGET === 'gateway') {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  } else {
    headers['x-user-id'] = '1';
    headers['x-user-email'] = '043kws@gmail.com';
    headers['x-user-role'] = 'USER';
    headers['x-user-department'] = 'ALL';
    headers['x-user-position-level'] = '2';
  }

  const res = http.get(url, { headers });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has valid response': (r) => r.body && r.body.length > 0,
  });

  sleep(0.05); // 사용자 요청 간격 (50ms)
}
