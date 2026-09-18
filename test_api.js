const axios = require('axios');
axios.get('http://localhost:3000/api/admin/users', {
  headers: { Authorization: `Bearer ${process.argv[2]}` }
}).then(res => console.log("DATA:", res.data)).catch(e => console.log("ERR:", e.message, e.response?.data));
