module.exports = (req, res, next) => {
    const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const clientIP = req.socket.remoteAddress;

    if (!allowedIPs.includes(clientIP)) {
        console.log(`[차단] 외부 IP(${clientIP})가 타겟 서버에 직접 접근 시도!`);
        return res.status(403).json({ message: '외부 직접 접근 금지' });
    }
    next();
};
