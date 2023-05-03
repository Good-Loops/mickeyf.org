// Import essential libraries 
const express = require('express');
const app = express();
const path = require('path');
const router = express.Router();

const dir = __dirname.substring(0, __dirname.indexOf("dist"));

// Setup essential routes 
router.get('/', function (req, res) {
    res.sendFile(path.join(dir + 'index.html'));
});
// router.get('/about', function (req, res) {
//     res.sendFile(path.join(__dirname + '/about.html'));
// });
// router.get('/sitemap', function (req, res) {
//     res.sendFile(path.join(__dirname + '/sitemap.html'));
// });

//add the router 
app.use('/', router);
app.use(express.static(path.join(dir)));
app.listen(process.env.port || 3000);
console.log('Running at Port 3000 ');