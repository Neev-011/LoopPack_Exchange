import app from './src/app.js';

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`[LoopPack Exchange API] Server running on http://localhost:${PORT}`);
});
