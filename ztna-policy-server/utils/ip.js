/**
 * 요청 객체(req)로부터 클라이언트의 실제 IP 주소를 추출하고 포맷팅합니다.
 * @param {import('express').Request} req 
 * @returns {string} 정제된 IP 주소 (IPv4 형태 또는 루프백 127.0.0.1)
 */
function getClientIp(req) {
    let ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    if (ip.includes('::ffff:')) {
        ip = ip.split('::ffff:')[1];
    }
    if (ip === '::1') {
        ip = '127.0.0.1';
    }
    return ip;
}

module.exports = { getClientIp };
