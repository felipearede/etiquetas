import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KV_KEY = 'etiquetas_mappings';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const mappings = await redis.get(KV_KEY);
      return res.status(200).json(mappings || []);
    } catch (e) {
      console.error('Erro ao ler Redis:', e);
      return res.status(500).json({ error: 'Erro ao carregar mapeamentos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const mappings = req.body;
      if (!Array.isArray(mappings)) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }
      await redis.set(KV_KEY, JSON.stringify(mappings));
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('Erro ao salvar Redis:', e);
      return res.status(500).json({ error: 'Erro ao salvar mapeamentos' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
