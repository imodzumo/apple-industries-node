const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

const data = require('./database/data.json');

app.get('/data', (req, res) => {
	res.json(data);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
	console.log(`Backend server is running on http://localhost:${PORT}`);
});
