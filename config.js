// Preencha com os dados do seu projeto: Supabase > Project Settings > API
const SUPABASE_URL = 'https://vuqomouvpjtjlpvqixvf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cW9tb3V2cGp0amxwdnFpeHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjA2NjUsImV4cCI6MjEwNzgzNjY2NX0.Ei3Uq4wYYH1HsJ98UXhEJexiDqKtVO5fAg3_MSgf56M';
const WHATSAPP = '5511999999999'; // troque pelo número da loja

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const R = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
