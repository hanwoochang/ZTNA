/**
 * 요청 객체(req)로부터 Nginx(X-Real-IP) 및 trust proxy가 검증한 실제 클라이언트 IP를 반환합니다.
 * @param {import('express').Request} req
 * @returns {string}
 */
function getClientIp(req) {
    let ip = req.headers['x-real-ip']?.trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (ip.includes('::ffff:')) {
        ip = ip.split('::ffff:')[1];
    }
    if (ip === '::1') {
        ip = '127.0.0.1';
    }
    return ip;
}

module.exports = { getClientIp };
