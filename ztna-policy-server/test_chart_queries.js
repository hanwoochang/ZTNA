require('dotenv').config();
const pool = require('./db');

async function testQuery() {
    try {
        console.log("--- TREND ---");
        const [trend] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%H:00') as time,
                COUNT(*) as count,
                ROUND(AVG(risk_score), 1) as avgRisk
            FROM access_logs
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            GROUP BY time
            ORDER BY time ASC
        `);
        console.log(trend);

        console.log("--- TOP RISKY ---");
        const [topRisky] = await pool.query(`
            SELECT 
                u.name, 
                u.department, 
                SUM(l.risk_score) as totalRisk, 
                COUNT(l.id) as incidentCount
            FROM access_logs l
            JOIN users u ON l.user_id = u.id
            WHERE l.created_at >= NOW() - INTERVAL 7 DAY
            GROUP BY u.id
            ORDER BY totalRisk DESC
            LIMIT 5
        `);
        console.log(topRisky);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testQuery();
