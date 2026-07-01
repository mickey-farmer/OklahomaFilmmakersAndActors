const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

require('./casting-call-bot'); // starts the Discord client

app.get('/', (req, res) => res.send('Wizard Bot is Online!'));
app.listen(port, () => console.log(`Listening on port ${port}`));
