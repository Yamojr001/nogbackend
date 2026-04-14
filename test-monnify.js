const fetch = require('node-fetch');
async function test() {
  const token = Buffer.from('MK_TEST_ACHGGEXYS6:YLWDE1DH0QXEE8AK1FVN10X1J1M2YB0K').toString('base64');
  let authRes = await fetch('https://sandbox.monnify.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + token }
  });
  let authData = await authRes.json();
  
  let res = await fetch('https://sandbox.monnify.com/api/v1/merchant/transactions/query?transactionReference=MNFY|38|20260414012109|000036', {
    headers: { 'Authorization': 'Bearer ' + authData.responseBody.accessToken }
  });
  console.log(JSON.stringify(await res.json(), null, 2));
}
test();
