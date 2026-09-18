const axios = require('axios');
async function testLogin() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@company.com',
      password: '1234',
      deviceId: 'admin-dashboard-browser'
    });
    console.log('Login successful:', res.data);
  } catch (error) {
    console.log('Login failed:', error.response?.data || error.message);
  }
}
testLogin();
