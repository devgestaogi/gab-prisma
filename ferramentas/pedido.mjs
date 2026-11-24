// pedido.mjs — lado do Claude no fluxo da página /pedido.html
//   node ferramentas/pedido.mjs esperar            → espera um prompt novo (estado "novo"), marca "roteiro" e imprime
//   node ferramentas/pedido.mjs estado <id> <estado> [msg] [projeto]  → atualiza o que a página mostra
// Estados: novo → roteiro → voz → editando → pronto
const API = 'http://localhost:4460/api/pedido';
const [cmd, ...a] = process.argv.slice(2);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const mudar = (id, estado, msg, projeto) => fetch(`${API}/${id}`, {method: 'POST', body: JSON.stringify({estado, msg, projeto})}).then((r) => r.json());

if (cmd === 'esperar') {
  const visto = new Set();
  for (;;) {
    const lista = await fetch(API).then((r) => r.json()).catch(() => []);
    const p = lista.find((x) => x.estado === 'novo' && !visto.has(x.id));
    if (p) {
      await mudar(p.id, 'roteiro', 'o Claude recebeu o prompt e está escrevendo o roteiro');
      console.log(JSON.stringify({id: p.id, texto: p.texto, template: p.template ?? null}, null, 2));
      process.exit(0);
    }
    await esperar(1500);
  }
} else if (cmd === 'estado') {
  const [id, estado, msg, projeto] = a;
  const p = await mudar(id, estado, msg, projeto);
  console.log(p.estado, p.projeto ?? '');
} else {
  console.log('uso: pedido.mjs esperar | pedido.mjs estado <id> <estado> [msg] [projeto]');
}
