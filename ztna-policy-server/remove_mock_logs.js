require('dotenv').config();
const pool = require('./db');

async function removeMockLogs() {
    try {
        console.log('더미 데이터([MOCK]) 삭제를 시작합니다...');
        
        const [result] = await pool.query("DELETE FROM access_logs WHERE reason LIKE '[MOCK]%'");
        
        console.log(`✅ 성공적으로 ${result.affectedRows}개의 더미(Mock) 로그가 삭제되었습니다!`);
        console.log('이제 차트 및 로그 화면에 실제 데이터만 표시됩니다.');
        process.exit(0);
        
    } catch (error) {
        console.error('더미 데이터 삭제 중 오류 발생:', error);
        process.exit(1);
    }
}

removeMockLogs();
