# Template cartoon-2d-cenario-3d

Personagens 2D chapados (SVG) dentro de cenários 3D procedurais (three), tudo por código, sem imagem de IA.
Câmera que nunca para, fundo desfocado (profundidade de campo fingida), vinheta, grão, inserts de objeto-prova
e transição por obstáculo. Roteiro com `"template": "cartoon-2d-cenario-3d"`. Demo: `roteiros/demo-cartoon.json`.

Arquivos: `Cartoon.tsx` (cena, câmera, grading, obstáculo), `set3d.tsx` (sala, escritório, varanda, porta),
`personagens.tsx` (dono, funcionária, cliente, silhueta), `inserts.tsx` (celular, papel, planilha),
`texturas.ts` (texturas de canvas), `util.ts`.

Campos do roteiro: veja a seção 7 de `DESIGN VIDEOS IA/templates/cartoon-2d-cenario-3d/TEMPLATE.md`.

Rodar: `node ferramentas/alinhar.mjs roteiros/<x>.json <voz>` e `node ferramentas/render.mjs roteiros/<x>.json [saida] [--quadro N]`.
Um quadro leva 2 a 5 s (GPU, `angle`); a demo de 35 s renderiza em ~40 s no Mac.

Regras: determinístico por quadro (sem Math.random), `marca: "gi"` liga o logo nos 3 últimos segundos,
`cores.destaque` colore só o objeto-prova (padrão âmbar `#F2A93B`), sem travessão em texto.
