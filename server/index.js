require('dotenv').config();

const app = require('./app');
const { startAnalysisSweeper } = require('./src/utils/analysisSweeper');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Zephyr server running on port ${PORT}`);
  // Autonomous AI analysis + contact enrichment for any unprocessed leads.
  startAnalysisSweeper();
});
