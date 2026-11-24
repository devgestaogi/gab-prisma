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

## Modo "planos de imagem" (`planos.tsx`)

O conteúdo da cena pode ser uma imagem gerada do assunto no estilo do template (personagem 2D de contorno grosso em
cenário com volume e luz de cinema). O template só anima por cima. Sem `plano` a cena segue o set 3D + personagens SVG.

- `cena.plano: {imagem, movimento?: "push"|"dolly"|"plongee"|"pan", foco?: [x, y]}`. Imagem em
  `public/<projeto>/planos/` (`imagemDoProjeto`); ausente ou inválida = sem plano. Com plano, a imagem substitui set 3D e
  personagens; `insert` continua por cima. `foco` (0..1) é o alvo do push e o lado do dolly. Câmera sempre andando
  devagar e sempre cobrindo a tela, com respiração leve.
- `cena.transicao`: entre planos diferentes o padrão é o obstáculo `parede` (forma escura com borda iluminada cruza em 8
  quadros, whoosh baixo). `"corte"` = corte seco. `"obstaculo"` ou `{tipo:"obstaculo", objeto}` escolhe o objeto
  (`parede` no modo planos). Cenas seguidas com a mesma imagem e sem `transicao` formam um segmento só: sem obstáculo e com a câmera contínua (movimento e foco da primeira cena, tempo pelo quadro absoluto no segmento inteiro). `transicao` explícita encerra o segmento e recomeça a câmera.
- `cena.layout: {legenda?: "alto"|"meio"|"baixo", insert?: "alto"|"meio"|"baixo"}`: legenda com centro em 600, 1000
  (padrão) ou 1150; insert na faixa 380..760, 560..1000 (padrão) ou 760..1200, encolhido para caber (mínimo 55%).
  Legenda e insert nunca se sobrepõem: o insert cede. Tudo dentro de y 270..1248. Fora do modo planos o `layout` só age
  quando declarado.
- Acabamento: vinheta, véu suave atrás da legenda, grão leve. Sons: pop na entrada do insert, toque e ding na notificação
  do celular, risco no papel, whoosh no obstáculo, volumes 0,35 a 0,45, nunca dois no mesmo quadro (afastados 3 quadros;
  o whoosh se afasta dos sons das cenas).
