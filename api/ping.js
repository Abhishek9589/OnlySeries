export default function handler(req, res) {
  const ping = process.env.PING_MESSAGE ?? 'ping';
  res.json({ message: ping });
}
