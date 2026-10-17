/*
 * CONFIGURAÇÃO DA LOJA
 * SUPABASE_URL e SUPABASE_KEY: Supabase > Project Settings > API.
 * SUPABASE_KEY deve ser a chave pública anon/publishable, NUNCA a service_role.
 * WhatsApp no formato internacional, somente números (Brasil: 55 + DDD + número).
 */
const SUPABASE_URL = 'https://vuqomouvpjtjlpvqixvf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cW9tb3V2cGp0amxwdnFpeHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjA2NjUsImV4cCI6MjEwNzgzNjY2Nn0.Ei3Uq4wYYH1HsJ98UXhEJexiDqKtVO5fAg3_MSgf56M';
const WHATSAPP = '5511999999999'; // TROQUE pelo WhatsApp real da loja.

if (!window.supabase) {
  console.error('A biblioteca do Supabase não foi carregada. Verifique sua conexão.');
}
const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
const R = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const imageFallback = name => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700"><rect width="600" height="700" fill="#f0edeb"/><circle cx="300" cy="285" r="70" fill="#e4d8d5"/><path d="M160 510 Q300 370 440 510" fill="none" stroke="#e04a51" stroke-width="8"/><text x="300" y="590" text-anchor="middle" font-family="Arial" font-size="24" fill="#77716f">${String(name || 'LUME').replace(/[^a-zA-Z0-9 ._-]/g, '')}</text></svg>`)}`;
